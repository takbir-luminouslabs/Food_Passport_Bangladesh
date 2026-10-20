import { createInitialState, sanitizeState } from './state'

export const STORAGE_KEY = 'food-passport-bangladesh:v1'
const APP_ID = 'food-passport-bangladesh'

const defaultStorage = () => {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

/** Load the guest passport. Never throws; corrupt data is backed up and replaced by a fresh passport. */
export function loadState(storage = defaultStorage()) {
  let raw = null
  try {
    raw = storage?.getItem(STORAGE_KEY) ?? null
  } catch {
    return createInitialState()
  }
  if (raw === null) return createInitialState()

  let state = null
  try {
    state = sanitizeState(JSON.parse(raw))
  } catch {
    state = null
  }
  if (state) return state

  try {
    storage.setItem(`${STORAGE_KEY}:corrupt`, raw)
  } catch {
    // best effort only
  }
  return createInitialState()
}

/** Returns true if the state was persisted. */
export function saveState(state, storage = defaultStorage()) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

/** Clear all progress, keeping only the language choice. Caller must have confirmed with the user. */
export function resetState(storage = defaultStorage(), language = 'bn') {
  const fresh = createInitialState(language)
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  saveState(fresh, storage)
  return fresh
}

export const exportState = (state) =>
  JSON.stringify({ app: APP_ID, exportedAt: new Date().toISOString(), data: state }, null, 2)

export function importState(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Not a valid backup file.' }
  }
  if (parsed?.app !== APP_ID) return { ok: false, error: 'This file is not a Food Passport backup.' }
  const state = sanitizeState(parsed.data)
  if (!state) return { ok: false, error: 'This backup is corrupted or from an unsupported version.' }
  return { ok: true, state }
}
