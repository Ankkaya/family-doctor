import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  shouldRefreshAccessToken,
} from './auth-refresh.ts'

function createStorage() {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  }
}

test('stores and clears access and refresh tokens together', () => {
  globalThis.localStorage = createStorage()

  setAuthTokens({ token: 'access-token', refreshToken: 'refresh-token' })

  assert.equal(getAccessToken(), 'access-token')
  assert.equal(getRefreshToken(), 'refresh-token')

  clearAuthTokens()

  assert.equal(getAccessToken(), '')
  assert.equal(getRefreshToken(), '')
})

test('refreshes only one unauthenticated business request', () => {
  assert.equal(
    shouldRefreshAccessToken({
      status: 401,
      url: '/users',
      retry: false,
      hasRefreshToken: true,
    }),
    true,
  )
  assert.equal(
    shouldRefreshAccessToken({
      status: 401,
      url: '/users',
      retry: true,
      hasRefreshToken: true,
    }),
    false,
  )
  assert.equal(
    shouldRefreshAccessToken({
      status: 401,
      url: '/auth/refresh',
      retry: false,
      hasRefreshToken: true,
    }),
    false,
  )
  assert.equal(
    shouldRefreshAccessToken({
      status: 401,
      url: '/users',
      retry: false,
      hasRefreshToken: false,
    }),
    false,
  )
})
