import type { PDFDocumentProxy } from 'pdfjs-dist'
import { createWorker } from 'tesseract.js'
import { messages } from './i18n'
import { detectLanguage, getLanguage } from './languages'

const DETECTION_PAGES = 5

/** Joins OCR lines into paragraphs and rejoins words hyphenated across line breaks. */
function cleanText(text: string): string {
  return text
    .replace(/(\p{L})-\n(\p{L})/gu, '$1$2')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
}

/** Recognizes text in a PDF whose pages are images or outlined glyphs rather than text. */
export async function recognizePdf(pdf: PDFDocumentProxy, fallbackLanguage: string, onProgress: (message: string) => void): Promise<{ content: string; language: string }> {
  const canvas = document.createElement('canvas')
  const renderPage = async (pageNumber: number) => {
    const page = await pdf.getPage(pageNumber)
    const scale = Math.min(3, 1800 / page.getViewport({ scale: 1 }).width)
    const viewport = page.getViewport({ scale })
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error(messages().importer.pdfCanvas)
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: context, viewport }).promise
    page.cleanup()
    return canvas
  }

  onProgress(messages().importer.pdfNoText)
  let worker
  try {
    worker = await createWorker(getLanguage(fallbackLanguage).ocr)
  } catch {
    throw new Error(messages().importer.ocrFailed)
  }
  try {
    let pages: string[] = []
    let language: string | undefined
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      onProgress(messages().importer.ocrPage(pageNumber, pdf.numPages))
      pages.push(cleanText((await worker.recognize(await renderPage(pageNumber))).data.text))
      // Title pages have few common words, so the language is guessed from up to the first DETECTION_PAGES pages.
      if (language) continue
      language = detectLanguage(pages.join('\n')) ?? (pageNumber >= DETECTION_PAGES ? fallbackLanguage : undefined)
      if (language && language !== fallbackLanguage) {
        onProgress(messages().importer.ocrLanguage(getLanguage(language).name))
        await worker.reinitialize(getLanguage(language).ocr)
        // Pages read with the wrong language model lose accented letters, so they are recognized again.
        pages = []
        pageNumber = 0
      }
    }
    return { content: pages.filter(Boolean).join('\n\n'), language: language ?? fallbackLanguage }
  } finally {
    await worker.terminate()
  }
}
