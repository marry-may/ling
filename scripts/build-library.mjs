// Generates the public Ling Library: static, indexable pages for every catalog book in three languages, the book
// texts the app loads, a sitemap and robots.txt. Output goes to public/ so both `vite` and `vite build` serve it.
//
//   /library/                    catalog (Russian)      /uk/library/, /en/library/  the same in Ukrainian, English
//   /library/<slug>/             book page (Russian)    /uk/library/<slug>/, /en/library/<slug>/
//   /library/<slug>/book.json    chapters, loaded by the app when a reader adds the book
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const OUT = path.join(ROOT, 'public')
const SITE = (readEnv('VITE_SITE_URL') || 'https://ling.uno/').replace(/\/?$/, '/')
const LOCALES = ['ru', 'uk', 'en']
const EXCERPT_WORDS = 1500
const STYLES = fs.readFileSync(path.join(ROOT, 'catalog/library.css'))
// The hosting's CDN keeps CSS for a week whatever the server says, so the stylesheet URL changes with its content.
const STYLES_URL = `library/library.css?v=${crypto.createHash('sha256').update(STYLES).digest('hex').slice(0, 10)}`
const SUPABASE_URL = readEnv('VITE_SUPABASE_URL').replace(/\/$/, '')
const SUPABASE_KEY = readEnv('VITE_SUPABASE_ANON_KEY')

function readEnv(name) {
  if (process.env[name]) return process.env[name]
  for (const file of ['.env.local', '.env']) {
    const env = path.join(ROOT, file)
    if (!fs.existsSync(env)) continue
    const line = fs.readFileSync(env, 'utf8').split('\n').find((entry) => entry.startsWith(`${name}=`))
    if (line) return line.slice(name.length + 1).trim()
  }
  return ''
}

