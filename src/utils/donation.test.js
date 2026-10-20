import { validBkashNumber } from './donation'

test('accepts a Bangladeshi mobile number and shows it in the usual 11-digit local form', () => {
  expect(validBkashNumber('01712345678')).toBe('01712345678')
  expect(validBkashNumber(' 01712-345 678 ')).toBe('01712345678')
  expect(validBkashNumber('+8801712345678')).toBe('01712345678')
  expect(validBkashNumber('8801912345678')).toBe('01912345678')
})

test('anything that is not a valid number counts as "not verified yet" and shows nothing', () => {
  for (const bad of [undefined, null, '', '   ', '12345', '01212345678', '0171234567', '017123456789', 'bkash', '01712abcdef', '+8801712345678900']) {
    expect(validBkashNumber(bad)).toBe('')
  }
})
