import fs from 'node:fs'
import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { readBookFile, readPageText, storageContentType } from './bookImport'

const options = { fallbackLanguage: 'en', onProgress: () => {} }

const CONTAINER = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`

function epub(chapters: Record<string, string>, metadata = '<dc:title>Test Book</dc:title><dc:language>en</dc:language>') {
  const names = Object.keys(chapters)
  const opf = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">${metadata}</metadata>
  <manifest>${names.map((name, index) => `<item id="c${index}" href="${encodeURI(name)}" media-type="application/xhtml+xml"/>`).join('')}</manifest>
  <spine>${names.map((_, index) => `<itemref idref="c${index}"/>`).join('')}</spine>
</package>`
  const files: Record<string, Uint8Array> = {
    mimetype: strToU8('application/epub+zip'),
    'META-INF/container.xml': strToU8(CONTAINER),
    'OEBPS/content.opf': strToU8(opf),
  }
  for (const [name, body] of Object.entries(chapters)) files[`OEBPS/${name}`] = strToU8(body)
  return new File([zipSync(files)], 'book.epub', { type: '' })
}

const xhtml = (body: string) => `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>c</title></head><body>${body}</body></html>`

describe('EPUB import', () => {
  it('reads a well-formed book', async () => {
    const book = await readBookFile(epub({ 'one.xhtml': xhtml('<h1>One</h1><p>The cat sat on the mat.</p>') }), options)
    expect(book.title).toBe('Test Book')
    expect(book.sections).toEqual([{ title: 'One', content: 'One\n\nThe cat sat on the mat.' }])
  })

  // HTML entities are undefined in XML without a DTD; many EPUBs (Calibre, FB2 converters, old editors) use them.
  it('reads chapters with HTML entities such as &nbsp;', async () => {
    const book = await readBookFile(epub({ 'one.xhtml': xhtml('<h1>One</h1><p>Hello&nbsp;world &mdash; and&hellip;</p>') }), options)
    expect(book.content).toContain('Hello world — and…')
  })

  it('reads chapters that are not well-formed XML', async () => {
    const book = await readBookFile(epub({
      'one.xhtml': xhtml('<p>First chapter<br>with an unclosed tag & a bare ampersand.</p>'),
      'two.xhtml': xhtml('<p>Second chapter.</p>'),
    }), options)
    expect(book.sections?.map((section) => section.content)).toEqual(['First chapter with an unclosed tag & a bare ampersand.', 'Second chapter.'])
  })

  it('finds chapters whose file names have spaces or non-Latin letters', async () => {
    const book = await readBookFile(epub({ 'Глава 1.xhtml': xhtml('<p>Текст главы.</p>') }), options)
    expect(book.content).toBe('Текст главы.')
  })

  it('reads a package document with entities in its metadata', async () => {
    const book = await readBookFile(epub({ 'one.xhtml': xhtml('<p>Text.</p>') }, '<dc:title>Tom&nbsp;Sawyer</dc:title><dc:creator>Mark Twain</dc:creator>'), options)
    expect(book.title).toBe('Tom Sawyer')
    expect(book.author).toBe('Mark Twain')
  })
})

describe('PDF text', () => {
  // Safari on iOS cannot iterate a ReadableStream with `for await`, which pdf.js's getTextContent() relies on.
  it('reads a page without async iteration of the stream', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue({ items: [{ str: 'Hola' }, { str: 'mundo' }] })
        controller.enqueue({ items: [{ type: 'beginMarkedContent' }, { str: 'otra vez' }] })
        controller.close()
      },
    })
    Object.defineProperty(stream, Symbol.asyncIterator, { value: undefined })
    expect(await readPageText(stream)).toBe('Hola mundo otra vez')
  })
})

describe('TXT import', () => {
  it('reads UTF-8', async () => {
    const book = await readBookFile(new File(['Привет, как дела? Это книга.'], 'book.txt'), options)
    expect(book.content).toBe('Привет, как дела? Это книга.')
  })

  it('reads Windows-1251, the usual encoding of Russian and Ukrainian TXT files', async () => {
    const text = 'Привет, как дела? Это книга про їжака.'
    const bytes = Uint8Array.from(text, (char) => {
      const code = char.codePointAt(0)!
      if (code < 0x80) return code
      if (char === 'ї') return 0xbf
      return code - 0x410 + 0xc0
    })
    const book = await readBookFile(new File([bytes], 'book.txt'), options)
    expect(book.content).toBe(text)
  })
})

describe('storage content types', () => {
  // The book-files bucket rejects any other type; browsers often report "" or octet-stream for EPUB and MD.
  const allowed = fs.readFileSync('supabase/migrations/20261004000000_cloud_library.sql', 'utf8')
    .match(/allowed_mime_types\)[\s\S]*?array\[([^\]]+)\]/)![1]
    .match(/'[^']+'/g)!.map((type: string) => type.slice(1, -1))

  for (const name of ['a.epub', 'a.pdf', 'a.txt', 'a.md', 'A.EPUB', 'reader.txt']) {
    it(`allows ${name}`, () => {
      expect(allowed).toContain(storageContentType(name).split(';')[0])
    })
  }
})

// Books that once failed to import. When a file does not open, put it (public domain only) into test-books/;
// PDFs are not checked here, since pdf.js needs a real browser.
describe('test-books/', () => {
  const files = fs.existsSync('test-books') ? fs.readdirSync('test-books').filter((name) => /\.(epub|txt|md)$/i.test(name)) : []
  for (const name of files) {
    it(`imports ${name}`, async () => {
      const book = await readBookFile(new File([fs.readFileSync(`test-books/${name}`)], name), options)
      expect(book.content.length).toBeGreaterThan(1000)
      expect(book.content).not.toMatch(/�{3}/)
    })
  }
})
