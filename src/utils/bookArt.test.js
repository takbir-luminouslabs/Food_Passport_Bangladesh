import { expect, test } from 'vitest'
import { createRecordingCtx } from '../test/recordingCtx'
import { drawSeal } from './bookArt'

const seal = { name: 'Rasgulla', district: 'Madaripur', category: 'sweets_desserts', ink: '#174B32' }

test('a seal with a food photo draws the photo in its middle, otherwise the category line-art', () => {
  const withPhoto = createRecordingCtx()
  drawSeal(withPhoto, seal, 100, 100, 90, 0, { width: 800, height: 600 })
  expect(withPhoto.calls.filter((c) => c[0] === 'drawImage')).toHaveLength(1)
  const without = createRecordingCtx()
  drawSeal(without, seal, 100, 100, 90, 0)
  expect(without.calls.filter((c) => c[0] === 'drawImage')).toHaveLength(0)
})
