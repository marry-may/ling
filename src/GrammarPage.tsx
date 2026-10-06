import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, GraduationCap, RotateCcw, X } from 'lucide-react'
import { checkAnswer, lessonsFor, PASS_SCORE, type Exercise, type Lesson } from './grammar'
import { LessonArt } from './grammar/art'
import { useMessages, useUiLanguage } from './i18n'
import { getLanguage } from './languages'

type GrammarPageProps = {
  language: string
  /** Best result of each lesson, in percent. */
  progress: Record<string, number>
  onResult: (lesson: Lesson, percent: number) => void
}

type Result = 'correct' | 'accent' | 'wrong'

/** Text with **double asterisks** around the words to highlight. */
function Marked({ text }: { text: string }) {
  return <>{text.split(/\*\*([^*]+)\*\*/).map((part, index) => (index % 2 ? <strong key={index}>{part}</strong> : part))}</>
}

/** A sentence with its ___ gap replaced by `gap`. */
function Gapped({ prompt, gap }: { prompt: string; gap: ReactNode }) {
  const [before, after = ''] = prompt.split('___')
  return <>{before}{gap}{after}</>
}

/** The words of a sentence in a mixed order that always differs from the right one. */
function shuffled(words: string[], seed: string): string[] {
  let state = 0
  for (const char of seed) state = (state * 31 + char.charCodeAt(0)) | 0
  const random = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
  const order = words.map((word, index) => ({ word, index }))
  for (let attempt = 0; attempt < 5; attempt++) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]]
    }
    if (order.some((item, index) => item.index !== index)) break
  }
  return order.map((item) => item.word)
}

const sentenceWords = (sentence: string) => sentence.replace(/[¿?¡!.,]/g, '').split(/\s+/).filter(Boolean)

function Feedback({ result, right, explain }: { result: Result; right: string; explain?: string }) {
  const t = useMessages()
  return (
    <div className={`grammar-feedback is-${result}`} role="status">
      {result === 'wrong' ? <X size={16} /> : <Check size={16} />}
      <div>
        <strong>{result === 'correct' ? t.grammar.correct : result === 'accent' ? t.grammar.accent(right) : t.grammar.right(right)}</strong>
        {explain && <span>{explain}</span>}
      </div>
    </div>
  )
}

