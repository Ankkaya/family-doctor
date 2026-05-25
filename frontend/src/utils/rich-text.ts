import { resolveFileUrl } from './file-url'

const FILE_URL_PATTERN = /^(\/)?api\/files\/preview\?/i

export function normalizeRichTextHtml(html?: string | null): string {
  if (!html) {
    return ''
  }

  return html.replace(/(<(?:img|source)\b[^>]*?\s(?:src|data-src)=["'])([^"']+)(["'][^>]*>)/gi, (_match, prefix, url, suffix) => {
    if (!FILE_URL_PATTERN.test(url)) {
      return `${prefix}${url}${suffix}`
    }

    const normalizedUrl = url.startsWith('/') ? url : `/${url}`
    return `${prefix}${resolveFileUrl(normalizedUrl)}${suffix}`
  })
}
