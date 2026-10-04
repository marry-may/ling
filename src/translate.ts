import { TARGET_LANGUAGE } from './languages'

type MyMemoryResponse = {
  responseData?: { translatedText?: string }
  matches?: { translation?: string }[]
}

const cache = new Map<string, string[]>()

/** Returns translation variants, best first. An empty list means nothing was found. */
export async function translateWord(word: string, from: string): Promise<string[]> {
  const cacheKey = `${from}|${word.toLowerCase()}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=${from}|${TARGET_LANGUAGE}`)
  if (!response.ok) throw new Error('Translation service unavailable')
  const result = await response.json() as MyMemoryResponse
  const candidates = [result.responseData?.translatedText, ...(result.matches ?? []).map((match) => match.translation)]
  const seen = new Set<string>([word.toLowerCase()])
  const variants: string[] = []
  for (const candidate of candidates) {
    const text = candidate?.trim().replace(/\s+/g, ' ')
    if (!text || text.length > 80 || seen.has(text.toLowerCase())) continue
    seen.add(text.toLowerCase())
    variants.push(text)
    if (variants.length === 4) break
  }
  cache.set(cacheKey, variants)
  return variants
}
