interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_PROXY_TARGET?: string
  readonly VITE_API_PROXY_STRIP_PREFIX?: string
  readonly VITE_FILE_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
