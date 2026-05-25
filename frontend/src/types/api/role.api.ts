// ==================== 角色 API 类型 ====================
import type { Role, Menu } from '@/types';

/**
 * 创建角色请求参数
 */
export interface CreateRoleParams {
  name: string;
  code: string;
  description?: string;
  menuIds?: number[];
}

/**
 * 更新角色请求参数
 */
export interface UpdateRoleParams {
  name?: string;
  code?: string;
  description?: string;
  menuIds?: number[];
}

/**
 * 分配角色菜单请求参数
 */
export interface AssignRoleMenusParams {
  menuIds: number[];
}

export interface BatchDeleteRolesParams {
  ids: number[];
}

/**
 * 角色 API 命名空间
 */
export namespace RoleApi {
  /** 获取角色列表 */
  export type List = Role[];
  /** 获取单个角色 */
  export type Detail = Role;
  /** 创建角色 */
  export type Create = Role;
  /** 更新角色 */
  export type Update = Role;
  /** 删除角色 */
  export type Delete = void;
  /** 批量删除角色 */
  export type BatchDelete = { count: number; ids: number[] };
  /** 获取角色菜单 */
  export type GetMenus = Menu[];
  /** 分配角色菜单 */
  export type AssignMenus = void;
}
