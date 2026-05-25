import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosRequestConfig } from 'axios'
import type { ApiResponse, AuthResponse } from '@/types/api/index.ts'
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  shouldRefreshAccessToken,
} from '@/utils/auth-refresh'

// ==================== 自定义 Axios 实例类型 ====================
/**
 * 自定义 API 客户端接口
 * 
 * 后端返回标准格式: ApiResponse<T> = { code, message, data }
 * 响应拦截器会自动解包，返回 data 部分
 * 因此泛型参数 T 直接对应 data 的类型
 */
export interface ApiClient {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>
}

// ==================== 创建 Axios 实例 ====================
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const instance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

const refreshInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let refreshRequest: Promise<AuthResponse> | null = null

function redirectToLogin() {
  clearAuthTokens()
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

async function requestFreshTokens() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('Missing refresh token')
  }

  if (!refreshRequest) {
    refreshRequest = refreshInstance
      .post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken })
      .then((response) => {
        const tokens = response.data.data
        if (!tokens?.token || !tokens.refreshToken) {
          throw new Error('Invalid refresh token response')
        }
        setAuthTokens(tokens)
        return tokens
      })
      .finally(() => {
        refreshRequest = null
      })
  }

  return refreshRequest
}

// ==================== 请求拦截器 ====================
instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// ==================== 响应拦截器 ====================
instance.interceptors.response.use(
  (response): any => {
    const data = response.data as ApiResponse<unknown>

    // 标准格式 { code, message, data }，直接解包 data
    if (data && typeof data === 'object' && 'data' in data) {
      return data.data
    }

    // 非标准格式，直接返回原始数据（兼容旧接口）
    return data
  },
  async (error) => {
    const { response, config } = error
    let errorMessage = '请求失败'
    const requestConfig = config as RetriableRequestConfig | undefined
    const refreshToken = getRefreshToken()

    if (
      response &&
      requestConfig &&
      shouldRefreshAccessToken({
        status: response.status,
        url: requestConfig.url,
        retry: requestConfig._retry,
        hasRefreshToken: !!refreshToken,
      })
    ) {
      requestConfig._retry = true

      try {
        const tokens = await requestFreshTokens()
        requestConfig.headers.Authorization = `Bearer ${tokens.token}`
        return instance.request(requestConfig)
      } catch (refreshError) {
        redirectToLogin()
        return Promise.reject({ message: '登录已过期', originalError: refreshError })
      }
    }
    
    // 处理HTTP错误
    if (response) {
      // 优先按 HTTP 状态码处理（特别是 401 需要触发跳转）
      switch (response.status) {
        case 401:
          redirectToLogin()
          errorMessage = response.data?.message || '登录已过期'
          break
        case 403:
          errorMessage = response.data?.message || '没有权限'
          break
        case 404:
          errorMessage = response.data?.message || '请求的资源不存在'
          break
        case 500:
          errorMessage = response.data?.message || '服务器错误'
          break
        default:
          errorMessage = response.data?.message || '请求失败'
      }
    } else {
      errorMessage = '网络连接异常'
    }
    
    return Promise.reject({ message: errorMessage, originalError: error })
  }
)

// ==================== 导出带类型的 API 客户端 ====================
const api = instance as unknown as ApiClient
export default api
