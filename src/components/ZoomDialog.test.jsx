import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { vi } from 'vitest'
import ZoomDialog from './ZoomDialog'

function Harness({ onClose = () => {} }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>opener</button>
      {open && (
        <ZoomDialog label="Big passport" closeLabel="Close" onClose={() => { onClose(); setOpen(false) }}>
          <a href="#x">inside link</a>
        </ZoomDialog>
      )}
    </>
  )
}

test('is a labelled modal dialog containing the content', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  await user.click(screen.getByRole('button', { name: 'opener' }))
  const dialog = screen.getByRole('dialog', { name: 'Big passport' })
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  expect(screen.getByRole('link', { name: 'inside link' })).toBeInTheDocument()
})

test('moves focus into the dialog and restores it to the opener on close', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  const opener = screen.getByRole('button', { name: 'opener' })
  await user.click(opener)
  expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(opener).toHaveFocus()
})

test('closes with Escape, the close button, and a click outside the passport', async () => {
  const user = userEvent.setup()
  const onClose = vi.fn()
  render(<Harness onClose={onClose} />)
  await user.click(screen.getByRole('button', { name: 'opener' }))
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'opener' }))
  await user.click(screen.getByRole('button', { name: 'Close' }))
  await user.click(screen.getByRole('button', { name: 'opener' }))
  await user.click(screen.getByTestId('zoom-backdrop'))
  expect(onClose).toHaveBeenCalledTimes(3)
})

test('clicking inside the passport does not close it', async () => {
  const user = userEvent.setup()
  const onClose = vi.fn()
  render(<Harness onClose={onClose} />)
  await user.click(screen.getByRole('button', { name: 'opener' }))
  await user.click(screen.getByRole('dialog'))
  expect(onClose).not.toHaveBeenCalled()
})

test('keeps Tab focus inside the dialog', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  await user.click(screen.getByRole('button', { name: 'opener' }))
  const link = screen.getByRole('link', { name: 'inside link' })
  const close = screen.getByRole('button', { name: 'Close' })
  close.focus()
  await user.tab()
  expect(link).toHaveFocus()
  await user.tab()
  expect(close).toHaveFocus()
  await user.tab({ shift: true })
  expect(link).toHaveFocus()
})

test('locks page scroll while open and restores it afterwards', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  await user.click(screen.getByRole('button', { name: 'opener' }))
  expect(document.body.style.overflow).toBe('hidden')
  await user.keyboard('{Escape}')
  expect(document.body.style.overflow).toBe('')
})
