// ==================== 用户 API 类型 ====================
import type { User, Role, Menu } from '@/types';
import type { PageData } from '@/types';
import type { PaginationParams } from './common.api';

/**
 * 创建用户请求参数
 */
export interface CreateUserParams {
  username: string;
  password: string;
  email?: string;
  avatarUrl?: string | null;
  name?: string;
}

/**
 * 更新用户请求参数
 */
export interface UpdateUserParams {
  email?: string;
  avatarUrl?: string | null;
  password?: string;
  name?: string;
}

/**
 * 重置用户密码请求参数
 */
export interface ResetUserPasswordParams {
  password: string;
}

/**
 * 分配用户角色请求参数
 */
export interface AssignUserRolesParams {
  roleIds: number[];
}

export interface BatchDeleteUsersParams {
  ids: number[];
}

/**
 * 查询用户列表参数
 */
export interface QueryUserParams extends PaginationParams {}

/**
 * 用户 API 命名空间
 */
export namespace UserApi {
  /** 获取用户列表 */
  export type List = PageData<User>;
  /** 获取当前登录用户 */
  export type Current = User;
  /** 获取单个用户 */
  export type Detail = User;
  /** 创建用户 */
  export type Create = User;
  /** 更新用户 */
  export type Update = User;
  /** 重置用户密码 */
  export type ResetPassword = User;
  /** 删除用户 */
  export type Delete = void;
  /** 批量删除用户 */
  export type BatchDelete = { count: number; ids: number[] };
  /** 获取用户角色 */
  export type GetRoles = Role[];
  /** 分配用户角色 */
  export type AssignRoles = void;
  /** 获取用户菜单 */
  export type GetMenus = Menu[];
}
