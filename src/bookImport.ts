import { unzipSync } from 'fflate'
import { messages } from './i18n'
import { detectLanguage } from './languages'
import { countWords, type Section } from './text'

/** `sections` holds the chapters of an EPUB, used to split long books along chapter boundaries. */
export type ParsedBook = { content: string; title?: string; author?: string; language?: string; sections?: Section[] }

function resolveArchivePath(base: string, relative: string): string {
  const segments = `${base}/${decodeURIComponent(relative.split(/[?#]/, 1)[0])}`.replace(/\\/g, '/').split('/')
  const resolved: string[] = []
  for (const segment of segments) {
    if (!segment || segment === '.') continue
    if (segment === '..') resolved.pop()
    else resolved.push(segment)
  }
  return resolved.join('/')
}

/**
 * EPUB files are meant to be XML, but many use HTML entities (&nbsp;, &mdash;) that XML does not know, or have
 * unclosed tags. Such a file is read by the forgiving HTML parser instead of rejecting the whole book.
 */
function parseXml(source: string): Document {
  const document = new DOMParser().parseFromString(source, 'application/xml')
  if (!document.getElementsByTagName('parsererror').length) return document
  return new DOMParser().parseFromString(source, 'text/html')
}

/**
 * Text files from Windows in Russian or Ukrainian are often in Windows-1251 rather than UTF-8. A few broken bytes
 * in a UTF-8 file are tolerated; a file that is mostly not UTF-8 is read as Windows-1251.
 */
function decodeText(bytes: ArrayBuffer): string {
  const text = new TextDecoder('utf-8').decode(bytes)
  const broken = text.match(/\uFFFD/g)?.length ?? 0
  return broken > text.length / 1000 ? new TextDecoder('windows-1251').decode(bytes) : text
}

const CONTENT_TYPES: Record<string, string> = {
  epub: 'application/epub+zip',
  pdf: 'application/pdf',
  txt: 'text/plain;charset=utf-8',
  md: 'text/markdown;charset=utf-8',
}

/**
 * The type a file is stored under in the account. It comes from the extension, since browsers report EPUB and MD
 * as "", application/octet-stream or text/x-markdown, which the storage bucket rejects.
 */
export function storageContentType(fileName: string): string {
  return CONTENT_TYPES[fileName.split('.').pop()?.toLowerCase() ?? ''] ?? 'text/plain;charset=utf-8'
}

type ReadOptions = { fallbackLanguage: string; onProgress: (message: string) => void }

export async function readBookFile(file: File, { fallbackLanguage, onProgress }: ReadOptions): Promise<ParsedBook> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'txt' || extension === 'md') {
    const content = decodeText(await file.arrayBuffer())
    return { content, language: detectLanguage(content.slice(0, 20000)) }
  }

  if (extension === 'pdf') {
    const [pdfjs, { default: workerSrc }] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
    const pages: string[] = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      pages.push(content.items.map((item) => 'str' in item ? item.str : '').join(' '))
    }
    const text = pages.join('\n\n')
    // PDFs from scanners or "Print to PDF" often have no text layer: the letters are images or outlines.
    if (countWords(text) < pdf.numPages * 5) {
      const { recognizePdf } = await import('./ocr')
      return recognizePdf(pdf, fallbackLanguage, onProgress)
    }
    return { content: text, language: detectLanguage(text.slice(0, 20000)) }
  }

  if (extension === 'epub') {
    const entries = unzipSync(new Uint8Array(await file.arrayBuffer()))
    const containerData = entries['META-INF/container.xml']
    if (!containerData) throw new Error(messages().importer.epubContainer)
    const container = parseXml(new TextDecoder().decode(containerData))
    const rootfile = container.getElementsByTagName('rootfile').item(0)?.getAttribute('full-path')
    const packagePath = rootfile && resolveArchivePath('', rootfile)
    if (!packagePath || !entries[packagePath]) throw new Error(messages().importer.epubPackage)

    const packageDocument = parseXml(new TextDecoder().decode(entries[packagePath]))
    const title = packageDocument.getElementsByTagName('dc:title').item(0)?.textContent?.replace(/\s+/g, ' ').trim()
    const author = packageDocument.getElementsByTagName('dc:creator').item(0)?.textContent?.replace(/\s+/g, ' ').trim()
    const language = packageDocument.getElementsByTagName('dc:language').item(0)?.textContent?.trim().slice(0, 2).toLowerCase()
    const manifestItems = Array.from(packageDocument.getElementsByTagName('item'))
    const manifest = new Map(manifestItems.map((item) => [item.getAttribute('id') ?? '', item.getAttribute('href') ?? '']))
    const basePath = packagePath.split('/').slice(0, -1).join('/')
    const spine = Array.from(packageDocument.getElementsByTagName('itemref'))
    const chapters = spine.map((item): Section | null => {
      const href = manifest.get(item.getAttribute('idref') ?? '')
      if (!href) return null
      const chapterData = entries[resolveArchivePath(basePath, href)]
      if (!chapterData) return null
      const chapter = parseXml(new TextDecoder().decode(chapterData))
      const body = chapter.getElementsByTagName('body').item(0)
      if (!body) return null
      // A line break (verse, dialogue) separates words just like a space.
      for (const lineBreak of Array.from(body.getElementsByTagName('br'))) lineBreak.replaceWith(' ')
      const blocks = Array.from(body.querySelectorAll('h1,h2,h3,h4,p,li,blockquote'))
        .map((element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '')
        .filter(Boolean)
      const heading = body.querySelector('h1,h2,h3')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80) || undefined
      return { title: heading, content: (blocks.length ? blocks.join('\n\n') : body.textContent ?? '').trim() }
    })
    const sections = chapters.filter((chapter): chapter is Section => Boolean(chapter?.content))
    return { content: sections.map((chapter) => chapter.content).join('\n\n'), title, author, language, sections }
  }

  throw new Error(messages().importer.unsupported)
}
