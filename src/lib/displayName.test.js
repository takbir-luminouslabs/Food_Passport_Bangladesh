import { checkName, cleanName, nameErrorKey } from './displayName'

test('instant checks: length and characters', () => {
  expect(checkName('')).toBeNull()
  expect(checkName('Rafi')).toBeNull()
  expect(checkName('রাফি আহমেদ')).toBeNull()
  expect(checkName('a')).toBe('name_length')
  expect(checkName('x'.repeat(25))).toBe('name_length')
  expect(checkName('hi <b>')).toBe('name_chars')
  expect(checkName('a@b.com')).toBe('name_chars')
})
test('whitespace is tidied', () => expect(cleanName('  a   b ')).toBe('a b'))
test('server errors map to message keys, anything else to null', () => {
  expect(nameErrorKey({ message: 'name_blocked' })).toBe('name_blocked')
  expect(nameErrorKey({ message: 'network down' })).toBeNull()
})
