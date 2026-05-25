// ==================== 菜单 API 类型 ====================
import type { Menu } from '@/types';
import type { TreeQueryParams } from './common.api';

/**
 * 创建菜单请求参数
 */
export interface CreateMenuParams {
  name: string;
  path?: string;
  icon?: string;
  iconUrl?: string;
  component?: string;
  redirect?: string;
  permission?: string;
  parentId?: number;
  order?: number;
  hidden?: boolean;
  type?: 'menu' | 'button' | 'iframe';
}

/**
 * 更新菜单请求参数
 */
export interface UpdateMenuParams extends Partial<CreateMenuParams> {}

/**
 * 查询菜单参数
 */
export interface QueryMenuParams extends TreeQueryParams {}

export interface BatchDeleteMenusParams {
  ids: number[];
}

/**
 * 菜单 API 命名空间
 */
export namespace MenuApi {
  /** 获取菜单列表（树形或扁平） */
  export type List = Menu[];
  /** 获取单个菜单 */
  export type Detail = Menu;
  /** 创建菜单 */
  export type Create = Menu;
  /** 更新菜单 */
  export type Update = Menu;
  /** 删除菜单 */
  export type Delete = void;
  /** 批量删除菜单 */
  export type BatchDelete = { count: number; ids: number[] };
}