const T = {
  ru: {
    library: 'Библиотека Ling', app: 'Открыть Ling', catalogTitle: 'Книги в оригинале', home: 'Главная',
    catalogLead: 'Классика на иностранных языках в свободном доступе. Читай онлайн, а в приложении Ling нажимай на любое слово, чтобы увидеть перевод, и сохраняй новые слова.',
    catalogMeta: 'Бесплатная библиотека книг в оригинале: английский, испанский, немецкий, французский, итальянский и португальский. Читай с переводом любого слова в Ling.',
    read: 'Читать с переводом в Ling', start: 'Попробовать здесь', chapters: 'Оглавление', more: 'Ещё на этом языке',
    excerpt: 'Начало книги простым текстом', continueTitle: 'Продолжить чтение в Ling',
    tryTitle: 'Попробуй читать в Ling',
    tryText: 'Это настоящий ридер Ling: нажми на любое слово, чтобы увидеть перевод, и сохрани новые слова. Аккаунт не нужен.',
    continueText: 'В Ling эта книга откроется целиком: нажимай на незнакомые слова, чтобы увидеть перевод, сохраняй их в словарь и тренируй.',
    words: 'слов', hours: (h) => `≈ ${h} ч чтения`, minutes: (m) => `≈ ${m} мин чтения`, chaptersCount: 'глав', andMore: (n) => `и ещё ${n}`,
    publicDomain: 'Текст произведения находится в общественном достоянии.', difficulty: { easy: 'Лёгкая', medium: 'Средняя', hard: 'Сложная' },
    difficultyLabel: 'Сложность',
    language: { en: 'Английский', es: 'Испанский', de: 'Немецкий', fr: 'Французский', it: 'Итальянский', pt: 'Португальский' },
    readIn: { en: 'на английском', es: 'на испанском', de: 'на немецком', fr: 'на французском', it: 'на итальянском', pt: 'на португальском' },
    pageTitle: (b, lang) => `${b.title} — ${b.author}: читать ${lang} онлайн с переводом | Ling`,
    pageDescription: (b) => `${firstSentence(b.description.ru)} Читай в оригинале онлайн и переводи любое слово одним нажатием.`,
  },
  uk: {
    library: 'Бібліотека Ling', app: 'Відкрити Ling', catalogTitle: 'Книжки в оригіналі', home: 'Головна',
    catalogLead: 'Класика іноземними мовами у вільному доступі. Читай онлайн, а в застосунку Ling натискай на будь-яке слово, щоб побачити переклад, і зберігай нові слова.',
    catalogMeta: 'Безкоштовна бібліотека книжок в оригіналі: англійська, іспанська, німецька, французька, італійська й португальська. Читай із перекладом будь-якого слова в Ling.',
    read: 'Читати з перекладом у Ling', start: 'Спробувати тут', chapters: 'Зміст', more: 'Ще цією мовою',
    excerpt: 'Початок книжки звичайним текстом', continueTitle: 'Продовжити читання в Ling',
    tryTitle: 'Спробуй читати в Ling',
    tryText: 'Це справжній рідер Ling: натисни на будь-яке слово, щоб побачити переклад, і збережи нові слова. Акаунт не потрібен.',
    tryNote: 'Інтерфейс застосунку поки що російською мовою.',
    continueText: 'У Ling ця книжка відкриється повністю: натискай на незнайомі слова, щоб побачити переклад, зберігай їх до словника й тренуй.',
    words: 'слів', hours: (h) => `≈ ${h} год читання`, minutes: (m) => `≈ ${m} хв читання`, chaptersCount: 'розділів', andMore: (n) => `і ще ${n}`,
    publicDomain: 'Текст твору перебуває в суспільному надбанні.', difficulty: { easy: 'Легка', medium: 'Середня', hard: 'Складна' },
    difficultyLabel: 'Складність',
    language: { en: 'Англійська', es: 'Іспанська', de: 'Німецька', fr: 'Французька', it: 'Італійська', pt: 'Португальська' },
    readIn: { en: 'англійською', es: 'іспанською', de: 'німецькою', fr: 'французькою', it: 'італійською', pt: 'португальською' },
    pageTitle: (b, lang) => `${b.title} — ${b.author}: читати ${lang} онлайн із перекладом | Ling`,
    pageDescription: (b) => `${firstSentence(b.description.uk)} Читай в оригіналі онлайн і перекладай будь-яке слово одним натиском.`,
  },
  en: {
    library: 'Ling Library', app: 'Open Ling', catalogTitle: 'Books in the original', home: 'Home',
    catalogLead: 'Public-domain classics in foreign languages. Read online, and in the Ling app tap any word to see its translation and save new words.',
    catalogMeta: 'A free library of books in the original: English, Spanish, German, French, Italian and Portuguese. Read with a translation of any word in Ling.',
    read: 'Read with translations in Ling', start: 'Try it here', chapters: 'Contents', more: 'More in this language',
    excerpt: 'The beginning as plain text', continueTitle: 'Keep reading in Ling',
    tryTitle: 'Try reading in Ling',
    tryText: 'This is the real Ling reader: tap any word to see its translation and save new words. No account needed.',
    tryNote: 'The app interface is in Russian for now.',
    continueText: 'Ling opens the whole book: tap unfamiliar words to see their translation, save them to your dictionary and practise them.',
    words: 'words', hours: (h) => `≈ ${h} h of reading`, minutes: (m) => `≈ ${m} min of reading`, chaptersCount: 'chapters', andMore: (n) => `and ${n} more`,
    publicDomain: 'The text of this work is in the public domain.', difficulty: { easy: 'Easy', medium: 'Intermediate', hard: 'Advanced' },
    difficultyLabel: 'Level',
    language: { en: 'English', es: 'Spanish', de: 'German', fr: 'French', it: 'Italian', pt: 'Portuguese' },
    readIn: { en: 'in English', es: 'in Spanish', de: 'in German', fr: 'in French', it: 'in Italian', pt: 'in Portuguese' },
    pageTitle: (b, lang) => `${b.title} by ${b.author}: read ${lang} online with translations | Ling`,
    pageDescription: (b) => `${firstSentence(b.description.en)} Read the original online and translate any word with one tap.`,
  },
}

const LANGUAGE_ORDER = ['en', 'es', 'de', 'fr', 'it', 'pt']

function firstSentence(text) {
  return text.match(/^.+?[.!?](\s|$)/)?.[0].trim() ?? text
}

function escape(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const prefix = (locale) => (locale === 'ru' ? '' : `${locale}/`)
const catalogPath = (locale) => `${prefix(locale)}library/`
const bookPath = (locale, slug) => `${prefix(locale)}library/${slug}/`
/** Relative link from a page at `from` to `to`, so the site works in a subfolder too. */
const link = (from, to) => '../'.repeat(from.split('/').filter(Boolean).length) + to

function coverIndex(id) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 4
}

function readingTime(t, words) {
  const minutes = Math.round(words / 180)
  return minutes >= 90 ? t.hours(Math.round(minutes / 60)) : t.minutes(Math.max(5, Math.round(minutes / 5) * 5))
}

function cover(book) {
  return `<div class="cover cover-${coverIndex(book.slug)}"><span class="cover-stamp">${book.language.toUpperCase()}</span><span class="cover-title">${escape(book.title)}</span><span class="cover-author">${escape(book.author)}</span></div>`
}

/**
 * Counts the visit for the admin center, like src/analytics.ts does in the app and under the same visitor id.
 * Pages opened from a dev server are not counted.
 */
