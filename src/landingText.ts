export type LandingLanguage = 'uk' | 'ru' | 'en'

type Feature = { title: string; points: string[] }
type Item = { title: string; text: string }

/** The sign-in screen a visitor reaches from the landing page, in the language they read it in. */
export type AuthText = {
  back: string
  eyebrow: string
  title: string
  lead: string
  bookNote: (title: string) => string
  tabs: string
  signIn: string
  signUp: string
  skip: string
  email: string
  password: string
  passwordHint: string
  translateTo: string
  translationHint: string
  busy: string
  toSignUp: string
  toSignIn: string
  checkEmail: (email: string, host: string) => string
  /** Supabase answers in English; the common cases are told in the visitor's language. */
  errors: { invalid: string; exists: string; unconfirmed: string; rateLimit: string; failed: string }
}

/** Headings mark the words set in italic with *asterisks* (see Rich in Landing.tsx). */
export type LandingText = {
  label: string
  /** Browser tab title. */
  pageTitle: string
  /** The words the hero greets with, in this language among others. */
  greeting: string
  auth: AuthText
  login: string
  eyebrow: string
  title: string
  lead: string
  start: string
  haveAccount: string
  facts: string
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
  /** The moving shelf of Ling Library books. */
  shelf: { open: string; previous: string; next: string; difficulty: Record<'easy' | 'medium' | 'hard', string> }
  imageAlt: { reader: string; readerPhone: string; training: string; trainingPhone: string; library: string }
}

