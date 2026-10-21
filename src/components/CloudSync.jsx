import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../context/app-context'
import { useAuth } from '../context/auth-context'
import { useLanguage } from '../hooks/useLanguage'
import { fetchCloudProgress, planMerge, pushProgress, removeStamp } from '../lib/cloudSync'
import ZoomDialog from './ZoomDialog'

/**
 * Signed-in sync. Renders nothing unless a dialog is needed.
 *  1. On sign-in it compares this browser's passport with the account's.
 *  2. If this browser holds stamps the account lacks, it asks before merging (union: nothing is deleted anywhere).
 *  3. Afterwards stamps / answers are kept in step both ways: changes here are pushed, and the account is re-read when
 *     the tab regains focus, so progress made on another device shows up here.
 */
export default function CloudSync() {
  const { client, user } = useAuth()
  // a fresh session (state and all) for every account that signs in
  return client && user ? <SyncSession key={user.id} client={client} /> : null
}

function SyncSession({ client }) {
  const { state, applyCloud } = useApp()
  const { t } = useLanguage()
  const [dialog, setDialog] = useState(null) // { kind: 'ask', plan } | { kind: 'done', summary } | { kind: 'error' }
  const [busy, setBusy] = useState(false)
  const [live, setLive] = useState(false)
  const known = useRef({ foods: [], quiz: [] }) // what the account holds, as far as we know
  const inFlight = useRef(false)

  const local = { foods: state.triedFoodIds, quiz: state.quizProgress.correctIds }
  const localRef = useRef(local)
  useEffect(() => {
    localRef.current = local
  })

  // 1-2: first look when someone signs in
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const cloud = await fetchCloudProgress(client)
        if (cancelled) return
        known.current = cloud
        const plan = planMerge(localRef.current, cloud)
        if (plan.needsAsk) setDialog({ kind: 'ask', plan })
        else if (!plan.needsAsk) {
          applyCloud(plan.union)
          setLive(true)
        }
      } catch {
        if (!cancelled) setDialog({ kind: 'error' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [client, applyCloud])

  const merge = useCallback(async () => {
    if (dialog?.kind !== 'ask') return
    setBusy(true)
    try {
      const { plan } = dialog
      const result = await pushProgress(client, plan.toCloud)
      known.current = plan.union
      applyCloud(plan.union)
      setLive(true)
      setDialog({
        kind: 'done',
        summary: { stamps: result.new_stamps, quiz: result.new_quiz, xp: result.xp_awarded, fromCloud: plan.toLocal.foods.length },
      })
    } catch {
      setDialog({ kind: 'error' })
    } finally {
      setBusy(false)
    }
  }, [client, dialog, applyCloud])

  const decline = useCallback(() => setDialog(null), [])

  // 3a: push local changes while live
  useEffect(() => {
    if (!live || !client || inFlight.current) return
    const k = known.current
    const addFoods = state.triedFoodIds.filter((id) => !k.foods.includes(id))
    const addQuiz = state.quizProgress.correctIds.filter((id) => !k.quiz.includes(id))
    const removed = k.foods.filter((id) => !state.triedFoodIds.includes(id))
    if (!addFoods.length && !addQuiz.length && !removed.length) return
    inFlight.current = true
    ;(async () => {
      try {
        if (addFoods.length || addQuiz.length) await pushProgress(client, { foods: addFoods, quiz: addQuiz })
        for (const id of removed) await removeStamp(client, id)
        known.current = {
          foods: [...k.foods.filter((id) => !removed.includes(id)), ...addFoods],
          quiz: [...k.quiz, ...addQuiz],
        }
      } catch {
        // offline or a blip: known stays unchanged, so the same change is retried on the next edit or focus
      } finally {
        inFlight.current = false
      }
    })()
  }, [live, client, state.triedFoodIds, state.quizProgress.correctIds])

  // 3b: pull the account's progress when the tab comes back into view
  useEffect(() => {
    if (!live || !client) return undefined
    const pull = async () => {
      if (document.visibilityState === 'hidden' || inFlight.current) return
      const l = localRef.current
      const k = known.current
      // never overwrite edits that have not reached the account yet
      if (l.foods.length !== k.foods.length || l.foods.some((id) => !k.foods.includes(id))) return
      if (l.quiz.length !== k.quiz.length || l.quiz.some((id) => !k.quiz.includes(id))) return
      try {
        const cloud = await fetchCloudProgress(client)
        known.current = cloud
        applyCloud(cloud)
      } catch {
        // try again next time
      }
    }
    document.addEventListener('visibilitychange', pull)
    window.addEventListener('focus', pull)
    return () => {
      document.removeEventListener('visibilitychange', pull)
      window.removeEventListener('focus', pull)
    }
  }, [live, client, applyCloud])

  if (!dialog) return null
  const close = () => setDialog(null)

  let body
  if (dialog.kind === 'ask') {
    const { toCloud, toLocal } = dialog.plan
    body = (
      <>
        <h2 className="text-xl font-bold text-primary">{t('sync.askTitle')}</h2>
        <p className="mt-2">{t('sync.askBody', { stamps: toCloud.foods.length, answers: toCloud.quiz.length })}</p>
        {toLocal.foods.length > 0 && <p className="mt-2">{t('sync.askAlso', { n: toLocal.foods.length })}</p>}
        <p className="mt-2 text-sm text-muted">{t('sync.askSafe')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" disabled={busy} onClick={merge} className="min-h-11 rounded-full bg-primary px-5 font-semibold text-lime disabled:opacity-60">
            {t(busy ? 'sync.merging' : 'sync.merge')}
          </button>
          <button type="button" disabled={busy} onClick={decline} className="min-h-11 rounded-full border-2 border-primary px-5 font-semibold text-primary">{t('sync.later')}</button>
        </div>
      </>
    )
  } else if (dialog.kind === 'done') {
    const s = dialog.summary
    body = (
      <>
        <h2 className="text-xl font-bold text-primary">{t('sync.doneTitle')}</h2>
        <p role="status" className="mt-2">
          {s.stamps > 0 ? t('sync.doneStamps', { n: s.stamps }) : t('sync.doneNone')}
          {s.xp > 0 && ` ${t('sync.doneXp', { xp: s.xp })}`}
        </p>
        {s.fromCloud > 0 && <p className="mt-2">{t('sync.doneFromCloud', { n: s.fromCloud })}</p>}
        <button type="button" onClick={close} className="mt-4 min-h-11 rounded-full bg-primary px-5 font-semibold text-lime">{t('common.close')}</button>
      </>
    )
  } else {
    body = (
      <>
        <h2 className="text-xl font-bold text-primary">{t('sync.errorTitle')}</h2>
        <p role="alert" className="mt-2">{t('sync.errorBody')}</p>
        <button type="button" onClick={close} className="mt-4 min-h-11 rounded-full bg-primary px-5 font-semibold text-lime">{t('common.close')}</button>
      </>
    )
  }
  return (
    <ZoomDialog label={t('sync.askTitle')} closeLabel={t('common.close')} widthClass="max-w-md" onClose={dialog.kind === 'ask' ? decline : close}>
      <div className="rounded-2xl bg-card p-6">{body}</div>
    </ZoomDialog>
  )
}