function trackingScript(kind) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return ''
  const row = `{visitor_id:v,kind:${JSON.stringify(kind)},path:location.pathname.slice(0,300),referrer:r,device:matchMedia('(max-width: 760px)').matches?'mobile':'desktop'}`
  return `<script>(function(){if(/^(localhost|127\\.|192\\.168\\.|\\[)/.test(location.hostname))return;var v;try{v=localStorage.getItem('ling-visitor');if(!v){v=crypto.randomUUID();localStorage.setItem('ling-visitor',v)}}catch(e){v=crypto.randomUUID()}var r=null;try{var u=new URL(document.referrer);if(u.host!==location.host)r=u.href.slice(0,300)}catch(e){}fetch(${JSON.stringify(`${SUPABASE_URL}/rest/v1/page_views`)},{method:'POST',keepalive:true,headers:{apikey:${JSON.stringify(SUPABASE_KEY)},Authorization:${JSON.stringify(`Bearer ${SUPABASE_KEY}`)},'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(${row})}).catch(function(){})})()</script>`
}

function page({ locale, path: pagePath, title, description, alternates, body, jsonLd }) {
  const t = T[locale]
  const hreflang = alternates.map(([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${SITE}${href}">`).join('\n  ')
  const switcher = alternates.map(([lang, href]) => `<a href="${link(pagePath, href)}"${lang === locale ? ' aria-current="page"' : ''} lang="${lang}">${lang === 'uk' ? 'UA' : lang.toUpperCase()}</a>`).join('')
  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}">
  <link rel="canonical" href="${SITE}${pagePath}">
  ${hreflang}
  <link rel="alternate" hreflang="x-default" href="${SITE}${alternates.find(([lang]) => lang === 'en')[1]}">
  <meta property="og:type" content="${jsonLd ? 'book' : 'website'}">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${SITE}${pagePath}">
  <meta property="og:site_name" content="Ling">
  <link rel="icon" type="image/svg+xml" href="${link(pagePath, 'ling-icon.svg')}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap">
  <link rel="stylesheet" href="${link(pagePath, STYLES_URL)}">
  <script>try{var s=localStorage.getItem('ling-theme');document.documentElement.dataset.theme=s==='dark'||(s!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch(e){}</script>
  ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
</head>
<body>
  <header class="nav"><div class="wrap nav-inner">
    <a class="brand" href="${link(pagePath, '')}"><img class="brand-mark" src="${link(pagePath, 'ling-icon.svg')}" alt="" width="32" height="32"><span>ling<span class="dot">.</span></span></a>
    <nav class="nav-links"><a href="${link(pagePath, catalogPath(locale))}">${t.library}</a><span class="lang">${switcher}</span><a class="nav-cta" href="${link(pagePath, '')}">${t.app}</a></nav>
  </div></header>
  <main class="wrap">${body}</main>
  <footer class="wrap footer"><span>© ${new Date().getFullYear()} Ling</span><a href="${link(pagePath, catalogPath(locale))}">${t.library}</a></footer>
  ${trackingScript(jsonLd ? 'book' : 'catalog')}
</body>
</html>
`
}

function bookCard(book, locale, from) {
  const t = T[locale]
  return `<a class="card" href="${link(from, bookPath(locale, book.slug))}">${cover(book)}<span class="card-title">${escape(book.title)}</span><span class="card-meta">${escape(book.author)} · ${t.difficulty[book.difficulty]}</span></a>`
}

function catalogPage(books, locale) {
  const t = T[locale]
  const pagePath = catalogPath(locale)
  const groups = LANGUAGE_ORDER.map((language) => [language, books.filter((book) => book.language === language)]).filter(([, list]) => list.length)
  const body = `
    <section class="hero"><p class="eyebrow">${t.library.toUpperCase()}</p><h1>${t.catalogTitle}<span class="dot">.</span></h1><p class="lead">${t.catalogLead}</p>
    <div class="chips">${groups.map(([language]) => `<a class="chip" href="#${language}">${t.language[language]}</a>`).join('')}</div></section>
    ${groups.map(([language, list]) => `<section class="group" id="${language}"><h2>${t.language[language]}</h2><div class="grid">${list.map((book) => bookCard(book, locale, pagePath)).join('')}</div></section>`).join('')}`
  return page({
    locale, path: pagePath, title: `${t.catalogTitle} — ${t.library}`, description: t.catalogMeta,
    alternates: LOCALES.map((lang) => [lang, catalogPath(lang)]), body,
  })
}

function excerptOf(chapters) {
  const paragraphs = []
  let words = 0
  for (const chapter of chapters) {
    if (chapter.title) paragraphs.push({ heading: chapter.title })
    for (const text of chapter.text.split('\n\n')) {
      paragraphs.push({ text })
      words += (text.match(/\p{L}+/gu) ?? []).length
      if (words >= EXCERPT_WORDS) return paragraphs
    }
    if (words >= EXCERPT_WORDS * 0.6) return paragraphs
  }
  return paragraphs
}

function bookPage(book, books, chapters, locale) {
  const t = T[locale]
  const pagePath = bookPath(locale, book.slug)
  const appLink = `${link(pagePath, '')}?book=${book.slug}`
  const others = books.filter((other) => other.language === book.language && other.slug !== book.slug)
  const shownChapters = chapters.slice(0, 30)
  const body = `
    <nav class="crumbs"><a href="${link(pagePath, catalogPath(locale))}">${t.library}</a> / <a href="${link(pagePath, catalogPath(locale))}#${book.language}">${t.language[book.language]}</a></nav>
    <section class="book">
      ${cover(book)}
      <div class="book-info">
        <p class="eyebrow">${t.language[book.language].toUpperCase()} · ${book.year}</p>
        <h1 lang="${book.language}">${escape(book.title)}</h1>
        <p class="author">${escape(book.author)} <span>(${book.authorYears})</span></p>
        <ul class="facts"><li>${t.difficultyLabel}: <strong>${t.difficulty[book.difficulty]}</strong></li><li>${book.words.toLocaleString(locale === 'en' ? 'en-US' : locale)} ${t.words}</li><li>${book.chapters} ${t.chaptersCount}</li><li>${readingTime(t, book.words)}</li></ul>
        <p class="description">${escape(book.description[locale])}</p>
        <div class="actions"><a class="button" href="${appLink}">${t.read}</a><a class="link" href="#read">${t.start} ↓</a></div>
      </div>
    </section>
    <section class="contents"><h2>${t.chapters}</h2><ol lang="${book.language}">${shownChapters.map((chapter) => `<li>${escape(chapter.title || book.title)}</li>`).join('')}</ol>${chapters.length > shownChapters.length ? `<p class="muted">${t.andMore(chapters.length - shownChapters.length)}</p>` : ''}</section>
    <section class="try" id="read">
      <h2>${t.tryTitle}</h2>
      <p>${t.tryText}</p>
      <iframe class="reader-frame" src="${link(pagePath, 'reader.html')}?book=${book.slug}&amp;lang=${locale}" title="${escape(t.tryTitle)}" loading="lazy"></iframe>
      ${t.tryNote ? `<p class="muted try-note">${t.tryNote}</p>` : ''}
    </section>
    <details class="excerpt" lang="${book.language}"><summary lang="${locale}">${t.excerpt}</summary>
      ${excerptOf(chapters).map((part) => (part.heading ? `<h3>${escape(part.heading)}</h3>` : `<p>${escape(part.text)}</p>`)).join('\n      ')}
    </details>
    <section class="continue"><h2>${t.continueTitle}</h2><p>${t.continueText}</p><a class="button" href="${appLink}">${t.read}</a></section>
    ${others.length ? `<section class="group"><h2>${t.more}</h2><div class="grid">${others.map((other) => bookCard(other, locale, pagePath)).join('')}</div></section>` : ''}
    <p class="muted small">${t.publicDomain}</p>`
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Book', name: book.title, inLanguage: book.language,
    author: { '@type': 'Person', name: book.author }, datePublished: String(book.year), bookFormat: 'https://schema.org/EBook',
    isAccessibleForFree: true, description: book.description[locale], url: `${SITE}${pagePath}`,
  }
  return page({
    locale, path: pagePath, title: t.pageTitle(book, t.readIn[book.language]), description: t.pageDescription(book),
    alternates: LOCALES.map((lang) => [lang, bookPath(lang, book.slug)]), body, jsonLd,
  })
}

function write(relative, content) {
  const file = path.join(OUT, relative)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

const books = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/books.json'), 'utf8'))
for (const locale of LOCALES) fs.rmSync(path.join(OUT, prefix(locale), 'library'), { recursive: true, force: true })
write('library/library.css', STYLES)

const urls = [SITE]
for (const locale of LOCALES) {
  write(`${catalogPath(locale)}index.html`, catalogPage(books, locale))
  urls.push(`${SITE}${catalogPath(locale)}`)
}
for (const book of books) {
  const { chapters } = JSON.parse(fs.readFileSync(path.join(ROOT, `catalog/texts/${book.slug}.json`), 'utf8'))
  write(`library/${book.slug}/book.json`, JSON.stringify({ slug: book.slug, chapters }))
  for (const locale of LOCALES) {
    write(`${bookPath(locale, book.slug)}index.html`, bookPage(book, books, chapters, locale))
    urls.push(`${SITE}${bookPath(locale, book.slug)}`)
  }
}
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`)
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`)
console.log(`Ling Library: ${books.length} books, ${urls.length} pages in sitemap`)
