import { expect, test } from 'vitest'
import { cloudConfigured, loadCloudClient, redirectUrl } from './supabase'

const env = { VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' }

test('the cloud is on only when both the URL and the publishable key are set', () => {
  expect(cloudConfigured({})).toBe(false)
  expect(cloudConfigured({ VITE_SUPABASE_URL: 'https://abc.supabase.co' })).toBe(false)
  expect(cloudConfigured({ VITE_SUPABASE_PUBLISHABLE_KEY: 'k' })).toBe(false)
  expect(cloudConfigured(env)).toBe(true)
})

test('without configuration there is no client and nothing is loaded', async () => {
  expect(await loadCloudClient({})).toBeNull()
})

test('with configuration a client is created that uses the PKCE email-link flow', async () => {
  const client = await loadCloudClient(env)
  expect(typeof client.auth.signInWithOtp).toBe('function')
  expect(typeof client.rpc).toBe('function')
})

test('the email link returns to the site root under whatever sub-path it is hosted', () => {
  expect(redirectUrl({ origin: 'https://luminous.github.io' }, '/food-passport-bangladesh/')).toBe('https://luminous.github.io/food-passport-bangladesh/')
  expect(redirectUrl({ origin: 'http://localhost:5173' }, '/')).toBe('http://localhost:5173/')
})
