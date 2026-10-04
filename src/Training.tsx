import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Bookmark, Check, Delete, Languages, Layers, ListChecks, PenLine, Puzzle, RotateCcw, Shuffle, Volume2, X, type LucideIcon } from 'lucide-react'
import type { SavedWord } from './domain'
import { getLanguage, speak } from './languages'
import { isDue, review } from './srs'
import { tokenize, wordKey } from './text'

type ExerciseType = 'flashcard' | 'choose-translation' | 'choose-word' | 'letters' | 'write'
type Mode = 'mix' | ExerciseType
type WordSource = 'recommended' | 'random' | 'manual'
type Exercise = { word: SavedWord; type: ExerciseType; options: string[] }
type Result = { word: SavedWord; correct: boolean }

const SESSION_SIZE = 10
const MAX_MANUAL = 30

const MODES: { id: Mode; title: string; hint: string; icon: LucideIcon }[] = [
  { id: 'mix', title: 'Микс', hint: 'Все упражнения вперемешку', icon: Shuffle },
  { id: 'flashcard', title: 'Карточки', hint: 'Вспомни перевод', icon: Layers },
  { id: 'choose-translation', title: 'Выбери перевод', hint: 'Слово → 4 варианта', icon: ListChecks },
  { id: 'choose-word', title: 'Перевод → слово', hint: 'Найди слово по переводу', icon: Languages },
  { id: 'letters', title: 'Собери слово', hint: 'Из перемешанных букв', icon: Puzzle },
  { id: 'write', title: 'Напиши слово', hint: 'Вспомни написание', icon: PenLine },
]

const SOURCES: { id: WordSource; title: string }[] = [
  { id: 'recommended', title: 'Рекомендуемые' },
  { id: 'random', title: 'Случайные' },
  { id: 'manual', title: 'Выбрать самой' },
]

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]]
  }
  return result
}

/** Words waiting longest first: overdue learning words, then the rest of the learning words, then known ones. */
function recommendedOrder(words: SavedWord[]): SavedWord[] {
  return [...words].sort((a, b) => Number(a.known) - Number(b.known) || a.dueAt - b.dueAt)
}

function comparable(text: string, ignoreAccents: boolean): string {
  const base = text.trim().toLowerCase().replace(/’/g, "'").replace(/\s+/g, ' ')
  return ignoreAccents ? base.normalize('NFD').replace(/\p{M}/gu, '') : base
}

