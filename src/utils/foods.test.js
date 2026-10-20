import { regionInfo } from './foods'

const regional = (confidence, verification = 'unverified') => ({
  scope: 'regional', association_confidence: confidence, verification_status: verification,
  region: { district_en: 'Natore', district_bn: 'নাটোর', division: 'Rajshahi' },
})

test('national foods have no region', () => {
  expect(regionInfo({ scope: 'national', region: null })).toBeNull()
})

test('high and medium confidence regions are shown, flagged as unverified', () => {
  expect(regionInfo(regional('high'))).toMatchObject({ district_en: 'Natore', verified: false })
  expect(regionInfo(regional('medium'))).toMatchObject({ verified: false })
})

test('low-confidence unverified regions are hidden (PRD 4.6)', () => {
  expect(regionInfo(regional('low'))).toBeNull()
})

test('a verified food always shows its region', () => {
  expect(regionInfo(regional('low', 'verified'))).toMatchObject({ verified: true })
})
