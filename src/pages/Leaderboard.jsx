import { useCallback, useEffect, useState } from 'react'
import AccountDialog from '../components/AccountDialog'
import { useAuth } from '../context/auth-context'
import { useLanguage } from '../hooks/useLanguage'
import { levelForXp } from '../utils/xp'
import ComingSoon from './ComingSoon'

const PAGE = 50

/** Community progress ranking: only people who opted in, public name + XP + level + stamps, never an email or account id. */
export default function Leaderboard() {
  const { enabled, ready, client, user } = useAuth()
  if (!ready) return null
  if (!enabled) return <ComingSoon titleKey="nav.leaderboard" />
  return <Board client={client} user={user} />
}

function Board({ client, user }) {
  const { t, language, formatNumber } = useLanguage()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('loading') // loading | ready | error | more
  const [mine, setMine] = useState(null)
  const [account, setAccount] = useState(false)
  const [reports, setReports] = useState({}) // public_id -> 'asking' | 'sent' | 'failed'

  const load = useCallback(
    async (offset) => {
      try {
        const { data, error } = await client.rpc('get_leaderboard', { p_limit: PAGE, p_offset: offset })
        if (error) throw error
        setRows((prev) => (offset === 0 ? data.rows : [...prev, ...data.rows]))
        setTotal(data.total)
        setStatus('ready')
      } catch {
        setStatus('error')
      }
    },
    [client],
  )

  useEffect(() => {
    // initial fetch; the state it sets is the result of an external call, not derived data
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(0)
  }, [load])

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    client.rpc('my_leaderboard_rank').then(({ data }) => { if (!cancelled && data) setMine(data) }, () => {})
    return () => {
      cancelled = true
    }
  }, [client, user])

  const report = async (publicId) => {
    const { error } = await client.rpc('report_display_name', { p_public_id: publicId })
    setReports((r) => ({ ...r, [publicId]: error ? 'failed' : 'sent' }))
  }

  const youLine = !user ? (
    <button type="button" onClick={() => setAccount(true)} className="min-h-11 rounded-full bg-primary px-5 font-semibold text-lime">{t('lb.signIn')}</button>
  ) : mine?.rank ? (
    <>
      <p>{t(mine.on_board ? 'lb.youOn' : 'lb.youWould', { rank: formatNumber(mine.rank), xp: formatNumber(mine.xp) })}</p>
      {!mine.on_board && (
        <button type="button" onClick={() => setAccount(true)} className="mt-2 min-h-11 rounded-full bg-primary px-5 font-semibold text-lime">{t('lb.join')}</button>
      )}
    </>
  ) : (
    <p>{t('lb.noXp')}</p>
  )

  return (
    <section aria-labelledby="lb-title">
      <h1 id="lb-title" className="text-2xl font-bold text-primary">{t('nav.leaderboard')}</h1>
      <p className="mt-1 max-w-2xl">{t('lb.lead')}</p>
      <p className="mt-1 max-w-2xl text-sm text-muted">{t('lb.rules')}</p>
      <div className="card-soft mt-4 p-4" aria-label={t('lb.you')}>{youLine}</div>

      {status === 'loading' && <p role="status" className="mt-6">{t('common.loading')}</p>}
      {status === 'error' && (
        <div role="alert" className="mt-6">
          <p>{t('lb.error')}</p>
          <button type="button" onClick={() => { setStatus('loading'); load(0) }} className="mt-2 min-h-11 rounded-full bg-primary px-5 text-lime">{t('common.retry')}</button>
        </div>
      )}
      {status === 'ready' && rows.length === 0 && <p className="mt-6">{t('lb.empty')}</p>}

      {rows.length > 0 && (
        <ol className="mt-4 grid gap-2">
          {rows.map((r) => {
            const lv = levelForXp(r.xp)
            const state = reports[r.public_id]
            return (
              <li key={r.public_id} aria-current={r.is_me ? 'true' : undefined} className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border px-4 py-3 ${r.is_me ? 'border-primary bg-lime/30' : 'border-primary/15 bg-card'}`}>
                <span className="w-10 text-lg font-bold text-primary" aria-label={t('lb.rank', { rank: formatNumber(r.rank) })}>{formatNumber(r.rank)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-bold">{r.display_name}{r.is_me && <span className="ml-2 text-xs font-semibold text-muted">({t('lb.me')})</span>}</span>
                  <span className="block text-xs text-muted">{t('lb.level', { n: lv.level })} · {language === 'bn' ? lv.name_bn : lv.name_en}</span>
                </span>
                <span className="text-right">
                  <span className="block font-bold text-primary">{t('lb.xp', { xp: formatNumber(r.xp) })}</span>
                  <span className="block text-xs text-muted">{t('lb.stamps', { n: formatNumber(r.stamps) })}</span>
                </span>
                {user && !r.is_me && (
                  <span className="basis-full text-right text-xs">
                    {state === 'sent' ? (
                      <span role="status">{t('lb.reported')}</span>
                    ) : state === 'asking' || state === 'failed' ? (
                      <>
                        {t('lb.reportAsk')}{' '}
                        <button type="button" onClick={() => report(r.public_id)} className="min-h-11 px-2 font-semibold underline">{t('lb.reportYes')}</button>
                        <button type="button" onClick={() => setReports((x) => ({ ...x, [r.public_id]: undefined }))} className="min-h-11 px-2 underline">{t('auth.cancel')}</button>
                        {state === 'failed' && <span role="alert">{t('lb.reportFailed')}</span>}
                      </>
                    ) : (
                      <button type="button" onClick={() => setReports((x) => ({ ...x, [r.public_id]: 'asking' }))} className="min-h-11 px-2 text-muted underline">
                        {t('lb.report')}<span className="sr-only"> {r.display_name}</span>
                      </button>
                    )}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      )}
      {rows.length > 0 && rows.length < total && (
        <button type="button" onClick={() => load(rows.length)} className="mt-4 min-h-11 rounded-full border-2 border-primary px-6 font-semibold text-primary">{t('lb.more')}</button>
      )}
      {account && <AccountDialog onClose={() => setAccount(false)} />}
    </section>
  )
}