function canSpellWithLetters(word: string): boolean {
  return /^[\p{L}'’-]{2,14}$/u.test(word)
}

function pickOptions(correct: string, candidates: string[]): string[] {
  const distractors = shuffle(Array.from(new Set(candidates.filter((item) => comparable(item, false) !== comparable(correct, false))))).slice(0, 3)
  return shuffle([correct, ...distractors])
}

function buildExercises(words: SavedWord[], mode: Mode, pool: SavedWord[]): Exercise[] {
  const translations = pool.map((word) => word.translation)
  const spellings = pool.map((word) => word.word)
  const canChoose = new Set(translations.map((item) => comparable(item, false))).size >= 4
  return words.map((word) => {
    const available: ExerciseType[] = ['flashcard', 'write']
    if (canChoose) available.push('choose-translation', 'choose-word')
    if (canSpellWithLetters(word.word)) available.push('letters')
    let type: ExerciseType
    if (mode === 'mix') type = available[Math.floor(Math.random() * available.length)]
    else if (available.includes(mode)) type = mode
    else type = mode === 'letters' ? 'write' : 'flashcard'
    const options = type === 'choose-translation' ? pickOptions(word.translation, translations)
      : type === 'choose-word' ? pickOptions(word.word, spellings)
        : []
    return { word, type, options }
  })
}

function wordsLabel(count: number): string {
  const lastTwo = count % 100
  const last = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return 'слов'
  if (last === 1) return 'слово'
  if (last >= 2 && last <= 4) return 'слова'
  return 'слов'
}

type TrainingProps = {
  words: SavedWord[]
  language: string
  onSaveWord: (word: SavedWord) => Promise<void>
  onActivity: () => void
  onOpenLibrary: () => void
}

export function Training({ words, language, onSaveWord, onActivity, onOpenLibrary }: TrainingProps) {
  const [stage, setStage] = useState<'setup' | 'session' | 'results'>('setup')
  const [mode, setMode] = useState<Mode>('mix')
  const [source, setSource] = useState<WordSource>('recommended')
  const [manualIds, setManualIds] = useState<Set<string>>(new Set())
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [results, setResults] = useState<Result[]>([])

  const dueCount = useMemo(() => words.filter((word) => isDue(word)).length, [words])
  const ordered = useMemo(() => recommendedOrder(words), [words])

  function sessionWords(): SavedWord[] {
    if (source === 'manual') return words.filter((word) => manualIds.has(word.id))
    if (source === 'random') return shuffle(words).slice(0, SESSION_SIZE)
    return shuffle(ordered.slice(0, SESSION_SIZE))
  }

  function start(selected: SavedWord[]) {
    if (!selected.length) return
    setExercises(buildExercises(selected, mode, words))
    setResults([])
    setStage('session')
  }

  async function finishExercise(exercise: Exercise, correct: boolean) {
    const now = Date.now()
    const latest = words.find((word) => word.id === exercise.word.id) ?? exercise.word
    const updated = !correct ? review(latest, 'again', now) : isDue(latest, now) ? review(latest, 'good', now) : null
    const nextResults = [...results, { word: latest, correct }]
    setResults(nextResults)
    if (nextResults.length >= exercises.length) setStage('results')
    onActivity()
    if (updated) await onSaveWord(updated)
  }

  const startCount = source === 'manual' ? manualIds.size : Math.min(SESSION_SIZE, words.length)

  if (!words.length) {
    return (
      <>
        <TrainingHeader language={language} />
        <div className="empty-state"><div className="empty-icon"><Bookmark size={23} /></div><h2>Пока нечего тренировать</h2><p>Открой книгу и сохрани несколько незнакомых слов — они появятся здесь.</p><button className="primary-action" onClick={onOpenLibrary}>Открыть библиотеку</button></div>
      </>
    )
  }

  if (stage === 'session') {
    const exercise = exercises[results.length]
    if (!exercise) return null
    return (
      <section className="training-session">
        <div className="session-top">
          <button className="icon-button" onClick={() => setStage('setup')} aria-label="Закончить тренировку"><X size={18} /></button>
          <div className="session-progress" aria-label={`Упражнение ${results.length + 1} из ${exercises.length}`}><span style={{ width: `${(results.length / exercises.length) * 100}%` }} /></div>
          <span className="session-count">{results.length + 1} / {exercises.length}</span>
        </div>
        <ExerciseView key={results.length} exercise={exercise} language={language} onDone={(correct) => void finishExercise(exercise, correct)} />
      </section>
    )
  }

  if (stage === 'results') {
    const correctCount = results.filter((result) => result.correct).length
    const mistakes = results.filter((result) => !result.correct).map((result) => result.word)
    const ratio = correctCount / Math.max(1, results.length)
    return (
      <section className="training-results">
        <span className="eyebrow">ИТОГ ТРЕНИРОВКИ</span>
        <div className="score"><strong>{correctCount}</strong><span>из {results.length}</span></div>
        <p className="score-note">{ratio === 1 ? 'Безупречно! Все ответы верные.' : ratio >= 0.7 ? 'Отличный результат. Ошибки вернутся на повторение.' : 'Хорошая разминка. Слова с ошибками скоро вернутся.'}</p>
        <div className="result-list">{results.map((result, index) => (
          <div className={`result-row${result.correct ? '' : ' wrong'}`} key={`${result.word.id}-${index}`}>
            <span className="result-mark">{result.correct ? <Check size={14} /> : <X size={14} />}</span>
            <strong>{result.word.word}</strong>
            <span>{result.word.translation}</span>
          </div>
        ))}</div>
        <div className="result-actions">
          {mistakes.length > 0 && <button className="secondary-action" onClick={() => start(mistakes)}><RotateCcw size={16} /> Повторить ошибки</button>}
          <button className="primary-action" onClick={() => start(sessionWords())}>Ещё {startCount} {wordsLabel(startCount)} <ArrowRight size={16} /></button>
          <button className="quiet-button" onClick={() => setStage('setup')}>Другая тренировка</button>
        </div>
      </section>
    )
  }

  return (
    <>
      <TrainingHeader language={language} />
      <section className="training-setup">
        {dueCount > 0 && <div className="due-note"><RotateCcw size={15} /> {dueCount} {wordsLabel(dueCount)} ждут повторения — они первыми попадут в рекомендуемые.</div>}
        <div className="setup-block">
          <span className="eyebrow">УПРАЖНЕНИЕ</span>
          <div className="mode-grid">{MODES.map(({ id, title, hint, icon: Icon }) => (
            <button key={id} className={`mode-card${mode === id ? ' selected' : ''}`} onClick={() => setMode(id)} aria-pressed={mode === id}>
              <Icon size={19} />
              <strong>{title}</strong>
              <small>{hint}</small>
            </button>
          ))}</div>
        </div>
        <div className="setup-block">
          <span className="eyebrow">СЛОВА</span>
          <div className="segmented" role="radiogroup" aria-label="Какие слова тренировать">{SOURCES.map(({ id, title }) => (
            <button key={id} role="radio" aria-checked={source === id} className={source === id ? 'selected' : ''} onClick={() => setSource(id)}>{title}</button>
          ))}</div>
          <p className="setup-hint">{source === 'recommended' ? 'Слова, которые ты дольше всего не повторяла. Так память закрепляется лучше всего.' : source === 'random' ? `${SESSION_SIZE} случайных слов из словаря.` : `Отметь слова для тренировки (до ${MAX_MANUAL}).`}</p>
          {source === 'manual' && (
            <div className="pick-list">{ordered.map((word) => {
              const checked = manualIds.has(word.id)
              return (
                <label key={word.id} className={checked ? 'pick-row checked' : 'pick-row'}>
                  <input type="checkbox" checked={checked} disabled={!checked && manualIds.size >= MAX_MANUAL} onChange={() => {
                    const next = new Set(manualIds)
                    if (checked) next.delete(word.id)
                    else next.add(word.id)
                    setManualIds(next)
                  }} />
                  <strong>{word.word}</strong>
                  <span>{word.translation}</span>
                  {isDue(word) && <i className="due-dot" aria-label="Пора повторить" />}
                </label>
              )
            })}</div>
          )}
        </div>
        <button className="primary-action start-training" disabled={!startCount} onClick={() => start(sessionWords())}>
          Начать · {startCount} {wordsLabel(startCount)} <ArrowRight size={16} />
        </button>
      </section>
    </>
  )
}

function TrainingHeader({ language }: { language: string }) {
  return <header className="page-header"><div><span className="eyebrow">ТРЕНИРОВКА · {getLanguage(language).name.toUpperCase()}</span><h1>Тренировка<span className="heading-period">.</span></h1><p>Десять слов за подход. Выбери упражнение и слова.</p></div></header>
}

/** The example sentence with the studied word highlighted, or hidden while it is the answer. */
function Context({ word, hidden }: { word: SavedWord; hidden: boolean }) {
  if (!word.context) return null
  const key = wordKey(word.word)
  return <p className="exercise-context">{tokenize(word.context).map((token, index) => token.key === key ? <mark key={index}>{hidden ? '＿＿＿' : token.text}</mark> : token.text)}</p>
}

type ExerciseProps = { exercise: Exercise; language: string; onDone: (correct: boolean) => void }

function ExerciseView({ exercise, language, onDone }: ExerciseProps) {
  const { word, type } = exercise
  const [answer, setAnswer] = useState<{ correct: boolean; note?: string } | null>(null)
  const doneRef = useRef(false)
  const reverse = type !== 'flashcard' && type !== 'choose-translation'

  function settle(correct: boolean, note?: string) {
    if (answer) return
    setAnswer({ correct, note })
    if (reverse) speak(word.word, language)
  }

  // Enter on the focused "next" button fires both a click and the shortcut, so completion is guarded.
  function complete(correct: boolean) {
    if (doneRef.current) return
    doneRef.current = true
    onDone(correct)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (answer && event.key === 'Enter') {
        event.preventDefault()
        complete(answer.correct)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const title = { 'flashcard': 'Вспомни перевод', 'choose-translation': 'Выбери перевод', 'choose-word': 'Какое это слово?', 'letters': 'Собери слово', 'write': 'Напиши слово' }[type]
  let body: ReactNode
  if (type === 'flashcard') body = <Flashcard word={word} onGrade={complete} />
  else if (type === 'choose-translation' || type === 'choose-word') body = <Choice options={exercise.options} correct={type === 'choose-word' ? word.word : word.translation} answered={Boolean(answer)} onPick={settle} />
  else if (type === 'letters') body = <Letters word={word.word} answered={Boolean(answer)} onFinish={settle} />
  else body = <Writing word={word.word} answered={Boolean(answer)} onFinish={settle} />

  return (
    <div className="exercise">
      <span className="exercise-kind">{title}</span>
      <div className="exercise-prompt">
        <strong>{reverse ? word.translation : word.word}</strong>
        {!reverse && <button className="icon-button" onClick={() => speak(word.word, language)} aria-label="Произнести слово"><Volume2 size={17} /></button>}
      </div>
      <Context word={word} hidden={reverse && !answer} />
      {body}
      {answer && (
        <div className={`exercise-feedback${answer.correct ? ' correct' : ' wrong'}`} role="status">
          <span>{answer.correct ? <Check size={17} /> : <X size={17} />}</span>
          <div>
            <strong>{answer.correct ? 'Верно!' : 'Правильный ответ:'}</strong>
            <small>{answer.note ?? (answer.correct ? `${word.word} — ${word.translation}` : reverse ? word.word : word.translation)}</small>
          </div>
          <button className="primary-action" onClick={() => complete(answer.correct)} autoFocus>Дальше <ArrowRight size={16} /></button>
        </div>
      )}
    </div>
  )
}

function Flashcard({ word, onGrade }: { word: SavedWord; onGrade: (correct: boolean) => void }) {
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ' && !revealed) {
        event.preventDefault()
        setRevealed(true)
      }
      if (revealed && event.key === '1') onGrade(false)
      if (revealed && event.key === '2') onGrade(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })
  if (!revealed) return <button className="reveal-button" onClick={() => setRevealed(true)}>Показать перевод</button>
  return (
    <>
      <div className="flash-answer">{word.translation}</div>
      <div className="practice-actions">
        <button className="secondary-action" onClick={() => onGrade(false)}><RotateCcw size={16} /> Не помню</button>
        <button className="primary-action" onClick={() => onGrade(true)}><Check size={17} /> Помню</button>
      </div>
    </>
  )
}

function Choice({ options, correct, answered, onPick }: { options: string[]; correct: string; answered: boolean; onPick: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  function pick(option: string) {
    if (answered) return
    setPicked(option)
    onPick(option === correct)
  }
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const index = Number(event.key) - 1
      if (index >= 0 && index < options.length) pick(options[index])
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })
  return (
    <div className="choice-grid">{options.map((option, index) => {
      const state = !answered ? '' : option === correct ? ' correct' : option === picked ? ' wrong' : ' faded'
      return <button key={option} className={`choice${state}`} onClick={() => pick(option)} disabled={answered}><kbd>{index + 1}</kbd>{option}</button>
    })}</div>
  )
}

