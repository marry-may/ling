import { unzipSync } from 'fflate'
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

function parseXml(source: string): XMLDocument {
  const document = new DOMParser().parseFromString(source, 'application/xml')
  if (document.querySelector('parsererror')) throw new Error('В EPUB обнаружена ошибка структуры XML.')
  return document
}

type ReadOptions = { fallbackLanguage: string; onProgress: (message: string) => void }

export async function readBookFile(file: File, { fallbackLanguage, onProgress }: ReadOptions): Promise<ParsedBook> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'txt' || extension === 'md') {
    const content = await file.text()
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
    if (!containerData) throw new Error('В EPUB не найден файл META-INF/container.xml.')
    const container = parseXml(new TextDecoder().decode(containerData))
    const packagePath = container.getElementsByTagName('rootfile').item(0)?.getAttribute('full-path')
    if (!packagePath || !entries[packagePath]) throw new Error('Не удалось найти основной файл EPUB.')

    const packageDocument = parseXml(new TextDecoder().decode(entries[packagePath]))
    const title = packageDocument.getElementsByTagName('dc:title').item(0)?.textContent?.trim()
    const author = packageDocument.getElementsByTagName('dc:creator').item(0)?.textContent?.trim()
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
      const blocks = Array.from(body.querySelectorAll('h1,h2,h3,h4,p,li,blockquote'))
        .map((element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '')
        .filter(Boolean)
      const heading = body.querySelector('h1,h2,h3')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80) || undefined
      return { title: heading, content: (blocks.length ? blocks.join('\n\n') : body.textContent ?? '').trim() }
    })
    const sections = chapters.filter((chapter): chapter is Section => Boolean(chapter?.content))
    return { content: sections.map((chapter) => chapter.content).join('\n\n'), title, author, language, sections }
  }

  throw new Error('Поддерживаются TXT, MD, EPUB и PDF.')
}
