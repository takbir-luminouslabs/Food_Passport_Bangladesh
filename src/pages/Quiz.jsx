import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { useApp } from '../context/app-context'
import { useLanguage } from '../hooks/useLanguage'
import { XP_RULES } from '../utils/xp'
import { buildRound } from '../utils/quiz'

export default function Quiz() {
  const { content, state, recordQuizCorrect } = useApp()
  const { language, t, pick, formatNumber } = useLanguage()
  const questions = content.quiz ?? []
  const done = new Set(state.quizProgress.correctIds)
  const [round, setRound] = useState(null) // { qs, i, picked, score }
  const nextRef = useRef(null)

  const picked = round?.picked ?? null
  useEffect(() => {
    if (picked !== null) nextRef.current?.focus()
  }, [picked])

  if (questions.length === 0) {
    return (
      <section>
        <h1 className="text-2xl font-bold text-primary">{t('nav.quiz')}</h1>
        <p className="mt-2 text-muted">{t('quiz.empty')}</p>
      </section>
    )
  }

  const start = () => setRound({ qs: buildRound(questions), i: 0, picked: null, score: 0, paid: false })
  const answered = done.size
  const total = questions.length

  const intro = (
    <div className="card-soft mt-4 p-5">
      <p>{t('quiz.intro', { xp: formatNumber(XP_RULES.QUIZ_CORRECT) })}</p>
      <p className="mt-2 text-sm text-muted">{t('quiz.progress', { done: formatNumber(answered), total: formatNumber(total) })}</p>
      <button type="button" onClick={start} className="mt-4 min-h-11 rounded-full bg-primary px-6 font-semibold text-lime">
        {t(answered > 0 ? 'quiz.startAgain' : 'quiz.start')}
      </button>
    </div>
  )

  if (!round) {
    return (
      <section>
        <h1 className="text-2xl font-bold text-primary">{t('nav.quiz')}</h1>
        {intro}
      </section>
    )
  }

  const finished = round.i >= round.qs.length
  if (finished) {
    return (
      <section>
        <h1 className="text-2xl font-bold text-primary">{t('nav.quiz')}</h1>
        <div className="card-soft mt-4 p-5">
          <h2 className="text-xl font-bold text-primary">{t('quiz.result', { score: formatNumber(round.score), total: formatNumber(round.qs.length) })}</h2>
          <p className="mt-2 text-sm text-muted">{t('quiz.progress', { done: formatNumber(answered), total: formatNumber(total) })}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={start} className="min-h-11 rounded-full bg-primary px-6 font-semibold text-lime">{t('quiz.again')}</button>
            <Link to="/" state={{ scrollTo: 'passport' }} className="inline-flex min-h-11 items-center rounded-full border-2 border-primary px-6 font-semibold text-primary">{t('quiz.toPassport')}</Link>
          </div>
        </div>
      </section>
    )
  }

  const q = round.qs[round.i]
  const answeredNow = round.picked !== null
  const choose = (idx) => {
    if (answeredNow) return
    const right = idx === q.correct
    if (right) recordQuizCorrect(q.id)
    setRound({ ...round, picked: idx, score: round.score + (right ? 1 : 0), paid: right && !done.has(q.id) })
  }
  const next = () => setRound({ ...round, i: round.i + 1, picked: null, paid: false })
  const right = answeredNow && round.picked === q.correct

  return (
    <section>
      <h1 className="text-2xl font-bold text-primary">{t('nav.quiz')}</h1>
      <p className="mt-2 text-sm text-muted">{t('quiz.question', { n: formatNumber(round.i + 1), total: formatNumber(round.qs.length) })}</p>
      <div className="card-soft mt-2 p-5">
        <h2 className="text-lg font-bold text-primary">{pick(q, 'question')}</h2>
        <ul className="mt-4 grid gap-2">
          {q.options.map((o, idx) => {
            const isCorrect = idx === q.correct
            const isPicked = idx === round.picked
            const tone = !answeredNow
              ? 'border-primary/30 bg-card hover:bg-lime/30'
              : isCorrect
                ? 'border-primary bg-lime/60'
                : isPicked
                  ? 'border-red-700 bg-red-50'
                  : 'border-primary/15 bg-card opacity-70'
            return (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => choose(idx)}
                  aria-disabled={answeredNow}
                  className={`flex min-h-12 w-full items-center gap-2 rounded-xl border-2 px-4 py-2 text-left font-semibold ${tone}`}
                >
                  <span className="flex-1">{o[language]}</span>
                  {answeredNow && isCorrect && <span className="inline-flex items-center gap-1 text-sm text-primary"><Icon name="check" className="size-[1em]" />{t('quiz.correctOption')}</span>}
                  {answeredNow && isPicked && !isCorrect && <span className="inline-flex items-center gap-1 text-sm text-red-800"><Icon name="close" className="size-[1em]" />{t('quiz.yourAnswer')}</span>}
                </button>
              </li>
            )
          })}
        </ul>

        <div role="status" aria-live="polite" className="mt-4">
          {answeredNow && (
            <div>
              <p className="font-bold text-primary">
                {right ? t('quiz.right') : t('quiz.wrong')}
                {round.paid && <span className="ml-2 text-sm">{t('quiz.xp', { xp: formatNumber(XP_RULES.QUIZ_CORRECT) })}</span>}
              </p>
              <p className="mt-1">{pick(q, 'explanation')}</p>
              <p className="mt-1 text-sm">
                <a href={q.source_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{t('quiz.source')}: {new URL(q.source_url).hostname}</a>
              </p>
            </div>
          )}
        </div>
        {answeredNow && (
          <button ref={nextRef} type="button" onClick={next} className="mt-4 min-h-11 rounded-full bg-primary px-6 font-semibold text-lime">
            {t(round.i + 1 >= round.qs.length ? 'quiz.finish' : 'quiz.next')}
          </button>
        )}
      </div>
    </section>
  )
}
