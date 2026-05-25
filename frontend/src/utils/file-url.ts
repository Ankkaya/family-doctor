function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function getFileBaseUrl(): string {
  const explicitBase = import.meta.env.VITE_FILE_BASE_URL
  if (explicitBase) {
    return trimTrailingSlash(explicitBase)
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL
  if (apiBase && /^https?:\/\//i.test(apiBase)) {
    return trimTrailingSlash(apiBase.replace(/\/api\/?$/i, ''))
  }

  const proxyTarget = import.meta.env.VITE_API_PROXY_TARGET
  if (proxyTarget) {
    return trimTrailingSlash(proxyTarget)
  }

  return window.location.origin
}

export function resolveFileUrl(url?: string | null): string {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  const baseUrl = getFileBaseUrl()
  if (url.startsWith('/')) return `${baseUrl}${url}`
  return `${baseUrl}/${url}`
}

export function extractFileObjectKey(url?: string | null): string {
  if (!url) return ''

  try {
    const parsed = /^https?:\/\//i.test(url)
      ? new URL(url)
      : new URL(url, window.location.origin)
    const filename = parsed.searchParams.get('filename')
    return filename ? decodeURIComponent(filename) : url
  } catch {
    return url
  }
}