function Letters({ word, answered, onFinish }: { word: string; answered: boolean; onFinish: (correct: boolean, note?: string) => void }) {
  const tiles = useMemo(() => {
    const letters = word.toLowerCase().split('').map((letter, index) => ({ letter, index }))
    let mixed = shuffle(letters)
    // Avoid handing out the answer already assembled.
    for (let attempt = 0; attempt < 5 && mixed.map((tile) => tile.letter).join('') === word.toLowerCase(); attempt += 1) mixed = shuffle(letters)
    return mixed
  }, [word])
  const [picked, setPicked] = useState<number[]>([])
  const pickedRef = useRef<number[]>([])

  function add(tileIndex: number) {
    if (answered || pickedRef.current.includes(tileIndex)) return
    const next = [...pickedRef.current, tileIndex]
    pickedRef.current = next
    setPicked(next)
    if (next.length === tiles.length) {
      const built = next.map((index) => tiles[index].letter).join('')
      onFinish(built === word.toLowerCase())
    }
  }

  function removeLast() {
    if (answered) return
    const next = pickedRef.current.slice(0, -1)
    pickedRef.current = next
    setPicked(next)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Backspace') removeLast()
      if (event.key.length !== 1) return
      const tileIndex = tiles.findIndex((tile, index) => tile.letter === event.key.toLowerCase() && !pickedRef.current.includes(index))
      if (tileIndex >= 0) add(tileIndex)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <>
      <div className="letter-slots" aria-label="Собранное слово">{tiles.map((_, index) => {
        const tile = picked[index] === undefined ? null : tiles[picked[index]]
        return <span key={index} className={tile ? 'slot filled' : 'slot'}>{tile?.letter ?? ''}</span>
      })}</div>
      <div className="letter-tiles">{tiles.map((tile, index) => (
        <button key={index} className="tile" disabled={answered || picked.includes(index)} onClick={() => add(index)}>{tile.letter}</button>
      ))}</div>
      {!answered && (
        <div className="exercise-tools">
          <button className="quiet-button" onClick={removeLast} disabled={!picked.length}><Delete size={16} /> Стереть</button>
          <button className="quiet-button" onClick={() => onFinish(false)}>Не знаю</button>
        </div>
      )}
    </>
  )
}

function Writing({ word, answered, onFinish }: { word: string; answered: boolean; onFinish: (correct: boolean, note?: string) => void }) {
  const [value, setValue] = useState('')
  function check() {
    if (answered || !value.trim()) return
    if (comparable(value, false) === comparable(word, false)) onFinish(true)
    else if (comparable(value, true) === comparable(word, true)) onFinish(true, `Почти идеально — обрати внимание на знаки: ${word}`)
    else onFinish(false)
  }
  return (
    <form className="write-form" onSubmit={(event) => { event.preventDefault(); check() }}>
      <input value={value} onChange={(event) => setValue(event.target.value)} disabled={answered} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Слово на изучаемом языке" aria-label="Твой ответ" />
      {!answered && (
        <div className="exercise-tools">
          <button className="primary-action" type="submit" disabled={!value.trim()}>Проверить</button>
          <button className="quiet-button" type="button" onClick={() => onFinish(false)}>Не знаю</button>
        </div>
      )}
    </form>
  )
}