export const LANDING_TEXT: Record<LandingLanguage, LandingText> = {
  uk: {
    label: 'UA',
    login: 'Увійти',
    pageTitle: 'Ling — читай і вивчай слова',
    greeting: 'привіт',
    auth: {
      back: 'Про застосунок',
      eyebrow: 'ЛАСКАВО ПРОСИМО ДО LING',
      title: 'Читай книжки й вивчай слова',
      lead: 'Увійди або створи акаунт: книжки, слова й прогрес будуть із тобою на всіх пристроях.',
      bookNote: (title) => `Щоб читати «${title}», увійди або продовж без акаунта.`,
      tabs: 'Вхід або реєстрація',
      signIn: 'Увійти',
      signUp: 'Створити акаунт',
      skip: 'Спробувати без акаунта',
      email: 'Електронна пошта',
      password: 'Пароль',
      passwordHint: 'Не менше 8 символів',
      translateTo: 'Перекладати на',
      translationHint: 'Твоя рідна мова. Її можна змінити будь-коли в акаунті.',
      busy: 'Підключаємо...',
      toSignUp: 'Уперше в Ling? Створити акаунт',
      toSignIn: 'Уже маєш акаунт? Увійти',
      checkEmail: (email, host) => `Перевір пошту ${email}: ми надіслали посилання для підтвердження. Воно відкриє ${host}, і ти одразу увійдеш в акаунт.`,
      errors: {
        invalid: 'Неправильна пошта або пароль.',
        exists: 'Акаунт із цією поштою вже існує. Спробуй увійти.',
        unconfirmed: 'Пошту ще не підтверджено: відкрий посилання з листа.',
        rateLimit: 'Забагато спроб. Зачекай трохи й спробуй ще раз.',
        failed: 'Не вдалося увійти. Спробуй ще раз.',
      },
    },
    eyebrow: 'ЧИТАЙ · ПЕРЕКЛАДАЙ · ЗАПАМ’ЯТОВУЙ',
    title: 'Вивчай мову за *книжками*, які хочеться читати',
    lead: 'Завантаж будь-яку книжку — Ling покаже переклад кожного слова одним натиском, збереже нові слова до словника й допоможе їх вивчити.',
    start: 'Створити акаунт',
    haveAccount: 'У мене вже є акаунт',
    facts: 'EPUB, PDF, TXT · 12 мов · переклад твоєю мовою',
    stepsTitle: 'Як це *працює*',
    steps: [
      { title: 'Завантаж книжку', text: 'EPUB, PDF, TXT або MD. Навіть скани: текст розпізнається автоматично, а великі книжки діляться на частини.' },
      { title: 'Читай і натискай на слова', text: 'Переклад із кількох словників, приклад із тексту й озвучення. Нові слова підсвічені синім, ті, що вивчаєш, — жовтим.' },
      { title: 'Тренуй слова', text: 'П’ять видів вправ. Слова повертаються на повторення саме тоді, коли починають забуватися.' },
    ],
    reading: {
      title: 'Кожне слово — *в контексті*',
      points: ['Сині — нові слова, жовті — ті, що вивчаєш', 'Варіанти перекладу за частинами мови', '«Знаю всі нові» — одним натиском познач знайомі слова й гортай далі'],
    },
    training: {
      title: 'Тренування, які *не набридають*',
      points: ['Картки, вибір перекладу, збери слово з літер, напиши слово — або все впереміш', '10 слів за підхід і підсумок наприкінці', 'Радимо слова, які найдовше не повторювалися'],
    },
    progress: {
      title: 'Видно, як *росте* словник',
      points: ['Серія днів поспіль і дні занять', 'Скільки слів ти вже знаєш', 'Кілька мов — у кожної своя полиця'],
    },
    moreTitle: 'А *ще*',
    more: [
      { title: '12 мов', text: 'Англійська, німецька, французька, іспанська, італійська, польська та інші.' },
      { title: 'Скани й PDF', text: 'Розпізнаємо текст навіть там, де його не можна виділити.' },
      { title: 'Великі книжки', text: 'Довгі книжки автоматично діляться на частини в одній теці.' },
      { title: 'Синхронізація', text: 'Книжки, слова й прогрес однакові на телефоні та комп’ютері.' },
      { title: 'Працює офлайн', text: 'Встанови Ling на телефон як застосунок і читай без інтернету.' },
      { title: 'Озвучення', text: 'Послухай, як звучить слово, одним натиском.' },
    ],
    libraryNav: 'Бібліотека',
    libraryTitle: 'Книжки *в оригіналі* — безкоштовно',
    libraryText: 'Бібліотека Ling: класика англійською, іспанською, німецькою, французькою, італійською та португальською. Почни читати онлайн або додай книжку до себе.',
    libraryAll: 'Уся бібліотека',
    shelf: { open: 'Відкрити книжку', previous: 'Попередня книжка', next: 'Наступна книжка', difficulty: { easy: 'легка', medium: 'середня', hard: 'складна' } },
    finalTitle: 'Відкрий першу книжку *вже сьогодні*',
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
    pageTitle: 'Ling — читай и учи слова',
    greeting: 'привет',
    auth: {
      back: 'О приложении',
      eyebrow: 'ДОБРО ПОЖАЛОВАТЬ В LING',
      title: 'Читай книги и учи слова',
      lead: 'Войди или создай аккаунт: книги, слова и прогресс будут с тобой на всех устройствах.',
      bookNote: (title) => `Чтобы читать «${title}», войди или продолжи без аккаунта.`,
      tabs: 'Вход или регистрация',
      signIn: 'Войти',
      signUp: 'Создать аккаунт',
      skip: 'Попробовать без аккаунта',
      email: 'Электронная почта',
      password: 'Пароль',
      passwordHint: 'Не короче 8 символов',
      translateTo: 'Переводить на',
      translationHint: 'Твой родной язык. Его можно поменять в любой момент в аккаунте.',
      busy: 'Подключаем...',
      toSignUp: 'Первый раз в Ling? Создать аккаунт',
      toSignIn: 'Уже есть аккаунт? Войти',
      checkEmail: (email, host) => `Проверь почту ${email}: мы отправили ссылку для подтверждения. Она откроет ${host}, и ты сразу войдёшь в аккаунт.`,
      errors: {
        invalid: 'Неверная почта или пароль.',
        exists: 'Аккаунт с этой почтой уже есть. Попробуй войти.',
        unconfirmed: 'Почта ещё не подтверждена: открой ссылку из письма.',
        rateLimit: 'Слишком много попыток. Подожди немного и попробуй снова.',
        failed: 'Не удалось выполнить вход. Попробуй ещё раз.',
      },
    },
    eyebrow: 'ЧИТАЙ · ПЕРЕВОДИ · ЗАПОМИНАЙ',
    title: 'Учи язык по *книгам*, которые хочется читать',
    lead: 'Загрузи любую книгу — Ling покажет перевод каждого слова одним нажатием, сохранит новые слова в словарь и поможет их выучить.',
    start: 'Создать аккаунт',
    haveAccount: 'У меня уже есть аккаунт',
    facts: 'EPUB, PDF, TXT · 12 языков · перевод на твой язык',
    stepsTitle: 'Как это *работает*',
    steps: [
      { title: 'Загрузи книгу', text: 'EPUB, PDF, TXT или MD. Даже сканы: текст распознаётся автоматически, а большие книги делятся на части.' },
      { title: 'Читай и нажимай на слова', text: 'Перевод из нескольких словарей, пример из текста и озвучка. Новые слова подсвечены синим, изучаемые — жёлтым.' },
      { title: 'Тренируй слова', text: 'Пять видов упражнений. Слова возвращаются на повторение именно тогда, когда начинают забываться.' },
    ],
    reading: {
      title: 'Каждое слово — *в контексте*',
      points: ['Синие — новые слова, жёлтые — те, что учишь', 'Варианты перевода по частям речи', '«Знаю все новые» — одной кнопкой отметь знакомые слова и листай дальше'],
    },
    training: {
      title: 'Тренировки, которые *не надоедают*',
      points: ['Карточки, выбор перевода, собери слово из букв, напиши слово — или всё вперемешку', '10 слов за подход и итог в конце', 'Рекомендуем слова, которые дольше всего не повторялись'],
    },
    progress: {
      title: 'Видно, как *растёт* словарь',
      points: ['Серия дней подряд и дни занятий', 'Сколько слов ты уже знаешь', 'Несколько языков — у каждого своя полка'],
    },
    moreTitle: 'А *ещё*',
    more: [
      { title: '12 языков', text: 'Английский, немецкий, французский, испанский, итальянский, польский и другие.' },
      { title: 'Сканы и PDF', text: 'Распознаём текст даже там, где его нельзя выделить.' },
      { title: 'Большие книги', text: 'Длинные книги автоматически делятся на части в одной папке.' },
      { title: 'Синхронизация', text: 'Книги, слова и прогресс одинаковые на телефоне и компьютере.' },
      { title: 'Работает офлайн', text: 'Установи Ling на телефон как приложение и читай без интернета.' },
      { title: 'Озвучка', text: 'Послушай, как звучит слово, одним нажатием.' },
    ],
    libraryNav: 'Библиотека',
    libraryTitle: 'Книги *в оригинале* — бесплатно',
    libraryText: 'Библиотека Ling: классика на английском, испанском, немецком, французском, итальянском и португальском. Начни читать онлайн или добавь книгу себе.',
    libraryAll: 'Вся библиотека',
    shelf: { open: 'Открыть книгу', previous: 'Предыдущая книга', next: 'Следующая книга', difficulty: { easy: 'лёгкая', medium: 'средняя', hard: 'сложная' } },
    finalTitle: 'Открой первую книгу *уже сегодня*',
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
    pageTitle: 'Ling — read books, learn words',
    greeting: 'bonjour',
    auth: {
      back: 'About the app',
      eyebrow: 'WELCOME TO LING',
      title: 'Read books and learn words',
      lead: 'Sign in or create an account: your books, words and progress will be with you on every device.',
      bookNote: (title) => `To read “${title}”, sign in or continue without an account.`,
      tabs: 'Sign in or sign up',
      signIn: 'Sign in',
      signUp: 'Create account',
      skip: 'Try without an account',
      email: 'Email',
      password: 'Password',
      passwordHint: 'At least 8 characters',
      translateTo: 'Translate into',
      translationHint: 'Your native language. You can change it any time in your account.',
      busy: 'Connecting...',
      toSignUp: 'New to Ling? Create an account',
      toSignIn: 'Already have an account? Sign in',
      checkEmail: (email, host) => `Check your inbox at ${email}: we sent you a confirmation link. It opens ${host} and signs you in right away.`,
      errors: {
        invalid: 'Wrong email or password.',
        exists: 'An account with this email already exists. Try signing in.',
        unconfirmed: 'Your email is not confirmed yet: open the link from the email.',
        rateLimit: 'Too many attempts. Wait a moment and try again.',
        failed: 'Could not sign in. Please try again.',
      },
    },
    eyebrow: 'READ · TRANSLATE · REMEMBER',
    title: 'Learn a language from *books* you actually want to read',
    lead: 'Upload any book — Ling shows the translation of every word with a single tap, saves new words to your dictionary and helps you learn them.',
    start: 'Create an account',
    haveAccount: 'I already have an account',
    facts: 'EPUB, PDF, TXT · 12 languages · translations into your language',
    stepsTitle: 'How it *works*',
    steps: [
      { title: 'Upload a book', text: 'EPUB, PDF, TXT or MD. Even scans: the text is recognized automatically, and long books are split into parts.' },
      { title: 'Read and tap words', text: 'Translations from several dictionaries, an example from the text and pronunciation. New words are highlighted in blue, words you are learning in yellow.' },
      { title: 'Practice your words', text: 'Five kinds of exercises. Words come back for review right when you start to forget them.' },
    ],
    reading: {
      title: 'Every word *in context*',
      points: ['Blue for new words, yellow for words you are learning', 'Translation variants by part of speech', '“I know all new words” marks familiar words with one tap and turns the page'],
    },
    training: {
      title: 'Practice that *never gets boring*',
      points: ['Flashcards, pick the translation, build the word from letters, type the word — or mix them all', '10 words per round with a summary at the end', 'We suggest the words you haven’t reviewed for the longest'],
    },
    progress: {
      title: 'Watch your vocabulary *grow*',
      points: ['Your streak and study days', 'How many words you already know', 'Several languages, each with its own shelf'],
    },
    moreTitle: 'And *also*',
    more: [
      { title: '12 languages', text: 'English, German, French, Spanish, Italian, Polish and more.' },
      { title: 'Scans and PDFs', text: 'We recognize text even where it can’t be selected.' },
      { title: 'Long books', text: 'Long books are split into parts within one folder.' },
      { title: 'Sync', text: 'Books, words and progress are the same on your phone and computer.' },
      { title: 'Works offline', text: 'Install Ling on your phone as an app and read without internet.' },
      { title: 'Pronunciation', text: 'Hear how a word sounds with one tap.' },
    ],
    libraryNav: 'Library',
    libraryTitle: 'Books *in the original*, for free',
    libraryText: 'The Ling Library: classics in English, Spanish, German, French, Italian and Portuguese. Start reading online or add a book to your shelf.',
    libraryAll: 'The whole library',
    shelf: { open: 'Open the book', previous: 'Previous book', next: 'Next book', difficulty: { easy: 'easy', medium: 'intermediate', hard: 'advanced' } },
    finalTitle: 'Open your first book *today*',
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


/** The visitor-facing reason a sign-in or sign-up failed. */
export function authErrorText(error: unknown, text: AuthText): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  const message = error instanceof Error ? error.message : ''
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) return text.errors.invalid
  if (code === 'user_already_exists' || /already registered/i.test(message)) return text.errors.exists
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) return text.errors.unconfirmed
  if (code.startsWith('over_') || /rate limit/i.test(message)) return text.errors.rateLimit
  return message || text.errors.failed
}
