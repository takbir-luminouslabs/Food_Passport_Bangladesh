import { readFileSync } from 'node:fs'
import { screen, within } from '@testing-library/react'
import { translations } from '../data/translations'
import { renderApp } from '../test/renderApp'
import { XP_RULES } from '../utils/xp'

const bn = translations.bn
const quiz = JSON.parse(readFileSync('public/data/quiz.json', 'utf8'))
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const stored = () => JSON.parse(localStorage.getItem('food-passport-bangladesh:v1'))

/** The question on screen, found by its Bengali text, with its correct and a wrong option button. */
const current = () => {
  const heading = screen.getByRole('heading', { level: 2 })
  const q = quiz.find((x) => x.question_bn === heading.textContent)
  const correct = screen.getByRole('button', { name: new RegExp(`^${esc(q.options[q.correct].bn)}`) })
  const wrong = q.options.map((o, i) => i).filter((i) => i !== q.correct).map((i) => screen.getByRole('button', { name: new RegExp(`^${esc(q.options[i].bn)}`) }))[0]
  return { q, correct, wrong }
}

test('the quiz page replaces the coming-soon placeholder and offers to start', async () => {
  await renderApp('#/quiz')
  expect(screen.getByRole('heading', { level: 1, name: bn['nav.quiz'] })).toBeInTheDocument()
  expect(screen.queryByText(bn['coming.soon'])).toBeNull()
  expect(screen.getByRole('button', { name: bn['quiz.start'] })).toBeInTheDocument()
})

test('a right answer shows it, a source link and earns XP once', async () => {
  const { user } = await renderApp('#/quiz')
  await user.click(screen.getByRole('button', { name: bn['quiz.start'] }))
  const { q, correct } = current()
  await user.click(correct)
  const status = screen.getByText(bn['quiz.right']).closest('[role="status"]')
  expect(within(status).getByText(/^\+[০-৯]+ XP পেয়েছেন$/)).toBeInTheDocument()
  expect(within(status).getByText(/^\+[০-৯]+ XP পেয়েছেন$/)).toHaveTextContent(String(XP_RULES.QUIZ_CORRECT).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]))
  expect(within(status).getByRole('link', { name: new RegExp(new URL(q.source_url).hostname) })).toHaveAttribute('href', q.source_url)
  expect(stored().quizProgress.correctIds).toEqual([q.id])
  expect(screen.getByRole('button', { name: bn['quiz.next'] })).toHaveFocus()
})

test('a wrong answer is marked with text, explains, and earns nothing', async () => {
  const { user } = await renderApp('#/quiz')
  await user.click(screen.getByRole('button', { name: bn['quiz.start'] }))
  const { correct, wrong } = current()
  await user.click(wrong)
  expect(screen.getByText(bn['quiz.wrong'])).toBeInTheDocument()
  expect(within(wrong).getByText(bn['quiz.yourAnswer'])).toBeInTheDocument()
  expect(within(correct).getByText(bn['quiz.correctOption'])).toBeInTheDocument()
  expect(stored()?.quizProgress.correctIds ?? []).toEqual([])
})

test('a finished round shows the score, and a repeat right answer does not pay XP again', async () => {
  const { user } = await renderApp('#/quiz', { state: { quizProgress: { correctIds: quiz.map((q) => q.id) } } })
  await user.click(screen.getByRole('button', { name: bn['quiz.startAgain'] }))
  for (let i = 0; i < quiz.length; i++) {
    await user.click(current().correct)
    expect(screen.queryByText(/^\+[০-৯]+ XP পেয়েছেন$/)).toBeNull()
    await user.click(screen.getByRole('button', { name: i === quiz.length - 1 ? bn['quiz.finish'] : bn['quiz.next'] }))
  }
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(String(quiz.length).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]))
  expect(screen.getByRole('button', { name: bn['quiz.again'] })).toBeInTheDocument()
})
