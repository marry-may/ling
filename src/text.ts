export type Token = { text: string; start: number; key: string }

const PAGE_WORDS = 220
/** Books longer than this are split into parts of about PART_WORDS words (roughly 35 reader pages each). */
const SPLIT_THRESHOLD = 12000
const PART_WORDS = 8000
const SPLIT_PATTERN = /(\s+|[^\p{L}\p{N}'’-]+)/u
const SENTENCE_PATTERN = /[^.!?…]+(?:[.!?…]+["'»”’)\]]*|$)\s*/gu

export type Section = { title?: string; content: string }

/** Lowercased dictionary form of a word as it appears in text. */
export function wordKey(raw: string): string {
  return raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').replace(/’/g, "'").toLowerCase()
}

export function cleanWord(raw: string): string {
  return raw.replace(/^[^\p{L}]+|[^\p{L}'’-]+$/gu, '')
}

export function countWords(text: string): number {
  return (text.match(/\p{L}+/gu) ?? []).length
}

/** Splits a paragraph into text pieces; pieces with a non-empty `key` are clickable words. */
export function tokenize(paragraph: string): Token[] {
  const tokens: Token[] = []
  let offset = 0
  for (const part of paragraph.split(SPLIT_PATTERN)) {
    if (!part) continue
    tokens.push({ text: part, start: offset, key: /\p{L}/u.test(part) ? wordKey(part) : '' })
    offset += part.length
  }
  return tokens
}

function sentences(text: string): string[] {
  return Array.from(text.matchAll(SENTENCE_PATTERN), (match) => match[0]).filter((sentence) => sentence.trim())
}

/** The sentence of `paragraph` that contains the character at `offset`. */
export function sentenceAt(paragraph: string, offset: number): string {
  let position = 0
  for (const sentence of sentences(paragraph)) {
    position = paragraph.indexOf(sentence, position)
    if (offset < position + sentence.length) return sentence.trim().slice(0, 400)
    position += sentence.length
  }
  return paragraph.trim().slice(0, 400)
}

/** Groups book text into pages of roughly PAGE_WORDS words, splitting long paragraphs by sentence. */
export function paginate(content: string): string[][] {
  const blocks: string[] = []
  for (const paragraph of content.split(/\n\s*\n/)) {
    const text = paragraph.trim()
    if (!text) continue
    if (countWords(text) <= PAGE_WORDS) {
      blocks.push(text)
      continue
    }
    let chunk = ''
    for (const sentence of sentences(text)) {
      if (chunk && countWords(chunk) + countWords(sentence) > PAGE_WORDS) {
        blocks.push(chunk.trim())
        chunk = ''
      }
      chunk += sentence
    }
    if (chunk.trim()) blocks.push(chunk.trim())
  }

  const pages: string[][] = []
  let page: string[] = []
  let pageWords = 0
  for (const block of blocks) {
    const words = countWords(block)
    if (page.length && pageWords + words > PAGE_WORDS * 1.3) {
      pages.push(page)
      page = []
      pageWords = 0
    }
    page.push(block)
    pageWords += words
  }
  if (page.length) pages.push(page)
  return pages
}

function pieceTitle(section: Section, index: number): string | undefined {
  if (!section.title || index === 0) return section.title
  return `${section.title} (продолжение)`
}

/** Cuts a section that is longer than one part into paragraph-aligned pieces. */
function cutSection(section: Section): Section[] {
  if (countWords(section.content) <= PART_WORDS) return [section]
  const pieces: Section[] = []
  let chunk: string[] = []
  let chunkWords = 0
  for (const paragraph of section.content.split(/\n\s*\n/)) {
    const words = countWords(paragraph)
    if (chunk.length && chunkWords + words > PART_WORDS) {
      pieces.push({ title: pieceTitle(section, pieces.length), content: chunk.join('\n\n') })
      chunk = []
      chunkWords = 0
    }
    chunk.push(paragraph)
    chunkWords += words
  }
  if (chunk.length) pieces.push({ title: pieceTitle(section, pieces.length), content: chunk.join('\n\n') })
  return pieces
}

/**
 * Splits a long book into parts, keeping chapters (sections) whole where possible. Short books come back as
 * a single part. Each part is titled after the first chapter it contains.
 */
export function splitIntoParts(sections: Section[]): Section[] {
  const usable = sections.filter((section) => section.content.trim())
  const total = usable.reduce((sum, section) => sum + countWords(section.content), 0)
  if (total <= SPLIT_THRESHOLD) return [{ content: usable.map((section) => section.content).join('\n\n') }]

  const parts: Section[] = []
  let current: Section | null = null
  let currentWords = 0
  for (const piece of usable.flatMap(cutSection)) {
    const words = countWords(piece.content)
    if (current && currentWords + words > PART_WORDS * 1.15) {
      parts.push(current)
      current = null
    }
    if (!current) {
      current = { title: piece.title, content: piece.content }
      currentWords = words
      continue
    }
    current.title ??= piece.title
    current.content += `\n\n${piece.content}`
    currentWords += words
  }
  if (current) parts.push(current)
  // A small remainder reads better as the end of the previous part.
  const last = parts.at(-1)
  if (parts.length > 1 && last && countWords(last.content) < PART_WORDS / 4) {
    parts.pop()
    parts[parts.length - 1].content += `\n\n${last.content}`
  }
  return parts
}