function ExerciseCard({ exercise, number, lang, onAnswered }: { exercise: Exercise; number: number; lang: string; onAnswered: (result: Result) => void }) {
  const t = useMessages()
  const [choice, setChoice] = useState<number | null>(null)
  const [typed, setTyped] = useState('')
  const [picked, setPicked] = useState<number[]>([])
  const [result, setResult] = useState<Result | null>(null)
  const bank = useMemo(() => (exercise.kind === 'order' ? shuffled(sentenceWords(exercise.answer), exercise.answer) : []), [exercise])

  const ready = exercise.kind === 'choice' ? choice !== null : exercise.kind === 'input' ? typed.trim() !== '' : picked.length === bank.length

  function check() {
    if (!ready || result) return
    let next: Result
    if (exercise.kind === 'choice') next = choice === exercise.answer ? 'correct' : 'wrong'
    else if (exercise.kind === 'input') next = checkAnswer(typed, exercise.answers)
    else next = checkAnswer(picked.map((index) => bank[index]).join(' '), [exercise.answer], true) === 'wrong' ? 'wrong' : 'correct'
    setResult(next)
    onAnswered(next)
  }

  const onEnter = (event: KeyboardEvent) => {
    if (event.key === 'Enter') check()
  }

  const right = exercise.kind === 'choice' ? exercise.options[exercise.answer] : exercise.kind === 'input' ? exercise.answers[0] : exercise.answer
  return (
    <article className={`grammar-exercise${result ? ` is-${result}` : ''}`}>
      <span className="grammar-exercise-number">{number}</span>
      <div className="grammar-exercise-body">
        {exercise.kind === 'choice' && <>
          <p className="grammar-prompt" lang={lang}><Gapped prompt={exercise.prompt} gap={<span className={`grammar-gap${choice !== null ? ' filled' : ''}`}>{choice !== null ? exercise.options[choice] : ' '}</span>} /></p>
          <div className="grammar-options" role="radiogroup">{exercise.options.map((option, index) => (
            <button
              key={option}
              role="radio"
              aria-checked={choice === index}
              lang={lang}
              disabled={result !== null}
              className={['grammar-option', choice === index && 'selected', result && index === exercise.answer && 'right', result === 'wrong' && choice === index && 'wrong'].filter(Boolean).join(' ')}
              onClick={() => setChoice(index)}
            >{option}</button>
          ))}</div>
        </>}
        {exercise.kind === 'input' && (
          <p className="grammar-prompt" lang={lang}>
            <Gapped prompt={exercise.prompt} gap={<input className="grammar-input" value={typed} onChange={(event) => setTyped(event.target.value)} onKeyDown={onEnter} disabled={result !== null} size={Math.max(6, typed.length + 1)} aria-label={t.grammar.answerTo(number)} autoCapitalize="off" autoCorrect="off" spellCheck={false} />} />
            {exercise.hint && <span className="grammar-hint"> ({exercise.hint})</span>}
          </p>
        )}
        {exercise.kind === 'order' && <>
          <p className="grammar-task">{exercise.translation ? <>{t.grammar.build} <strong>«{exercise.translation}»</strong></> : t.grammar.buildPlain}</p>
          <div className="grammar-line" lang={lang} aria-label={t.grammar.yourAnswer}>
            {picked.length ? picked.map((index) => (
              <button key={index} className="grammar-word placed" disabled={result !== null} onClick={() => setPicked(picked.filter((item) => item !== index))}>{bank[index]}</button>
            )) : <span className="grammar-line-empty">{t.grammar.tapWords}</span>}
          </div>
          <div className="grammar-bank" lang={lang}>{bank.map((word, index) => (
            <button key={index} className="grammar-word" disabled={picked.includes(index) || result !== null} onClick={() => setPicked([...picked, index])}>{word}</button>
          ))}</div>
        </>}
        {result
          ? <Feedback result={result} right={right} explain={exercise.explain} />
          : <button className="grammar-check" onClick={check} disabled={!ready}>{t.grammar.check}</button>}
      </div>
    </article>
  )
}

