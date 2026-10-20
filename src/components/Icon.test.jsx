import { render } from '@testing-library/react'
import { iconSvgPath } from '../utils/stampIcons'
import Icon from './Icon'

test('renders the line-art path as a decorative svg that follows the text colour', () => {
  const { container } = render(<Icon name="lock" className="size-5" />)
  const svg = container.querySelector('svg')
  expect(svg).toHaveAttribute('aria-hidden', 'true')
  expect(svg).toHaveAttribute('focusable', 'false')
  expect(svg).toHaveAttribute('viewBox', '0 0 100 100')
  expect(svg).toHaveAttribute('stroke', 'currentColor')
  expect(svg).toHaveAttribute('fill', 'none')
  expect(svg).toHaveClass('size-5')
  expect(svg.querySelector('path').getAttribute('d')).toBe(iconSvgPath('lock'))
})

test('category ids work too, so headings and cards use the same set as the stamps', () => {
  const { container } = render(<Icon name="drinks" />)
  expect(container.querySelector('path').getAttribute('d')).toBe(iconSvgPath('drinks'))
})

test('stroke width can be adjusted, e.g. bolder for the active tab', () => {
  const { container } = render(<Icon name="home" strokeWidth={9} />)
  expect(container.querySelector('svg')).toHaveAttribute('stroke-width', '9')
})

test('has a sensible default size so it never blows up when no class is given', () => {
  const { container } = render(<Icon name="check" />)
  expect(container.querySelector('svg')).toHaveClass('size-[1em]')
})
