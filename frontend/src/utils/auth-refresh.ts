export const ACCESS_TOKEN_STORAGE_KEY = 'token'
export const REFRESH_TOKEN_STORAGE_KEY = 'refreshToken'

export interface AuthTokens {
  token: string
  refreshToken: string
}

export interface RefreshDecisionInput {
  status?: number
  url?: string
  retry?: boolean
  hasRefreshToken: boolean
}

function getStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage
}

export function getAccessToken() {
  return getStorage()?.getItem(ACCESS_TOKEN_STORAGE_KEY) || ''
}

export function getRefreshToken() {
  return getStorage()?.getItem(REFRESH_TOKEN_STORAGE_KEY) || ''
}

export function setAuthTokens(tokens: AuthTokens) {
  const storage = getStorage()
  if (!storage) return

  storage.setItem(ACCESS_TOKEN_STORAGE_KEY, tokens.token)
  storage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refreshToken)
}

export function clearAuthTokens() {
  const storage = getStorage()
  if (!storage) return

  storage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  storage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
}

export function shouldRefreshAccessToken(input: RefreshDecisionInput) {
  if (input.status !== 401) return false
  if (input.retry) return false
  if (!input.hasRefreshToken) return false

  const url = input.url || ''
  if (url.includes('/auth/refresh')) return false
  if (url.includes('/auth/login')) return false

  return true
}
