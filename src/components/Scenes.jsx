// Decorative illustrations (flat colour, drawn for this site). Always aria-hidden: they carry no information.

const WINDOWS = (x, y, cols, rows, dx = 14, dy = 16, fill = '#fff6e5') =>
  Array.from({ length: cols * rows }, (_, i) => (
    <rect key={`${x}-${y}-${i}`} x={x + (i % cols) * dx} y={y + Math.floor(i / cols) * dy} width="6" height="8" rx="1.5" fill={fill} opacity="0.85" />
  ))

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

/** The home page's sky: sun, drifting clouds, a kite, hills, a skyline, a river with a country boat, palms. */
export function HeroScene({ className = '' }) {
  return (
    <svg viewBox="0 0 1200 340" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false" data-scene="hero" className={className}>
      <g data-part="sun">
        <circle cx="990" cy="108" r="66" fill="#ffe29a" opacity="0.55" className="scene-pulse" />
        <circle cx="990" cy="108" r="44" fill="#ffc94d" />
      </g>
      <g className="scene-drift" fill="#ffffff" opacity="0.9">
        <ellipse cx="170" cy="78" rx="58" ry="16" /><ellipse cx="210" cy="66" rx="36" ry="14" /><ellipse cx="136" cy="68" rx="30" ry="12" />
      </g>
      <g className="scene-drift scene-drift-slow" fill="#ffffff" opacity="0.8">
        <ellipse cx="640" cy="52" rx="64" ry="15" /><ellipse cx="686" cy="42" rx="34" ry="13" />
      </g>
      <g className="scene-drift" fill="#ffffff" opacity="0.7">
        <ellipse cx="860" cy="170" rx="44" ry="11" /><ellipse cx="892" cy="162" rx="24" ry="9" />
      </g>
      <g className="scene-sway">
        <path d="M268 112 L286 134 L268 168 L250 134 Z" fill="#f47c6c" />
        <path d="M268 112 L268 168 M250 134 L286 134" stroke="#fff6e5" strokeWidth="2" />
        <path d="M268 168 Q250 196 270 224" stroke="#7a5a3a" strokeWidth="2" fill="none" />
      </g>

      <path d="M0 250 Q140 192 300 238 T620 228 T930 238 T1200 212 V340 H0 Z" fill="#cfe9d6" />
      <path d="M0 276 Q200 236 420 270 T860 262 T1200 258 V340 H0 Z" fill="#a9d8b8" />

      {/* skyline */}
      <g>
        <rect x="318" y="206" width="30" height="96" rx="3" fill="#f1a59a" />
        {WINDOWS(325, 216, 2, 5, 12, 16)}
        <rect x="352" y="188" width="42" height="114" rx="3" fill="#ee8f86" />
        {WINDOWS(359, 198, 3, 6, 12, 16)}
        <rect x="398" y="224" width="64" height="78" rx="3" fill="#f6c7bd" />
        {WINDOWS(406, 234, 4, 4, 14, 16)}
        <rect x="465" y="170" width="26" height="132" rx="3" fill="#f4b9ad" />
        {WINDOWS(471, 182, 2, 6, 10, 18)}
        {/* domed building with arches */}
        <rect x="520" y="226" width="110" height="76" fill="#f7c88a" />
        <path d="M538 226 A37 37 0 0 1 612 226 Z" fill="#f2b366" />
        <rect x="571" y="180" width="8" height="26" fill="#f2b366" />
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M${532 + i * 24} 302 V266 A10 10 0 0 1 ${552 + i * 24} 266 V302 Z`} fill="#fbe3bf" />)}
        <rect x="512" y="204" width="12" height="98" rx="2" fill="#f2b366" /><path d="M512 204 Q518 188 524 204 Z" fill="#e89c4b" />
        <rect x="626" y="204" width="12" height="98" rx="2" fill="#f2b366" /><path d="M626 204 Q632 188 638 204 Z" fill="#e89c4b" />
        {/* monument with a red disc */}
        <path d="M706 302 L722 176 L732 176 L742 302 Z" fill="#e7a89d" />
        <path d="M752 302 L762 176 L772 176 L788 302 Z" fill="#e7a89d" />
        <path d="M740 302 L748 190 L756 190 L764 302 Z" fill="#efbfb5" />
        <circle cx="747" cy="168" r="16" fill="#e8574f" />
        <rect x="696" y="296" width="102" height="8" rx="2" fill="#d98c80" />
        {/* tall towers */}
        <rect x="826" y="196" width="36" height="106" rx="3" fill="#c9b6e8" />
        {WINDOWS(833, 206, 3, 5, 10, 16, '#f4eeff')}
        <rect x="866" y="222" width="52" height="80" rx="3" fill="#b7d4f0" />
        {WINDOWS(874, 232, 4, 4, 10, 16, '#eef6ff')}
      </g>

      {/* a street-food cart: striped umbrella, counter, steaming kettle */}
      <g data-part="cart">
        <rect x="168" y="262" width="78" height="40" rx="4" fill="#f6c36a" />
        <rect x="168" y="262" width="78" height="8" rx="3" fill="#e8a64f" />
        <rect x="176" y="276" width="62" height="20" rx="3" fill="#fbe3bf" />
        <path d="M207 262 V214" stroke="#8a6a4a" strokeWidth="4" />
        <path d="M156 220 Q207 176 258 220 Z" fill="#ee7a6c" />
        <path d="M156 220 Q172 190 190 188 L190 220 Z M224 188 Q242 190 258 220 L224 220 Z" fill="#fff6e5" />
        <path d="M207 180 V174" stroke="#8a6a4a" strokeWidth="3" />
        <ellipse cx="226" cy="256" rx="10" ry="8" fill="#9aa8b0" />
        <path d="M234 254 q8 -2 8 6" stroke="#9aa8b0" strokeWidth="3" fill="none" />
        <path d="M222 244 q-5 -9 0 -17" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" className="scene-steam" />
        <path d="M230 244 q5 -9 0 -17" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" className="scene-steam scene-steam-late" />
      </g>

      {/* bridge */}
      <g stroke="#7fa8bf" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M930 262 H1200" />
        {[0, 1, 2].map((i) => <path key={i} d={`M${960 + i * 90} 262 Q${1005 + i * 90} 220 ${1050 + i * 90} 262`} />)}
      </g>

      {/* river */}
      <rect x="0" y="292" width="1200" height="48" fill="#b7dff0" />
      <g stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85">
        <path d="M30 312 q14 -8 28 0 t28 0" /><path d="M700 322 q14 -8 28 0 t28 0" /><path d="M1010 308 q14 -8 28 0 t28 0" /><path d="M200 326 q14 -8 28 0 t28 0" />
      </g>
      <g className="scene-bob">
        <path d="M600 300 Q660 332 730 300 Z" fill="#8b5a3c" />
        <path d="M624 300 Q668 262 716 300" fill="#f6c36a" />
        <path d="M668 300 V252" stroke="#6b4a2f" strokeWidth="3" />
        <path d="M668 254 L704 292 L668 292 Z" fill="#fff7e6" />
        <path d="M668 254 L668 292 M680 266 L680 292 M692 278 L692 292" stroke="#f4b9ad" strokeWidth="2" />
      </g>
      <g className="scene-bob scene-bob-slow">
        <path d="M980 312 Q1010 330 1048 312 Z" fill="#a46d48" />
        <path d="M996 312 Q1014 292 1034 312" fill="#7dc79a" />
      </g>

      <Palm x={60} base={304} top={196} lean={14} />
      <Palm x={118} base={308} top={232} lean={-8} scale={0.75} />
      <Palm x={1126} base={304} top={200} lean={-14} />
      <Palm x={1168} base={308} top={236} lean={8} scale={0.7} />
    </svg>
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
