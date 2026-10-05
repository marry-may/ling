// Downloads the Ling Library books from Project Gutenberg and stores them as chapters in catalog/texts/<slug>.json.
// Gutenberg headers, front matter and editorial apparatus are dropped, so only the public-domain text remains.
//
//   node scripts/catalog-fetch.mjs            all books
//   node scripts/catalog-fetch.mjs immensee   one book
//
// Each rule says where the text starts and ends and what a chapter heading looks like. `titleNext` means the
// chapter title is the paragraph after the heading (e.g. "-I-" followed by "Perdido").
import fs from 'node:fs'

const ROOT = new URL('../catalog/', import.meta.url)
const RULES = {
  'alice-in-wonderland': { start: /^CHAPTER I\.\n/, heading: /^CHAPTER [IVXL]+\.\n/ },
  'the-happy-prince': { start: /^The Happy Prince\.$/, heading: /^The (Happy Prince|Nightingale and the Rose|Selfish Giant|Devoted Friend|Remarkable Rocket)\.$/ },
  'the-wonderful-wizard-of-oz': { start: /^Chapter I\n/, heading: /^Chapter [IVXL]+\n/ },
  'the-adventures-of-sherlock-holmes': { start: /^I\. A SCANDAL IN BOHEMIA$/, heading: /^[IVXL]+\. [A-Z][A-Z\-’' ]+$/, drop: /^[IVX]+\.$/ },
  'el-sombrero-de-tres-picos': { start: /^I$/, end: /^NOTES$/, heading: /^[IVXL]+$/, titleNext: true },
  'marianela': { start: /^-I-$/, heading: /^-[IVXL]+-$/, titleNext: true },
  'die-verwandlung': { start: /^I\.$/, heading: /^[IV]+\.$/ },
  'immensee': { start: /^DER ALTE$/, heading: /^[A-ZÄÖÜ][A-ZÄÖÜ ]{2,}$/ },
  'le-tour-du-monde-en-quatre-vingts-jours': { start: /^I$/, heading: /^[IVXL]+$/, titleNext: true },
  'contes-du-jour-et-de-la-nuit': { start: /^LE CRIME AU PÈRE BONIFACE$/, end: /^TABLE DES MATIÈRES$/, heading: /^[A-ZÉÈÀÇÊÔÎ'’][A-ZÉÈÀÇÊÔÎ '’-]{1,}$/ },
  'le-avventure-di-pinocchio': { start: /^I\.$/, end: /^INDICE\.?$/, heading: /^[IVXL]+\.$/, titleNext: true },
  'dom-casmurro': { start: /^I$/, end: /^INDICE$/, heading: /^[IVXLC]+\.?$/, titleNext: true },
}

// Where the book ends even without a rule of its own: Gutenberg trailers, transcriber notes, printer imprints.
const BOOK_END = /^(End of (the )?Project Gutenberg|Nota del trascrittore|Note du transcripteur|Printed by )/i
const ILLUSTRATION = /^\[(Illustration|Illustrazione|Picture|Gravure)[^\]]*\]$/is
const SEPARATOR = /^[*\s.·]+$/

function paragraphsOf(raw) {
  const text = raw.replace(/\r/g, '')
  const start = text.indexOf('\n', text.indexOf('*** START OF')) + 1
  const end = text.indexOf('*** END OF')
  return text.slice(start, end).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
}

/** Joins wrapped lines and removes Gutenberg markup: _italics_, ~spaced~ text, -- dashes, page markers. */
function clean(paragraph) {
  return paragraph
    .replace(/\[(?:p|Pg)\.? ?\d+\]/g, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[_~]/g, '')
    .replace(/--/g, '—')
    .replace(/\s+/g, ' ')
    .trim()
}

const words = (text) => (text.match(/\p{L}+/gu) ?? []).length
const ROMAN = /^[IVXLC]+\.?$/

/**
 * Turns an all-caps heading into normal case. Words the book itself usually capitalises (names, German nouns)
 * keep their capital; Roman numerals stay as they are.
 */
const SMALL_ENGLISH_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with'])

function normalCase(title, capitalised, language) {
  const part = (segment) => {
    if (segment !== segment.toUpperCase()) return segment
    let first = true
    return segment.split(/(\s+)/).map((word) => {
      if (!/\p{L}/u.test(word) || ROMAN.test(word)) return word
      const lower = word.toLowerCase()
      const bare = lower.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
      // English titles use title case; other languages keep capitals only for the first word and for names.
      const keep = first || capitalised.has(bare) || (language === 'en' && !SMALL_ENGLISH_WORDS.has(bare))
      first = false
      return keep ? lower.replace(/\p{L}/u, (letter) => letter.toUpperCase()) : lower
    }).join('')
  }
  return title.split(' · ').map(part).join(' · ')
}

/** Words that appear capitalised more often than not in the middle of sentences. */
function capitalisedWords(chapters) {
  const counts = new Map()
  for (const chapter of chapters) {
    for (const match of chapter.paragraphs.join(' ').matchAll(/(?<=[\p{Ll},;] )\p{L}+/gu)) {
      const word = match[0]
      const key = word.toLowerCase()
      const [upper, lower] = counts.get(key) ?? [0, 0]
      counts.set(key, word === key ? [upper, lower + 1] : [upper + 1, lower])
    }
  }
  return new Set(Array.from(counts).filter(([, [upper, lower]]) => upper > lower).map(([key]) => key))
}

function shorten(title, limit = 90) {
  if (title.length <= limit) return title
  return title.slice(0, title.lastIndexOf(' ', limit)).replace(/[,;:]$/, '') + '…'
}

function chaptersOf(raw, rule, language) {
  const paragraphs = paragraphsOf(raw)
  const from = paragraphs.findIndex((p) => rule.start.test(p))
  if (from < 0) throw new Error('start not found')
  const until = paragraphs.findIndex((p, i) => i > from && (rule.end?.test(p) || BOOK_END.test(p)))
  const body = paragraphs.slice(from, until < 0 ? undefined : until)

  const chapters = []
  for (let i = 0; i < body.length; i += 1) {
    const paragraph = body[i]
    if (ILLUSTRATION.test(paragraph) || SEPARATOR.test(paragraph) || rule.drop?.test(paragraph)) continue
    if (rule.heading.test(paragraph)) {
      const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean)
      let title = lines.length > 1 ? `${lines[0].replace(/\.$/, '')} · ${lines.slice(1).join(' ')}` : clean(lines[0]).replace(/^-|-$/g, '')
      if (rule.titleNext && body[i + 1]) {
        title = `${title.replace(/\.$/, '')} · ${clean(body[i + 1]).replace(/\.$/, '')}`
        i += 1
      }
      title = title.replace(/\.$/, '')
      // Some editions repeat a story title under its illustration.
      if (chapters.at(-1)?.title === title && !chapters.at(-1).paragraphs.length) continue
      chapters.push({ title, paragraphs: [] })
      continue
    }
    if (!chapters.length) chapters.push({ title: '', paragraphs: [] })
    chapters.at(-1).paragraphs.push(clean(paragraph))
  }
  const capitalised = capitalisedWords(chapters)
  return chapters
    .filter((chapter) => chapter.paragraphs.length)
    .map((chapter) => ({ title: shorten(normalCase(chapter.title, capitalised, language)), text: chapter.paragraphs.join('\n\n') }))
}

const books = JSON.parse(fs.readFileSync(new URL('books.json', ROOT), 'utf8'))
const only = process.argv[2]
for (const book of books) {
  if (only && book.slug !== only) continue
  const rule = RULES[book.slug]
  const response = await fetch(`https://www.gutenberg.org/cache/epub/${book.gutenbergId}/pg${book.gutenbergId}.txt`)
  if (!response.ok) throw new Error(`${book.slug}: download failed (${response.status})`)
  const chapters = chaptersOf(await response.text(), rule, book.language)
  book.words = chapters.reduce((sum, chapter) => sum + words(chapter.text), 0)
  book.chapters = chapters.length
  fs.writeFileSync(new URL(`texts/${book.slug}.json`, ROOT), JSON.stringify({ slug: book.slug, chapters }, null, 1) + '\n')
  console.log(`${book.slug}: ${book.chapters} chapters, ${book.words} words | ${chapters.slice(0, 3).map((c) => c.title).join(' / ')}`)
  await new Promise((resolve) => setTimeout(resolve, 1000))
}
fs.writeFileSync(new URL('books.json', ROOT), JSON.stringify(books, null, 2) + '\n')
