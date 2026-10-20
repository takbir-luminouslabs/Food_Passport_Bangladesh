/** How much of the catalogue has been tried, as a whole percentage between 0 and 100. */
export function percentTried(tried, total) {
  if (!(total > 0) || !(tried > 0)) return 0
  return Math.min(100, Math.round((tried / total) * 100))
}
