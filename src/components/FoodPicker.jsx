import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import FoodCard from './FoodCard'
import Icon from './Icon'
import { useApp } from '../context/app-context'
import { useLanguage } from '../hooks/useLanguage'
import { filterFoods } from '../utils/search'

const DIVISIONS = ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh']

const STATUSES = [
  ['all', 'discover.statusAll'],
  ['tried', 'discover.statusTried'],
  ['notTried', 'discover.statusNotTried'],
]

export default function FoodPicker() {
  const { content, progress } = useApp()
  const { t, pick, formatNumber } = useLanguage()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const category = params.get('cat') ?? 'all'
  const status = params.get('status') ?? 'all'

  const setParam = (key, value, fallback = '') =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === fallback) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )

  const triedIds = useMemo(() => new Set(progress.triedIds), [progress.triedIds])
  const results = useMemo(
    () => filterFoods({ foods: content.foods, query, category, status, triedIds }),
    [content.foods, query, category, status, triedIds],
  )
  const groups = useMemo(
    () =>
      DIVISIONS.map((division) => ({
        division,
        foods: results
          .filter((f) => f.region?.division === division)
          .sort((x, y) => x.region.district_en.localeCompare(y.region.district_en)),
      })).filter((g) => g.foods.length > 0),
    [results],
  )
  const filtered = query !== '' || category !== 'all' || status !== 'all'

  return (
    <div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="food-search" className="block text-sm font-semibold">{t('discover.searchLabel')}</label>
          <input
            id="food-search"
            type="search"
            value={query}
            placeholder={t('discover.searchPlaceholder')}
            onChange={(e) => setParam('q', e.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-primary/30 bg-card px-3"
          />
        </div>
        <div>
          <label htmlFor="food-category" className="block text-sm font-semibold">{t('discover.category')}</label>
          <select
            id="food-category"
            value={category}
            onChange={(e) => setParam('cat', e.target.value, 'all')}
            className="mt-1 min-h-11 w-full rounded-xl border border-primary/30 bg-card px-3"
          >
            <option value="all">{t('discover.allCategories')}</option>
            {content.categories.map((c) => (
              <option key={c.id} value={c.id}>{pick(c, 'name')}</option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="mt-3 flex flex-wrap items-center gap-2">
        <legend className="mb-1 text-sm font-semibold">{t('discover.status')}</legend>
        {STATUSES.map(([value, key]) => (
          <label
            key={value}
            className={`flex min-h-11 cursor-pointer items-center rounded-full border border-primary px-4 text-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold ${status === value ? 'bg-primary text-lime' : 'bg-card'}`}
          >
            <input
              type="radio"
              name="status"
              value={value}
              checked={status === value}
              onChange={() => setParam('status', value, 'all')}
              className="sr-only"
            />
            {status === value && <Icon name="check" className="mr-1 inline size-[1em] align-[-0.125em]" />}
            {t(key)}
          </label>
        ))}
      </fieldset>

      <p role="status" className="mt-4 text-sm text-muted">
        {t('discover.count', { n: formatNumber(results.length) })}
      </p>

      {results.length === 0 ? (
        <div className="card-soft mt-4 p-6 text-center">
          <p>{t('discover.empty')}</p>
          {filtered && (
            <button
              type="button"
              onClick={() => setParams({}, { replace: true })}
              className="mt-3 min-h-11 rounded-full bg-primary px-5 text-lime"
            >
              {t('discover.clear')}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-8">
          {groups.map(({ division, foods }) => (
            <section key={division} aria-labelledby={`div-${division}`}>
              <h3 id={`div-${division}`} className="flex items-baseline gap-2 border-b border-primary/20 pb-1 text-xl font-bold text-primary">
                {t(`division.${division}`)}
                <span className="text-sm font-normal text-muted">({formatNumber(foods.length)})</span>
              </h3>
              <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {foods.map((food) => (
                  <li key={food.id}><FoodCard food={food} as="h4" /></li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
