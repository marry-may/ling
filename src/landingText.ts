export type LandingLanguage = 'uk' | 'ru' | 'en'

type Feature = { title: string; points: string[] }
type Item = { title: string; text: string }

export type LandingText = {
  label: string
  login: string
  eyebrow: string
  title: string
  lead: string
  start: string
  haveAccount: string
  facts: string
  /** Shown where the app interface (in Russian) differs from the page language. */
  interfaceNote?: string
  stepsTitle: string
  steps: Item[]
  reading: Feature
  training: Feature
  progress: Feature
  moreTitle: string
  more: Item[]
  finalTitle: string
  finalText: string
  libraryNav: string
  libraryTitle: string
  libraryText: string
  libraryAll: string
  imageAlt: { reader: string; readerPhone: string; training: string; trainingPhone: string; library: string }
}

export const LANDING_TEXT: Record<LandingLanguage, LandingText> = {
  uk: {
    label: 'UA',
    login: 'Увійти',
    eyebrow: 'ЧИТАЙ · ПЕРЕКЛАДАЙ · ЗАПАМ’ЯТОВУЙ',
    title: 'Вивчай мову за книжками, які хочеться читати',
    lead: 'Завантаж будь-яку книжку — Ling покаже переклад кожного слова одним натиском, збереже нові слова до словника й допоможе їх вивчити.',
    start: 'Створити акаунт',
    haveAccount: 'У мене вже є акаунт',
    facts: 'EPUB, PDF, TXT · 12 мов · переклад твоєю мовою',
    interfaceNote: 'Інтерфейс застосунку поки що російською мовою.',
    stepsTitle: 'Як це працює',
    steps: [
      { title: 'Завантаж книжку', text: 'EPUB, PDF, TXT або MD. Навіть скани: текст розпізнається автоматично, а великі книжки діляться на частини.' },
      { title: 'Читай і натискай на слова', text: 'Переклад із кількох словників, приклад із тексту й озвучення. Нові слова підсвічені синім, ті, що вивчаєш, — жовтим.' },
      { title: 'Тренуй слова', text: 'П’ять видів вправ. Слова повертаються на повторення саме тоді, коли починають забуватися.' },
    ],
    reading: {
      title: 'Кожне слово — в контексті',
      points: ['Сині — нові слова, жовті — ті, що вивчаєш', 'Варіанти перекладу за частинами мови', '«Знаю всі нові» — одним натиском познач знайомі слова й гортай далі'],
    },
    training: {
      title: 'Тренування, які не набридають',
      points: ['Картки, вибір перекладу, збери слово з літер, напиши слово — або все впереміш', '10 слів за підхід і підсумок наприкінці', 'Радимо слова, які найдовше не повторювалися'],
    },
    progress: {
      title: 'Видно, як росте словник',
      points: ['Серія днів поспіль і дні занять', 'Скільки слів ти вже знаєш', 'Кілька мов — у кожної своя полиця'],
    },
    moreTitle: 'А ще',
    more: [
      { title: '12 мов', text: 'Англійська, німецька, французька, іспанська, італійська, польська та інші.' },
      { title: 'Скани й PDF', text: 'Розпізнаємо текст навіть там, де його не можна виділити.' },
      { title: 'Великі книжки', text: 'Довгі книжки автоматично діляться на частини в одній теці.' },
      { title: 'Синхронізація', text: 'Книжки, слова й прогрес однакові на телефоні та комп’ютері.' },
      { title: 'Працює офлайн', text: 'Встанови Ling на телефон як застосунок і читай без інтернету.' },
      { title: 'Озвучення', text: 'Послухай, як звучить слово, одним натиском.' },
    ],
    libraryNav: 'Бібліотека',
    libraryTitle: 'Книжки в оригіналі — безкоштовно',
    libraryText: 'Бібліотека Ling: класика англійською, іспанською, німецькою, французькою, італійською та португальською. Почни читати онлайн або додай книжку до себе.',
    libraryAll: 'Уся бібліотека',
    finalTitle: 'Відкрий першу книжку вже сьогодні',
    finalText: 'Реєстрація займає хвилину. Книжки й слова збережуться в акаунті.',
    imageAlt: {
      reader: 'Читання книжки в Ling: нові слова підсвічені синім, слова, що вивчаються, — жовтим',
      readerPhone: 'Переклад слова в Ling на телефоні',
      training: 'Вправа «Вибери переклад» у Ling',
      trainingPhone: 'Вправа на телефоні',
      library: 'Бібліотека й прогрес у Ling',
    },
  },
  ru: {
    label: 'RU',
    login: 'Войти',
    eyebrow: 'ЧИТАЙ · ПЕРЕВОДИ · ЗАПОМИНАЙ',
    title: 'Учи язык по книгам, которые хочется читать',
    lead: 'Загрузи любую книгу — Ling покажет перевод каждого слова одним нажатием, сохранит новые слова в словарь и поможет их выучить.',
    start: 'Создать аккаунт',
    haveAccount: 'У меня уже есть аккаунт',
    facts: 'EPUB, PDF, TXT · 12 языков · перевод на твой язык',
    stepsTitle: 'Как это работает',
    steps: [
      { title: 'Загрузи книгу', text: 'EPUB, PDF, TXT или MD. Даже сканы: текст распознаётся автоматически, а большие книги делятся на части.' },
      { title: 'Читай и нажимай на слова', text: 'Перевод из нескольких словарей, пример из текста и озвучка. Новые слова подсвечены синим, изучаемые — жёлтым.' },
      { title: 'Тренируй слова', text: 'Пять видов упражнений. Слова возвращаются на повторение именно тогда, когда начинают забываться.' },
    ],
    reading: {
      title: 'Каждое слово — в контексте',
      points: ['Синие — новые слова, жёлтые — те, что учишь', 'Варианты перевода по частям речи', '«Знаю все новые» — одной кнопкой отметь знакомые слова и листай дальше'],
    },
    training: {
      title: 'Тренировки, которые не надоедают',
      points: ['Карточки, выбор перевода, собери слово из букв, напиши слово — или всё вперемешку', '10 слов за подход и итог в конце', 'Рекомендуем слова, которые дольше всего не повторялись'],
    },
    progress: {
      title: 'Видно, как растёт словарь',
      points: ['Серия дней подряд и дни занятий', 'Сколько слов ты уже знаешь', 'Несколько языков — у каждого своя полка'],
    },
    moreTitle: 'А ещё',
    more: [
      { title: '12 языков', text: 'Английский, немецкий, французский, испанский, итальянский, польский и другие.' },
      { title: 'Сканы и PDF', text: 'Распознаём текст даже там, где его нельзя выделить.' },
      { title: 'Большие книги', text: 'Длинные книги автоматически делятся на части в одной папке.' },
      { title: 'Синхронизация', text: 'Книги, слова и прогресс одинаковые на телефоне и компьютере.' },
      { title: 'Работает офлайн', text: 'Установи Ling на телефон как приложение и читай без интернета.' },
      { title: 'Озвучка', text: 'Послушай, как звучит слово, одним нажатием.' },
    ],
    libraryNav: 'Библиотека',
    libraryTitle: 'Книги в оригинале — бесплатно',
    libraryText: 'Библиотека Ling: классика на английском, испанском, немецком, французском, итальянском и португальском. Начни читать онлайн или добавь книгу себе.',
    libraryAll: 'Вся библиотека',
    finalTitle: 'Открой первую книгу уже сегодня',
    finalText: 'Регистрация займёт минуту. Книги и слова сохранятся в аккаунте.',
    imageAlt: {
      reader: 'Чтение книги в Ling: новые слова подсвечены синим, изучаемые — жёлтым',
      readerPhone: 'Перевод слова в Ling на телефоне',
      training: 'Упражнение «Выбери перевод» в Ling',
      trainingPhone: 'Упражнение на телефоне',
      library: 'Библиотека и прогресс в Ling',
    },
  },
  en: {
    label: 'EN',
    login: 'Log in',
    eyebrow: 'READ · TRANSLATE · REMEMBER',
    title: 'Learn a language from books you actually want to read',
    lead: 'Upload any book — Ling shows the translation of every word with a single tap, saves new words to your dictionary and helps you learn them.',
    start: 'Create an account',
    haveAccount: 'I already have an account',
    facts: 'EPUB, PDF, TXT · 12 languages · translations into your language',
    interfaceNote: 'The app interface is in Russian for now.',
    stepsTitle: 'How it works',
    steps: [
      { title: 'Upload a book', text: 'EPUB, PDF, TXT or MD. Even scans: the text is recognized automatically, and long books are split into parts.' },
      { title: 'Read and tap words', text: 'Translations from several dictionaries, an example from the text and pronunciation. New words are highlighted in blue, words you are learning in yellow.' },
      { title: 'Practice your words', text: 'Five kinds of exercises. Words come back for review right when you start to forget them.' },
    ],
    reading: {
      title: 'Every word in context',
      points: ['Blue for new words, yellow for words you are learning', 'Translation variants by part of speech', '“I know all new words” marks familiar words with one tap and turns the page'],
    },
    training: {
      title: 'Practice that never gets boring',
      points: ['Flashcards, pick the translation, build the word from letters, type the word — or mix them all', '10 words per round with a summary at the end', 'We suggest the words you haven’t reviewed for the longest'],
    },
    progress: {
      title: 'Watch your vocabulary grow',
      points: ['Your streak and study days', 'How many words you already know', 'Several languages, each with its own shelf'],
    },
    moreTitle: 'And also',
    more: [
      { title: '12 languages', text: 'English, German, French, Spanish, Italian, Polish and more.' },
      { title: 'Scans and PDFs', text: 'We recognize text even where it can’t be selected.' },
      { title: 'Long books', text: 'Long books are split into parts within one folder.' },
      { title: 'Sync', text: 'Books, words and progress are the same on your phone and computer.' },
      { title: 'Works offline', text: 'Install Ling on your phone as an app and read without internet.' },
      { title: 'Pronunciation', text: 'Hear how a word sounds with one tap.' },
    ],
    libraryNav: 'Library',
    libraryTitle: 'Books in the original, for free',
    libraryText: 'The Ling Library: classics in English, Spanish, German, French, Italian and Portuguese. Start reading online or add a book to your shelf.',
    libraryAll: 'The whole library',
    finalTitle: 'Open your first book today',
    finalText: 'Signing up takes a minute. Your books and words are kept in your account.',
    imageAlt: {
      reader: 'Reading a book in Ling: new words highlighted in blue, words being learned in yellow',
      readerPhone: 'A word translation in Ling on a phone',
      training: 'The “pick the translation” exercise in Ling',
      trainingPhone: 'An exercise on a phone',
      library: 'Library and progress in Ling',
    },
  },
}

export function detectLandingLanguage(): LandingLanguage {
  try {
    const stored = localStorage.getItem('ling-landing-language')
    if (stored === 'uk' || stored === 'ru' || stored === 'en') return stored
  } catch {
    // Fall back to the browser language.
  }
  const browser = navigator.language.toLowerCase()
  if (browser.startsWith('uk')) return 'uk'
  if (browser.startsWith('ru')) return 'ru'
  return 'en'
}
