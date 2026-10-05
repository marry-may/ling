// Downloads the Ling Library books from Project Gutenberg and stores them as chapters in catalog/texts/<slug>.json.
// Gutenberg headers, front matter and editorial apparatus are dropped, so only the public-domain text remains.
//
//   node scripts/catalog-fetch.mjs            all books
//   node scripts/catalog-fetch.mjs immensee   one book
//
// Each rule says where the text starts and ends and what a chapter heading looks like. `titleNext` means the
// chapter title is the paragraph after the heading (e.g. "-I-" followed by "Perdido"). Optional:
//   occurrence    the text starts at this match of `start` (the first ones are a table of contents)
//   headingAfter  a paragraph right after one matching this is a heading (titles under an illustration)
//   notes         drops the editor's footnotes ("[1] …") and their markers in the text
//   titles        replaces headings that come out garbled, by their raw text
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
  'a-christmas-carol': { start: /^STAVE I:/, heading: /^STAVE [IVX]+:/ },
  'the-time-machine': { start: /^I\.\n Introduction$/, heading: /^([IVX]+\.\n|Epilogue$)/ },
  'peter-pan': { start: /^Chapter I\.\n/, end: /^THE END$/, heading: /^Chapter [IVXL]+\.\n/ },
  'dr-jekyll-and-mr-hyde': {
    start: /^STORY OF THE DOOR$/,
    occurrence: 2,
    heading: /^(STORY OF THE DOOR|SEARCH FOR MR\. HYDE|DR\. JEKYLL WAS QUITE AT EASE|THE CAREW MURDER CASE|INCIDENT OF THE LETTER|INCIDENT OF DR\. LANYON|INCIDENT AT THE WINDOW|THE LAST NIGHT|DR\. LANYON’S NARRATIVE|HENRY JEKYLL’S FULL STATEMENT OF THE CASE)$/,
  },
  'niebla': { start: /^I$/, end: /^ÍNDICE$/, heading: /^[IVXL]+$/ },
  'cuentos-de-amor': { start: /^El amor asesinado$/, end: /^INDICE$/, heading: titlesPattern(['El amor asesinado', 'El viajero', 'El corazón perdido', 'Mi suicidio', 'La última ilusión de don Juan', 'Desquite', 'El dominó verde', 'La aventura del ángel', 'El fantasma', 'La perla rosa', 'Un parecido', 'Memento', 'La caja de oro', 'La sirena', 'Así y todo', 'La cabellera de Laura', 'Delincuente honrado', 'Primer amor', 'La inspiración', 'Champagne', 'Sor Aparición', '¿Justicia?', 'Más allá', 'La culpable', 'La novia fiel', 'Afra', 'Cuento soñado', 'Los buenos tiempos', 'Sara y Agar', 'Maldición de gitana', 'La bicha', 'Sangre del brazo', 'Consuelo', 'La novela de Raimundo', 'El encaje roto', 'Martina', 'Apólogo', 'A secreto agravio', 'La religión de Gonzalo', 'El panorama de la Princesa', 'Remordimiento', 'Temprano y con sol', 'Sí, señor']) },
  'grimms-maerchen': { start: /^Marienkind$/, end: /^Inhalt$/, heading: /^$/, headingAfter: /^\[Illustration\]$/, titles: { 'Tischchen': 'Tischchen deck dich, Goldesel und Knüppel aus dem Sack' } },
  'peter-schlemihl': { start: /^1\.$/, end: /^#Explicit\.#$/, heading: /^\d+\.$/ },
  'aus-dem-leben-eines-taugenichts': { start: /^Erstes Kapitel$/, end: /^Druck von /, heading: /^\S+ Kapitel$/ },
  'candide': { start: /^CHAPITRE I\.\n/, end: /^FIN DE CANDIDE/, heading: /^CHAPITRE [IVXL]+/, notes: true, drop: / B\.$/ },
  'lettres-de-mon-moulin': {
    start: /^INSTALLATION$/,
    end: /^FIN\.$/,
    heading: /^[A-ZÉÈÀÇÊÔÎÂ][A-ZÉÈÀÇÊÔÎÂ'’.,!\- ]{3,}$/,
    // The edition sets titles in capitals without accents.
    titles: { 'LE SECRET DE MAITRE CORNILLE': 'Le secret de maître Cornille', 'LA CHÈVRE DE M. SEGUIN': 'La chèvre de M. Seguin', "L'AGONIE DE LA SEMILLANTE": "L'agonie de la Sémillante", "L'ÉLIXIR DU REVEREND PÈRE GAUCHER": "L'élixir du révérend père Gaucher" },
  },
  'un-cavallo-nella-luna': { start: /^UN CAVALLO NELLA LUNA\.$/, occurrence: 2, end: /^INDICE\.$/, heading: /^_?[A-ZÀÈÉÌÒÙ][A-ZÀÈÉÌÒÙ'’ ,!?]+\._?$/, drop: /^[IVX]+\.$/ },
  'dopo-il-divorzio': { start: /^PARTE PRIMA$/, end: /^FINE\.$/, heading: /^([IVXL]+\.|PARTE \S+)$/, notes: true },
  'memorias-postumas-de-bras-cubas': { start: /^CAPITULO I$/, end: /^FIM$/, heading: /^CAPITULO [IVXLC]+$/, titleNext: true },
  'historias-sem-data': { start: /^A EGREJA DO DIABO$/, heading: /^$/, headingAfter: /^FIM D/, drop: /^(FIM D.*|CAPITULO [IVX]+)$/ },
}

/** A heading pattern from a book's table of contents; matches regardless of case and accents. */
function titlesPattern(titles) {
  const loose = (title) => title.normalize('NFD').replace(/\p{M}/gu, '').replace(/\.+$/, '').toLowerCase()
  return { test: (paragraph) => titles.some((title) => loose(title) === loose(paragraph)) }
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
function clean(paragraph, rule = {}) {
  return (rule.notes ? paragraph.replace(/\[\d+\]/g, '') : paragraph)
    .replace(/\[(?:p|Pg)\.? ?\d+\]/g, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[_~]/g, '')
    .replace(/--/g, '—')
    .replace(/\s+/g, ' ')
    .trim()
}

const words = (text) => (text.match(/\p{L}+/gu) ?? []).length
const ROMAN = /^[IVXLC]+[.:]?$/

/**
 * Turns an all-caps heading into normal case. Words the book itself usually capitalises (names, German nouns)
 * keep their capital; Roman numerals stay as they are.
 */
const SMALL_ENGLISH_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with'])

function normalCase(title, capitalised, language) {
  const part = (segment) => {
    if (segment !== segment.toUpperCase()) return segment
    let first = true
    const single = segment.trim().split(/\s+/).length === 1
    return segment.split(/(\s+)/).map((word) => {
      // A Roman numeral stays as it is ("II.", "Stave II:"), but a bare "I" or "IL" opening a title is an Italian word.
      if (!/\p{L}/u.test(word) || (ROMAN.test(word) && (!first || single || /[.:]$/.test(word)))) return word
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
  const starts = paragraphs.flatMap((p, i) => (rule.start.test(p) ? [i] : []))
  const from = starts[(rule.occurrence ?? 1) - 1] ?? -1
  if (from < 0) throw new Error('start not found')
  const until = paragraphs.findIndex((p, i) => i > from && (rule.end?.test(p) || BOOK_END.test(p)))
  const body = paragraphs.slice(from, until < 0 ? undefined : until)

  const chapters = []
  for (let i = 0; i < body.length; i += 1) {
    const paragraph = body[i]
    if (rule.notes && /^\[\d+\]/.test(paragraph)) continue
    if (ILLUSTRATION.test(paragraph) || SEPARATOR.test(paragraph) || rule.drop?.test(paragraph)) continue
    const afterMarker = rule.headingAfter && (i === 0 || rule.headingAfter.test(body[i - 1]))
    if (afterMarker || rule.heading.test(paragraph)) {
      const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean)
      const renamed = rule.titles && Object.entries(rule.titles).find(([raw]) => paragraph.startsWith(raw))
      let title = renamed ? renamed[1]
        : lines.length > 1 ? `${lines[0].replace(/\.$/, '')} · ${lines.slice(1).join(' ')}`
        : clean(lines[0]).replace(/^-|-$/g, '').replace(/(?<=\p{L})·(?=\p{L})/gu, ' ')
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
    chapters.at(-1).paragraphs.push(clean(paragraph, rule))
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
