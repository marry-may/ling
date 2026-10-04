import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Bookmark, Check, ChevronDown, Clock, RotateCcw, Volume2, X } from 'lucide-react'
import type { SavedWord } from './domain'
import { getLanguage, speak } from './languages'
import { isDue, MAX_LEVEL, review, type Grade } from './srs'
import { tokenize, wordKey } from './text'

type WordsPageProps = {
  words: SavedWord[]
  language: string
  onSaveWord: (word: SavedWord) => Promise<void>
  onDeleteWord: (wordId: string) => Promise<void>
  onOpenLibrary: () => void
}

function formatNextReview(dueAt: number, now: number): string {
  const days = Math.ceil((dueAt - now) / (24 * 60 * 60 * 1000))
  if (days <= 1) return 'завтра'
  return `через ${days} ${days < 5 ? 'дня' : 'дней'}`
}

function wordsLabel(count: number): string {
  const lastTwo = count % 100
  const last = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return 'слов'
  if (last === 1) return 'слово'
  if (last >= 2 && last <= 4) return 'слова'
  return 'слов'
}

export function WordsPage({ words, language, onSaveWord, onDeleteWord, onOpenLibrary }: WordsPageProps) {
  const [now, setNow] = useState(Date.now)
  const [showAnswer, setShowAnswer] = useState(false)
  const [busy, setBusy] = useState(false)

  const dueWords = useMemo(() => words.filter((word) => isDue(word, now)).sort((a, b) => a.dueAt - b.dueAt), [words, now])
  const learningWords = useMemo(() => words.filter((word) => !word.known), [words])
  const nextDue = useMemo(() => Math.min(...learningWords.map((word) => word.dueAt)), [learningWords])
  const practiceWord = dueWords[0]
  const languageInfo = getLanguage(language)

  async function grade(value: Grade) {
    if (!practiceWord || busy) return
    setBusy(true)
    try {
      await onSaveWord(review(practiceWord, value))
      setShowAnswer(false)
      setNow(Date.now())
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!practiceWord || event.target instanceof HTMLInputElement) return
      if (event.key === ' ' && !showAnswer) {
        event.preventDefault()
        setShowAnswer(true)
      }
      if (!showAnswer) return
      if (event.key === '1') void grade('again')
      if (event.key === '2') void grade('good')
      if (event.key === '3') void grade('easy')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const practiceKey = practiceWord ? wordKey(practiceWord.word) : ''

  return (
    <>
      <header className="page-header words-header"><div><span className="eyebrow">ТВОЙ СЛОВАРЬ · {languageInfo.name.toUpperCase()}</span><h1>Мои слова<span className="heading-period">.</span></h1><p>Слова возвращаются на повторение, когда ты начинаешь их забывать.</p></div><div className="header-stats"><strong>{words.length}</strong><span>сохранено</span></div></header>
      <section className="words-page">
        {words.length > 0 ? (
          <>
            {practiceWord ? (
              <>
                <div className="practice-banner"><div className="practice-banner-icon"><RotateCcw size={21} /></div><div><strong>Пора повторить</strong><span>{dueWords.length} {wordsLabel(dueWords.length)} на повторение</span></div><button className="practice-cta" onClick={() => document.getElementById('practice')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>К тренировке <ArrowLeft size={16} className="arrow-forward" /></button></div>
                <section className="practice-section" id="practice">
                  <div className="section-heading"><div><span className="eyebrow">ТРЕНИРОВКА</span><h2>Вспомни перевод</h2></div><span className="practice-counter">осталось {dueWords.length}</span></div>
                  <div className="flashcard" onClick={() => setShowAnswer(!showAnswer)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') setShowAnswer(!showAnswer) }}>
                    <span className="flashcard-label">{showAnswer ? 'ПЕРЕВОД' : languageInfo.label}</span>
                    <strong>{showAnswer ? practiceWord.translation : practiceWord.word}</strong>
                    {practiceWord.context && <p className="flashcard-context">{tokenize(practiceWord.context).map((token, index) => token.key === practiceKey ? <mark key={index}>{token.text}</mark> : token.text)}</p>}
                    <span className="flashcard-source">{showAnswer ? practiceWord.bookTitle : 'Нажми или пробел, чтобы увидеть перевод'}</span>
                    <button className="icon-button flashcard-sound" onClick={(event) => { event.stopPropagation(); speak(practiceWord.word, practiceWord.language) }} aria-label="Произнести слово"><Volume2 size={17} /></button>
                  </div>
                  {showAnswer ? (
                    <div className="practice-actions grade-actions">
                      <button className="secondary-action" disabled={busy} onClick={() => void grade('again')}><RotateCcw size={16} /> Не помню <kbd>1</kbd></button>
                      <button className="primary-action" disabled={busy} onClick={() => void grade('good')}><Check size={17} /> Помню <kbd>2</kbd></button>
                      <button className="secondary-action" disabled={busy} onClick={() => void grade('easy')}><Check size={16} /> Знаю отлично <kbd>3</kbd></button>
                    </div>
                  ) : <button className="reveal-button" onClick={() => setShowAnswer(true)}>Показать перевод <ChevronDown size={17} /></button>}
                </section>
              </>
            ) : learningWords.length > 0
              ? <div className="practice-complete"><Clock size={18} /><span><strong>На сегодня всё повторено</strong><small>Следующее повторение {formatNextReview(nextDue, now)}.</small></span></div>
              : <div className="practice-complete"><Check size={18} /><span><strong>Все слова выучены</strong><small>Сохраняй новые слова во время чтения.</small></span></div>}
            <section className="word-list-section">
              <div className="section-heading"><div><span className="eyebrow">КОЛЛЕКЦИЯ</span><h2>Все слова</h2></div></div>
              <div className="word-list">{words.map((word) => (
                <article className={`word-row${word.known ? ' word-known' : ''}`} key={word.id}>
                  <div className="word-initial">{word.word[0]?.toUpperCase()}</div>
                  <div className="word-details"><strong>{word.word}</strong><span>{word.bookTitle}</span></div>
                  <div className="word-translation">{word.translation}</div>
                  {word.known
                    ? <span className="known-label"><Check size={13} /> Выучено</span>
                    : <span className="level-dots" aria-label={`Уровень ${word.level} из ${MAX_LEVEL}`}>{Array.from({ length: MAX_LEVEL }, (_, index) => <i key={index} className={index < word.level ? 'filled' : ''} />)}</span>}
                  <button className="delete-word" aria-label={`Удалить слово ${word.word}`} onClick={() => void onDeleteWord(word.id)}><X size={16} /></button>
                </article>
              ))}</div>
            </section>
          </>
        ) : <div className="empty-state"><div className="empty-icon"><Bookmark size={23} /></div><h2>Словарь пока пуст</h2><p>Открой книгу и нажми на незнакомое слово, чтобы сохранить его сюда.</p><button className="primary-action" onClick={onOpenLibrary}>Открыть библиотеку</button></div>}
      </section>
    </>
  )
}
