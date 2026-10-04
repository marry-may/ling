export type Token = { text: string; start: number; key: string }

const PAGE_WORDS = 220
const SPLIT_PATTERN = /(\s+|[^\p{L}\p{N}'’-]+)/u
const SENTENCE_PATTERN = /[^.!?…]+(?:[.!?…]+["'»”’)\]]*|$)\s*/gu

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
