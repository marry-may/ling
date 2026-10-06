/** Translations of one part of speech; `pos` is empty for the general translation. */
export type TranslationGroup = { pos: string; variants: string[] }

const REQUEST_TIMEOUT = 6000
const MAX_VARIANTS_PER_GROUP = 6
const cache = new Map<string, TranslationGroup[]>()
/** Translation languages written in Cyrillic; all others use the Latin script. */
const CYRILLIC = new Set(['ru', 'uk'])

/** Part-of-speech keys; the interface shows them as reader.pos labels (src/i18n). */
const POS_LABELS: [RegExp, string][] = [
  [/сущ|существительное|noun/i, 'noun'],
  [/гл|глагол|verb/i, 'verb'],
  [/прил|прилагательное|adj/i, 'adjective'],
  [/нареч|наречие|adv/i, 'adverb'],
  [/мест|местоимение|pron/i, 'pronoun'],
  [/предл|предлог|prep/i, 'preposition'],
  [/союз|conj/i, 'conjunction'],
  [/числ|числительное|num/i, 'numeral'],
  [/межд|междометие|interj/i, 'interjection'],
]

function shortPos(label: string): string {
  return POS_LABELS.find(([pattern]) => pattern.test(label))?.[1] ?? ''
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) })
  if (!response.ok) throw new Error(`Translation request failed: ${response.status}`)
  return response.json() as Promise<T>
}

/** Google Translate: the general translation plus dictionary variants grouped by part of speech. */
async function fromGoogle(word: string, from: string, to: string): Promise<TranslationGroup[]> {
  type GoogleResponse = [[string, string][] | null, [string, string[]][] | null]
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&hl=ru&dt=t&dt=bd&q=${encodeURIComponent(word)}`
  // hl=ru keeps the part-of-speech names in one language, so shortPos can recognise them.
  const [sentences, dictionary] = await fetchJson<GoogleResponse>(url)
  const groups: TranslationGroup[] = []
  const main = sentences?.map((sentence) => sentence[0]).join('').trim()
  if (main) groups.push({ pos: '', variants: [main] })
  for (const [pos, variants] of dictionary ?? []) groups.push({ pos: shortPos(pos), variants })
  return groups
}

function stripWikitext(line: string): string {
  let text = line.replace(/^#+\s*/, '')
  for (let previous = ''; previous !== text;) {
    previous = text
    text = text.replace(/\{\{[^{}]*\}\}/g, '')
  }
  return text
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}|<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,;.)])/g, '$1')
    .replace(/^[\s,;:—-]+|[\s,;:.—-]+$/g, '')
}

/** Russian Wiktionary: dictionary meanings written in Russian, grouped by part of speech. Used for Russian only. */
async function fromWiktionary(word: string, from: string): Promise<TranslationGroup[]> {
  type ParseResponse = { parse?: { wikitext: { '*': string } } }
  const url = `https://ru.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(word.toLowerCase())}&prop=wikitext&format=json&redirects=1&origin=*`
  const result = await fetchJson<ParseResponse>(url)
  const wikitext = result.parse?.wikitext['*'] ?? ''
  const start = wikitext.indexOf(`= {{-${from}-}} =`)
  if (start < 0) return []
  const next = wikitext.slice(start + 1).search(/\n= \{\{-[a-z-]+-\}\} =/)
  const section = next < 0 ? wikitext.slice(start) : wikitext.slice(start, start + 1 + next)

  const groups: TranslationGroup[] = []
  for (const block of section.split('=== Морфологические и синтаксические свойства ===').slice(1)) {
    const pos = shortPos(block.match(/\{\{([^|}\s]+)/)?.[1] ?? '')
    const meanings = block.match(/==== Значение ====\n((?:#.*\n?)+)/)?.[1] ?? ''
    const variants = meanings.split('\n')
      .filter((line) => /^#[^#*:]/.test(line))
      .map(stripWikitext)
      .filter((text) => text && text.length <= 80)
    if (variants.length) groups.push({ pos, variants })
  }
  return groups
}

/** MyMemory: translation memory, useful when the dictionaries have nothing. */
async function fromMyMemory(word: string, from: string, to: string): Promise<TranslationGroup[]> {
  type MyMemoryResponse = { responseData?: { translatedText?: string }; matches?: { translation?: string }[] }
  const result = await fetchJson<MyMemoryResponse>(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=${from}|${to}`)
  const script = CYRILLIC.has(to) ? /\p{Script=Cyrillic}/u : /\p{Script=Latin}/u
  // Names and shouting ("Rosé Wines", "PINKS") are memory noise when the looked-up word is an ordinary lowercase one.
  const looksLikeNoise = (text: string) => (text.length > 1 && text === text.toUpperCase() && text !== text.toLowerCase())
    || (word === word.toLowerCase() && to !== 'de' && text.split(/\s+/).length > 1 && text.split(/\s+/).every((part) => /^\p{Lu}/u.test(part)))
  const variants = [result.responseData?.translatedText, ...(result.matches ?? []).map((match) => match.translation)]
    // Translation memory also returns whole example sentences and transliterations; keep short phrases in the right script.
    .filter((text): text is string => Boolean(text) && script.test(text!) && !looksLikeNoise(text!) && !/^\d/.test(text!) && !/[.!?]$/.test(text!.trim()) && text!.split(/\s+/).length <= 4)
  return variants.length ? [{ pos: '', variants }] : []
}

/** Merges groups from all sources: same part of speech together, duplicates and junk removed. */
function mergeGroups(word: string, to: string, sources: TranslationGroup[][]): TranslationGroup[] {
  // Sentence-case variants are lowered to match the word, except in German, where nouns are capitalised.
  const lowercaseWord = word === word.toLowerCase() && to !== 'de'
  const seen = new Set<string>([word.toLowerCase()])
  const merged = new Map<string, string[]>()
  for (const groups of sources) {
    for (const group of groups) {
      for (const raw of group.variants) {
        const trimmed = raw.trim().replace(/\s+/g, ' ').replace(/[\s:;,.\-–—]+$/, '')
        const text = lowercaseWord && trimmed.slice(1) === trimmed.slice(1).toLowerCase() ? trimmed.charAt(0).toLowerCase() + trimmed.slice(1) : trimmed
        const key = text.toLowerCase().replace(/ё/g, 'е')
        if (!text || text.length > 80 || seen.has(key) || !/\p{L}/u.test(text)) continue
        const list = merged.get(group.pos) ?? []
        if (list.length >= MAX_VARIANTS_PER_GROUP) continue
        seen.add(key)
        list.push(text)
        merged.set(group.pos, list)
      }
    }
  }
  return Array.from(merged, ([pos, variants]) => ({ pos, variants }))
}

/** Translation variants from several dictionaries, best first. An empty list means nothing was found. */
export async function translateWord(word: string, from: string, to: string): Promise<TranslationGroup[]> {
  const cacheKey = `${from}|${to}|${word.toLowerCase()}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const results = await Promise.allSettled([
    fromGoogle(word, from, to),
    to === 'ru' ? fromWiktionary(word, from) : Promise.resolve([]),
    fromMyMemory(word, from, to),
  ])
  if (results.every((result) => result.status === 'rejected')) throw new Error('Translation services unavailable')
  const groups = mergeGroups(word, to, results.map((result) => result.status === 'fulfilled' ? result.value : []))
  cache.set(cacheKey, groups)
  return groups
}
