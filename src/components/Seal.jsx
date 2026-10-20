import { useId } from 'react'
import { iconSvgPath } from '../utils/stampIcons'

const nameSize = (s) => (s.length > 16 ? 11 : s.length > 11 ? 12.5 : 14)
const districtSize = (s) => (s.length > 10 ? 10 : 11.5)

/**
 * A round rubber seal, drawn big and bold so it stays readable at small sizes: the food name on the top ring, the
 * district on the bottom ring and the food photo in the middle (the category line-art when there is no photo).
 */
export default function Seal({ name, district = '', category, ink, image = null, className = '' }) {
  const id = useId()
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false" data-ink={ink} className={className} style={{ color: ink }} fill="none" stroke="currentColor">
      <defs>
        <path id={`${id}t`} d="M 27.1 79 A 38 38 0 1 1 92.9 79" />
        <path id={`${id}b`} d="M 21.9 82 A 44 44 0 0 0 98.1 82" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="currentColor" fillOpacity="0.07" strokeWidth="4" />
      <circle cx="60" cy="60" r="51.5" strokeWidth="1.5" />
      <text fill="currentColor" stroke="none" fontWeight="800" fontSize={nameSize(name)}>
        <textPath href={`#${id}t`} startOffset="50%" textAnchor="middle">{name}</textPath>
      </text>
      {district && (
        <text fill="currentColor" stroke="none" fontWeight="700" fontSize={districtSize(district)}>
          <textPath href={`#${id}b`} startOffset="50%" textAnchor="middle">{district}</textPath>
        </text>
      )}
      {image ? (
        <>
          <clipPath id={`${id}p`}><circle cx="60" cy="60" r="28" /></clipPath>
          <image href={image} x="32" y="32" width="56" height="56" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id}p)`} />
          <circle cx="60" cy="60" r="28" strokeWidth="2" />
        </>
      ) : (
        <g transform="translate(38 38) scale(0.44)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          <path d={iconSvgPath(category)} />
        </g>
      )}
    </svg>
  )
}
