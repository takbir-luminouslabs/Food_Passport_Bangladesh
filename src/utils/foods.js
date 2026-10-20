/**
 * Region to display for a food, or null. Low-confidence, unverified associations are hidden
 * (PRD 4.6: unverified cultural claims must not be presented as facts).
 */
export function regionInfo(food) {
  if (food.scope !== 'regional' || !food.region) return null
  const verified = food.verification_status === 'verified'
  if (!verified && food.association_confidence === 'low') return null
  return { ...food.region, verified }
}
