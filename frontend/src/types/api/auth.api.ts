// ==================== 认证 API 类型 ====================
import type { User } from '@/types';

/**
 * 登录请求参数
 */
export interface LoginParams {
  username: string;
  password: string;
}

/**
 * 注册请求参数
 */
export interface RegisterParams {
  username: string;
  password: string;
  email?: string;
  name?: string;
}

/**
 * 刷新令牌请求参数
 */
export interface RefreshTokenParams {
  refreshToken: string;
}

/**
 * 认证响应数据
 */
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

/**
 * 认证 API 命名空间
 */
export namespace AuthApi {
  /** 登录 */
  export type Login = AuthResponse;
  /** 注册 */
  export type Register = AuthResponse;
  /** 刷新令牌 */
  export type Refresh = AuthResponse;
  /** 获取当前用户 */
  export type GetCurrentUser = User;
}
