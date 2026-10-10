// Downloads the Ling Library books from Project Gutenberg and stores them as chapters in catalog/texts/<slug>.json.
// Gutenberg headers, front matter and editorial apparatus are dropped, so only the public-domain text remains.
//
//   node scripts/catalog-fetch.mjs            all books
//   node scripts/catalog-fetch.mjs immensee   one book
//
// Covers are picked by hand: catalog/covers/<slug>.jpg is the edition's scan from Gutenberg
// (cache/epub/<id>/images/cover.jpg, 480 px wide) and the book gets "cover": true in books.json. Books whose
// Gutenberg cover is a generated pattern keep the drawn cover.
//
// Each rule says where the text starts and ends and what a chapter heading looks like. `titleNext` means the
// chapter title is the paragraph after the heading (e.g. "-I-" followed by "Perdido"). It can be a pattern: then only
// a paragraph matching it is taken as the title (editions where some chapters have none). Optional:
//   occurrence    the text starts at this match of `start` (the first ones are a table of contents)
//   headingAfter  a paragraph right after one matching this is a heading (titles under an illustration)
//   notes         drops the editor's footnotes ("[1] …") and their markers in the text
//   titles        replaces headings that come out garbled, by their raw text
//   skip          drops everything from a paragraph matching this to the next heading (a reader's exercises)
//   strip         removed from inside paragraphs (verse markup such as /P … P/)
//   title         the title of the text before the first heading (a novella without chapters)
//   fix           replaces finished chapter titles that normal casing gets wrong (accents the edition lacks, names):
//                 a map from title to title, or a function
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
  'spanish-tales-for-beginners': { start: /^LOS CONSEJOS DE UN PADRE$/, end: /^NOTES$/, heading: /^(?![IVX]+$)[A-ZÁÉÍÓÚÑÜ¡¿][A-ZÁÉÍÓÚÑÜ¡!¿?,.:' ]{2,}$/, drop: /^[IVX]+$|^\((After|The|In|When|Then) [^)]*\b(the|and)\b[^)]*\)$/s },
  'a-first-spanish-reader': { start: /^1\. LA ESCUELA$/, end: /^PREGUNTAS$/, heading: /^\d+\. [A-ZÁÉÍÓÚÑÜ¡¿][A-ZÁÉÍÓÚÑÜ¡!¿?,.:'() ]+$/ },
  'la-edad-de-oro': {
    start: /^A los niños que lean/,
    occurrence: 2,
    heading: titlesPattern(['A los niños que lean «La Edad de Oro»', 'Tres héroes', 'Dos milagros', 'Meñique', 'Cada uno a su oficio', 'La Ilíada, de Homero', 'Un juego nuevo y otros viejos', 'Bebé y el señor don Pomposo', 'La última página', 'La historia del hombre, contada por sus casas', 'Los dos príncipes', 'Nené traviesa', 'La perla de la mora', 'Las ruinas indias', 'Músicos, poetas y pintores', 'La exposición de París', 'El camarón encantado', 'El Padre las Casas', 'Los zapaticos de rosa', 'Un paseo por la tierra de los anamitas', 'Historia de la cuchara y el tenedor', 'La muñeca negra', 'Cuentos de elefantes', 'Los dos ruiseñores', 'La galería de las máquinas']),
    drop: /^\/?P\/?$/,
    strip: /(?<=^|\s)\/?P\/(?=\s|$)|(?<=^|\s)\/P(?=\s|$)/g,
  },
  'contes-et-legendes': { start: /^LES TROIS OURS\./, end: /^(NOTES|VOCABULARY)\.?$/, heading: /^[A-ZÉÈÀÂÊÎÔÛÇ][A-ZÉÈÀÂÊÎÔÛÇ'’\- ]+\.(\[\d+\])?$/, notes: true, drop: /^\[Note \d+:|^"(Weary of pleasure|In guerdon of duty)/ },
  'abc-petits-contes': { start: /^ANE$/, heading: /^[A-ZÉÈÀÂÊÎÔÛÇ]{2,}$/, drop: /^[IVX]+$/, titles: { ANE: 'Âne', GATEAU: 'Gâteau' } },
  'maerchen-und-erzaehlungen-1': { start: /^1\. Jakobs Haus\./, end: /^Kleine Gedichte/, heading: /^\d+\. .+\.\(\d+\)$/, drop: /^\(\d+\) / },
  'maerchen-und-erzaehlungen-2': { start: /^1\. Der Weihnachtsabend\.$/, end: /^Kleine Gedichte/, heading: /^\d+\. [A-ZÄÖÜ][^.!?]*\.$/ },
  'lezioni-e-racconti': {
    start: /^Una donnina\.$/,
    end: /^INDICE$/,
    heading: titlesPattern(['Una donnina', 'Il bove', 'Un regalo', 'I sassi', "Il fratellino dell'Enrichetta", 'Lascialo ridere!', 'Per un chicco di grano', 'Turco e Sparalampi', 'I Pesci', 'Primi freddi', 'Fuoco e fiammiferi', 'Un baratto', 'I metalli', 'Amaro!', 'Gli uccelli', 'Per tre soldi!', "La storia d'un grappolo d'uva", 'La seggiolina', 'Le olive', 'Ombrello ridicolo', 'Insetti', 'Vestito bianco', 'Il primo lavoro della Gemma', 'Il corredino della bambola', 'Il bucato della bambola', "La camera dell'Emilia", 'La carta', 'La spugna', 'Il sughero', 'Il tabacco', 'Il sapone', 'Il carbone', 'Carbone fossile', 'Le porte e le finestre della nostra casa', 'Commiato']),
    // Each lesson ends with questions for the class after a row of asterisks.
    skip: /^\*(\s+\*){4}$/,
    drop: /^(LAVORI E BALOCCHI|CHIACCHIERE)\.$|^\(_Novella_\)\.$/,
  },
  'contos-para-a-infancia': { start: /^\*A mãe\*$/, heading: /^\*[^*]+\*$/ },
  'treasure-island': { start: /^I\nThe Old Sea-dog/, heading: /^[IVXL]+\n/, drop: /^PART [A-Z]+--/ },
  'the-jungle-book': { start: /^Mowgli’s Brothers$/, occurrence: 1, heading: titlesPattern(['Mowgli’s Brothers', 'Kaa’s Hunting', '“Tiger! Tiger!”', 'The White Seal', '“Rikki-Tikki-Tavi”', 'Toomai of the Elephants', 'Her Majesty’s Servants']) },
  'the-secret-garden': { start: /^CHAPTER I\.\n/, end: /^THE END$/, heading: /^CHAPTER [IVXL]+\.?\n/ },
  'anne-of-green-gables': { start: /^CHAPTER I\. /, heading: /^CHAPTER [IVXL]+\. /, fix: (title) => title.replace(/^CHAPTER ([IVXL]+)\. /, 'Chapter $1 · ') },
  'arsene-lupin-gentleman-cambrioleur': { start: /^L'ARRESTATION D'ARSÈNE LUPIN$/, end: /^FIN$/, heading: /^[A-ZÀÂÇÉÈÊÎÔÛ][A-ZÀÂÇÉÈÊÎÔÛ'’ \-]{3,}$/, fix: (title) => title.replace("d'arsène", "d'Arsène") },
  'le-fantome-de-l-opera': { start: /^AVANT-PROPOS$/, heading: /^([IVXL]+|AVANT-PROPOS)$/, titleNext: true, notes: true, drop: /^\[Note \d+:/, fix: (title) => title.replace(' IL ', ' il ') },
  'le-mystere-de-la-chambre-jaune': { start: /^I$/, heading: /^[IVXL]+$/, titleNext: true },
  'cuentos-de-amor-de-locura-y-de-muerte': { start: /^#UNA ESTACION DE AMOR#$/, end: /^FIN$/, heading: /^#[A-ZÁÉÍÓÚÑÜ¡¿][A-ZÁÉÍÓÚÑÜ¡!¿?,.\- ]+#$/, strip: /#/g, fix: { 'Una estacion de amor': 'Una estación de amor', 'Los ojos sombrios': 'Los ojos sombríos', 'El almohadon de pluma': 'El almohadón de pluma', 'La insolacion': 'La insolación', 'El alambre de pua': 'El alambre de púa' } },
  'el-capitan-veneno': {
    start: /^PARTE PRIMERA\n/,
    end: /^QUESTIONS FOR CONVERSATION$/,
    heading: /^[IVX]+$/,
    titleNext: /^[A-ZÁÉÍÓÚÑÜ¡¿][A-ZÁÉÍÓÚÑÜ¡!¿?,.'\[\]\d ]+$/,
    notes: true,
    drop: /^PARTE \S+|^(VIDA DEL HOMBRE MALO|HERIDAS EN EL ALMA|DE POTENCIA A POTENCIA)/,
  },
  'lazarillo-de-tormes': { start: /^Prólogo$/, heading: /^(Prólogo|Tratado \S+)$/, titleNext: /^(Cómo|Cuenta) /, strip: /[{}]/g },
  'der-schimmelreiter': { start: /^Was ich zu berichten/, heading: /$^/, title: 'Der Schimmelreiter' },
  'der-prozess': { start: /^ERSTES KAPITEL$/, end: /^NACHWORT$/, heading: /^\S+ KAPITEL$/, titleNext: true, fix: (title) => title.replace(' kapitel', ' Kapitel') },
  'maerchen-almanach-1826': { start: /^Märchen als Almanach$/, heading: titlesPattern(['Märchen als Almanach', 'Die Karawane', 'Kalif Storch', 'Die Geschichte von dem Gespensterschiff', 'Die Geschichte von der abgehauenen Hand', 'Die Errettung Fatmes', 'Die Geschichte von dem kleinen Muck', 'Das Märchen vom falschen Prinzen']), drop: /^Wilhelm Hauff$/ },
  'i-robinson-italiani': { start: /^CAPITOLO I$/, end: /^INDICE$/, heading: /^CAPITOLO [IVXL]+$/, titleNext: true, notes: true },
  'ricordi-d-infanzia-e-di-scuola': { notes: true, start: /^RICORDI D'INFANZIA E DI SCUOLA\.$/, end: /^INDICE\.$/, heading: /^(?![IVX]+\.$)[A-ZÀÈÉÌÒÙ][A-ZÀÈÉÌÒÙ'’ ,!?\-]{3,}\.?$/, drop: /^[IVX]+\.$/, fix: { "I bambini di Val d'andorno": "I bambini di Val d'Andorno", 'I commedianti e I ragazzi': 'I commedianti e i ragazzi' } },
  'helena': { start: /^CAPITULO I$/, end: /^FIM$/, heading: /^CAPITULO [IVXL]+$/ },
  'papeis-avulsos': {
    start: /^O ALIENISTA$/,
    end: /^INDICE$/,
    heading: /^(?!FIM D)[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ][A-ZÁÂÃÀÉÊÍÓÔÕÚÇ ,!?.\-]{3,}(\[\d+\])?$/,
    titleNext: /^(?!FIM D)[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ][A-ZÁÂÃÀÉÊÍÓÔÕÚÇ ,!?.\-]{3,}$/,
    notes: true,
    drop: /^[IVX]+$|^FIM D/,
    fix: (title) => title.replace(/^Capitulo a$/, 'Capitulo A').replace('D. benedicta', 'D. Benedicta').replace('fernão mendes pinto', 'Fernão Mendes Pinto').replace('desembargador x...', 'desembargador X...'),
  },
  'contos-eca-de-queiroz': { start: /^SINGULARIDADES DE UMA RAPARIGA LOURA$/, end: /^FIM$/, heading: /^[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ][A-ZÁÂÃÀÉÊÍÓÔÕÚÇ ,!]{3,}$/, drop: /^[IVX]+$/, fix: { 'Jose Matias': 'José Matias' } },
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
    .replace(rule.strip ?? /$^/, ' ')
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
      if (!/\p{L}/u.test(word) || /^\([IVXL]+\)$/.test(word) || (ROMAN.test(word) && (!first || single || /[.:]$/.test(word)))) return word
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
  let skipping = false
  for (let i = 0; i < body.length; i += 1) {
    const paragraph = body[i]
    if (rule.skip?.test(paragraph)) skipping = true
    if (rule.notes && /^\[\d+\]/.test(paragraph)) continue
    if (ILLUSTRATION.test(paragraph) || SEPARATOR.test(paragraph) || rule.drop?.test(paragraph)) continue
    const afterMarker = rule.headingAfter && (i === 0 || rule.headingAfter.test(body[i - 1]))
    if (afterMarker || rule.heading.test(paragraph)) {
      skipping = false
      const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean)
      const renamed = rule.titles && Object.entries(rule.titles).find(([raw]) => paragraph.startsWith(raw))
      let title = renamed ? renamed[1]
        : lines.length > 1 ? `${lines[0].replace(/\.$/, '')} · ${lines.slice(1).join(' ')}`
        : clean(lines[0]).replace(/^-|-$/g, '').replace(/(?<=\p{L})·(?=\p{L})/gu, ' ')
      if (rule.titleNext && body[i + 1] && (rule.titleNext === true || rule.titleNext.test(body[i + 1]))) {
        title = `${title.replace(/\.$/, '')} · ${clean(body[i + 1]).replace(/\.$/, '')}`
        i += 1
      }
      // Editors' note numbers after a heading: "Jakobs Haus.(1)", "LES TROIS OURS.[1]".
      title = title.replace(/\s*[([]\d+[)\]]$/, '').replace(/^[*#]|[*#]$/g, '').replace(/\.$/, '')
      // Some editions repeat a story title under its illustration.
      if (chapters.at(-1)?.title === title && !chapters.at(-1).paragraphs.length) continue
      chapters.push({ title, paragraphs: [] })
      continue
    }
    if (skipping) continue
    if (!chapters.length) chapters.push({ title: rule.title ?? '', paragraphs: [] })
    chapters.at(-1).paragraphs.push(clean(paragraph, rule))
  }
  const capitalised = capitalisedWords(chapters)
  return chapters
    .filter((chapter) => chapter.paragraphs.length)
        .map((chapter) => {
      // Note markers can sit inside a heading once its subtitle is joined to it: "O segredo do bonzo[1] · …".
      const title = shorten(normalCase(chapter.title, capitalised, language)).replace(/\[\d+\]/g, '')
      return { title: typeof rule.fix === 'function' ? rule.fix(title) : rule.fix?.[title] ?? title, text: chapter.paragraphs.join('\n\n') }
    })
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
