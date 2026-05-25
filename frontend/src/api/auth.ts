import api from './request'
import type {
  AuthApi,
  LoginParams,
  RegisterParams,
  RefreshTokenParams,
} from '@/types/api/index.ts'

// 登录
export const login = (data: LoginParams) => {
  return api.post<AuthApi.Login>('/auth/login', data)
}

// 注册
export const register = (data: RegisterParams) => {
  return api.post<AuthApi.Register>('/auth/register', data)
}

// 刷新令牌
export const refreshToken = (data: RefreshTokenParams) => {
  return api.post<AuthApi.Refresh>('/auth/refresh', data)
}

// 获取当前用户
export const getCurrentUser = () => {
  return api.get<AuthApi.GetCurrentUser>('/auth/me')
}