function LessonView({ lesson, best, onBack, onResult }: { lesson: Lesson; best?: number; onBack: () => void; onResult: (percent: number) => void }) {
  const t = useMessages()
  const [attempt, setAttempt] = useState(0)
  const [results, setResults] = useState<Record<number, Result>>({})
  const total = lesson.exercises.length
  const answered = Object.keys(results).length
  const scoreOf = (all: Record<number, Result>) => Object.values(all).filter((result) => result !== 'wrong').length
  const right = scoreOf(results)
  const percent = Math.round((right / total) * 100)
  const finished = answered === total

  // The attempt is reported once, when its last exercise is checked.
  function answer(index: number, result: Result) {
    const next = { ...results, [index]: result }
    setResults(next)
    if (Object.keys(next).length === total) onResult(Math.round((scoreOf(next) / total) * 100))
  }

  function restart() {
    setResults({})
    setAttempt(attempt + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className="grammar-lesson">
      <button className="quiet-button folder-back" onClick={onBack}><ArrowLeft size={16} /> {t.grammar.allLessons}</button>
      <header className="grammar-lesson-header">
        <div>
          <span className="eyebrow">{lesson.level} · {getLanguage(lesson.language).name.toUpperCase()}{best !== undefined ? t.grammar.best(best) : ''}</span>
          <h1>{lesson.title}</h1>
          <p>{lesson.summary}</p>
        </div>
        <div className="grammar-lesson-art"><LessonArt id={lesson.id} /></div>
      </header>

      <div className="grammar-theory">{lesson.theory.map((block, index) => (
        <div className="grammar-block" key={index}>
          {block.heading && <h2>{block.heading}</h2>}
          <p><Marked text={block.text} /></p>
          {block.table && (
            <div className="grammar-table"><table lang={lesson.language}>
              <thead><tr>{block.table.head.map((cell, cellIndex) => <th key={cellIndex}>{cell}</th>)}</tr></thead>
              <tbody>{block.table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
            </table></div>
          )}
          {block.examples && <ul className="grammar-examples">{block.examples.map((example) => (
            <li key={example.text}><span lang={lesson.language}><Marked text={example.text} /></span>{example.translation && <small>{example.translation}</small>}</li>
          ))}</ul>}
        </div>
      ))}</div>

      <div className="grammar-exercises-head"><h2>{t.grammar.exercises}</h2><span>{t.grammar.answered(answered, total)}</span></div>
      <div className="grammar-exercises" key={attempt}>{lesson.exercises.map((exercise, index) => (
        <ExerciseCard key={index} exercise={exercise} number={index + 1} lang={lesson.language} onAnswered={(result) => answer(index, result)} />
      ))}</div>

      {finished && (
        <div className={`grammar-summary${percent >= PASS_SCORE ? ' passed' : ''}`} role="status">
          <strong>{t.grammar.score(right, total, percent)}</strong>
          <span>{percent === 100 ? t.grammar.flawless : percent >= PASS_SCORE ? t.grammar.passed : t.grammar.failed(PASS_SCORE)}</span>
          <div>
            <button className="secondary-action" onClick={restart}><RotateCcw size={15} /> {t.grammar.again}</button>
            <button className="primary-action" onClick={onBack}>{t.grammar.toLessons} <ArrowRight size={15} /></button>
          </div>
        </div>
      )}
    </section>
  )
}

export function GrammarPage({ language, progress, onResult }: GrammarPageProps) {
  const t = useMessages()
  const uiLanguage = useUiLanguage()
  const lessons = lessonsFor(language, uiLanguage)
  const [openId, setOpenId] = useState<string | null>(null)
  const open = lessons.find((lesson) => lesson.id === openId)
  const passed = lessons.filter((lesson) => (progress[lesson.id] ?? 0) >= PASS_SCORE).length

  if (open) {
    return <LessonView lesson={open} best={progress[open.id]} onBack={() => setOpenId(null)} onResult={(percent) => onResult(open, percent)} />
  }

  const levels = Array.from(new Set(lessons.map((lesson) => lesson.level)))
  return (
    <>
      <header className="page-header words-header">
        <div><span className="eyebrow">{t.grammar.kicker(getLanguage(language).name.toUpperCase())}</span><h1>{t.grammar.title}<span className="heading-period">.</span></h1><p>{t.grammar.lead}</p></div>
        {lessons.length > 0 && <div className="header-stats"><strong>{passed} / {lessons.length}</strong><span>{t.grammar.passedCount}</span></div>}
      </header>
      <section className="grammar-page">
        {lessons.length ? levels.map((level) => (
          <div className="grammar-level" key={level}>
            <h2>{t.grammar.level(level)}</h2>
            <div className="grammar-list">{lessons.filter((lesson) => lesson.level === level).map((lesson) => {
              const best = progress[lesson.id]
              const done = best !== undefined && best >= PASS_SCORE
              return (
                <button className={`grammar-card${done ? ' done' : ''}`} key={lesson.id} onClick={() => { setOpenId(lesson.id); window.scrollTo({ top: 0 }) }}>
                  <span className="grammar-card-art"><LessonArt id={lesson.id} />{done && <span className="grammar-card-done"><Check size={13} /></span>}</span>
                  <span className="grammar-card-text"><strong>{lesson.title}</strong><small>{lesson.summary}</small></span>
                  <span className="grammar-card-score">{best !== undefined ? `${best}%` : t.grammar.tasks(lesson.exercises.length)}</span>
                </button>
              )
            })}</div>
          </div>
        )) : (
          <div className="empty-library"><div className="empty-icon"><GraduationCap size={22} /></div><h2>{t.grammar.soonTitle}</h2><p>{t.grammar.soonText}</p></div>
        )}
      </section>
    </>
  )
}
