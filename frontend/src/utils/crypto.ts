import forge from 'node-forge'
import api from '@/api/request'

/**
 * 登录密码 RSA 加密工具
 *
 * 流程：
 *  1. 首次调用时拉取 /auth/public-key 获取后端 RSA 公钥并缓存（默认 10 分钟）
 *  2. 拼接 `${password}::${timestamp}` 后用 RSA-OAEP-SHA256 加密为 base64
 *  3. 服务端解密后会校验 timestamp 在 5 分钟内，防止重放
 */

interface PublicKeyResponse {
  publicKey: string
  timestamp: number
}

interface CachedKey {
  publicKey: string
  /** 客户端本地过期时间戳 */
  expiresAt: number
}

const CACHE_TTL_MS = 10 * 60 * 1000
let cached: CachedKey | null = null
let pending: Promise<string> | null = null

async function fetchPublicKey(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) {
    return cached.publicKey
  }
  if (!pending) {
    pending = api
      .get<PublicKeyResponse>('/auth/public-key')
      .then((res) => {
        cached = {
          publicKey: res.publicKey,
          expiresAt: Date.now() + CACHE_TTL_MS,
        }
        return res.publicKey
      })
      .finally(() => {
        pending = null
      })
  }
  return pending
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s/g, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

async function encryptWithWebCrypto(publicKey: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(publicKey),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  )
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    key,
    new TextEncoder().encode(payload),
  )
  return arrayBufferToBase64(encrypted)
}

function encryptWithForge(publicKey: string, payload: string): string {
  const key = forge.pki.publicKeyFromPem(publicKey)
  const encrypted = key.encrypt(forge.util.encodeUtf8(payload), 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: {
      md: forge.md.sha256.create(),
    },
  })
  return forge.util.encode64(encrypted)
}

/**
 * RSA-OAEP-SHA256 加密登录密码
 * @param plain 明文密码
 * @returns base64 密文
 */
export async function encryptPassword(plain: string): Promise<string> {
  const publicKey = await fetchPublicKey()
  const payload = `${plain}::${Date.now()}`
  if (globalThis.crypto?.subtle) {
    return encryptWithWebCrypto(publicKey, payload)
  }
  return encryptWithForge(publicKey, payload)
}

/** 测试用：清除本地缓存（例如服务端密钥轮换） */
export function clearPublicKeyCache(): void {
  cached = null
}
