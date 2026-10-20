import { iconSvgPath } from '../utils/stampIcons'

/**
 * One consistent line-icon set (the same art as the stamps), drawn in the text colour. Decorative: always pair it
 * with a text label or an aria-label on its button. `name` is an interface icon or a food category id.
 */
export default function Icon({ name, className = 'size-[1em]', strokeWidth = 7 }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={iconSvgPath(name)} />
    </svg>
  )
}
