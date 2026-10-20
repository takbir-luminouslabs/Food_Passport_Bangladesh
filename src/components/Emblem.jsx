/** Original emblem (a rice bowl with steam and leaves in a ring). Not any government symbol. */
export default function Emblem({ className = '' }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false" className={className} fill="none" stroke="currentColor" strokeLinecap="round">
      <circle cx="60" cy="60" r="55" strokeWidth="3" />
      <circle cx="60" cy="60" r="48" strokeWidth="1" strokeDasharray="1.5 3.5" />
      <g strokeWidth="2.5">
        <path d="M48 56c-6-7 0-13 0-19s-5-8-3-13" />
        <path d="M60 52c-6-8 0-14 0-21s-5-9-3-15" />
        <path d="M72 56c-6-7 0-13 0-19s-5-8-3-13" />
      </g>
      <path d="M28 64h64a32 32 0 0 1-64 0Z" fill="currentColor" stroke="none" />
      <rect x="46" y="94" width="28" height="5" rx="2.5" fill="currentColor" stroke="none" />
      <path d="M36 98c-14-1-19-13-20-23 14 1 20 9 20 23Z" fill="currentColor" stroke="none" opacity="0.85" />
      <path d="M84 98c14-1 19-13 20-23-14 1-20 9-20 23Z" fill="currentColor" stroke="none" opacity="0.85" />
    </svg>
  )
}
