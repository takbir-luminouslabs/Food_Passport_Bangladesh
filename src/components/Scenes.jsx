// Decorative illustrations (flat colour, drawn for this site). Always aria-hidden: they carry no information.

function Palm({ x, base = 300, top = 190, lean = 10, scale = 1 }) {
  const tx = x + lean
  return (
    <g>
      <path d={`M${x} ${base} Q${x + lean * 0.3} ${(base + top) / 2} ${tx} ${top}`} stroke="#8a6a4a" strokeWidth={7 * scale} fill="none" strokeLinecap="round" />
      {[-44, -28, 0, 28, 44].map((dx) => (
        <path
          key={dx}
          d={`M${tx} ${top} Q${tx + dx * 0.6 * scale} ${top - 26 * scale} ${tx + dx * scale} ${top + 12 * scale} Q${tx + dx * 0.45 * scale} ${top - 6 * scale} ${tx} ${top} Z`}
          fill="#3f9b63"
        />
      ))}
      <circle cx={tx} cy={top} r={4.5 * scale} fill="#6b4a2f" />
    </g>
  )
}

/** The footer's horizon: rolling hills, a sun, a boat and palms. */
export function HillsScene({ className = '' }) {
  return (
    <svg viewBox="0 0 1200 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false" data-scene="hills" className={className}>
      <circle cx="930" cy="62" r="36" fill="#ffd36b" opacity="0.9" className="scene-pulse" />
      <path d="M0 160 V100 Q120 40 260 96 T520 92 T800 100 T1200 70 V160 Z" fill="#8ccfa3" />
      <path d="M0 160 V124 Q180 78 360 122 T740 118 T1200 112 V160 Z" fill="#5fb487" />
      <g className="scene-bob">
        <path d="M900 140 Q950 158 1010 140 Z" fill="#8b5a3c" />
        <path d="M956 140 V104" stroke="#6b4a2f" strokeWidth="3" />
        <path d="M956 106 L990 136 L956 136 Z" fill="#fff7e6" />
      </g>
      <Palm x={90} base={150} top={86} lean={10} scale={0.8} />
      <Palm x={150} base={154} top={108} lean={-8} scale={0.6} />
      <circle cx="400" cy="120" r="6" fill="#2f7d52" /><circle cx="470" cy="132" r="5" fill="#2f7d52" />
    </svg>
  )
}
