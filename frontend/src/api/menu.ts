import api from './request'
import type { MenuApi, CreateMenuParams, UpdateMenuParams, QueryMenuParams, BatchDeleteMenusParams } from '@/types/api/index.ts'

// 获取菜单列表
// format: 'tree' | 'flat' - tree: 树形结构(默认), flat: 扁平列表
export const getMenus = (format?: QueryMenuParams['format']) => {
  return api.get<MenuApi.List>('/menus', { params: { format } })
}

// 获取菜单列表（扁平）- 兼容旧方法，建议使用 getMenus('flat')
export const getMenusFlat = () => {
  return api.get<MenuApi.List>('/menus', { params: { format: 'flat' } })
}

// 获取单个菜单
export const getMenu = (id: number) => {
  return api.get<MenuApi.Detail>(`/menus/${id}`)
}

// 创建菜单
export const createMenu = (data: CreateMenuParams) => {
  return api.post<MenuApi.Create>('/menus', data)
}

// 更新菜单
export const updateMenu = (id: number, data: UpdateMenuParams) => {
  return api.patch<MenuApi.Update>(`/menus/${id}`, data)
}

// 删除菜单
export const deleteMenu = (id: number) => {
  return api.delete<MenuApi.Delete>(`/menus/${id}`)
}

export const batchDeleteMenus = (ids: number[]) => {
  const data: BatchDeleteMenusParams = { ids }
  return api.delete<MenuApi.BatchDelete>('/menus/batch', { data })
}

// 根据角色获取菜单 - 已迁移到 roles.ts，保留别名以兼容旧代码
export const getMenusByRole = (roleId: number, format?: QueryMenuParams['format']) => {
  return api.get<MenuApi.List>(`/roles/${roleId}/menus`, { params: { format } })
}

// 根据用户获取菜单 - 已迁移到 users.ts，保留别名以兼容旧代码
export const getMenusByUser = (userId: number, format?: QueryMenuParams['format']) => {
  return api.get<MenuApi.List>(`/users/${userId}/menus`, { params: { format } })
}
