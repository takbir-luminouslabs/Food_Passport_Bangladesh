import { fireEvent, render, screen } from '@testing-library/react'
import FoodImage from './FoodImage'

const food = { id: 'x', category: 'street_food', name_en: 'Chotpoti', name_bn: 'চটপটি', image_url: null }

test('uses a designed fallback when there is no image', () => {
  const { container } = render(<FoodImage food={food} alt="Chotpoti" />)
  expect(screen.queryByRole('img')).toBeNull()
  expect(container.querySelector('[data-fallback]')).toBeInTheDocument()
})

test('renders the image with alt text when available', () => {
  render(<FoodImage food={{ ...food, image_url: '/a.jpg' }} alt="Chotpoti" />)
  expect(screen.getByRole('img', { name: 'Chotpoti' })).toHaveAttribute('src', '/a.jpg')
})

test('falls back when the image fails to load', () => {
  const { container } = render(<FoodImage food={{ ...food, image_url: '/broken.jpg' }} alt="Chotpoti" />)
  fireEvent.error(screen.getByRole('img'))
  expect(screen.queryByRole('img')).toBeNull()
  expect(container.querySelector('[data-fallback]')).toBeInTheDocument()
})
