import { render, screen } from '@testing-library/react'
import ProgressBar from './ProgressBar'

test('the bar fills smoothly (and instantly for reduced motion)', () => {
  render(<ProgressBar value={40} max={100} label="x" />)
  const fill = screen.getByRole('progressbar').firstElementChild
  expect(fill.className).toMatch(/transition-\[width\]/)
  expect(fill.className).toMatch(/motion-reduce:transition-none/)
})
