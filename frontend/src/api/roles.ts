import api from './request'
import type { RoleApi, CreateRoleParams, UpdateRoleParams, AssignRoleMenusParams, BatchDeleteRolesParams } from '@/types/api/index.ts'

// 获取角色列表
export const getRoles = () => {
  return api.get<RoleApi.List>('/roles')
}

// 获取单个角色
export const getRole = (id: number) => {
  return api.get<RoleApi.Detail>(`/roles/${id}`)
}

// 创建角色
export const createRole = (data: CreateRoleParams) => {
  return api.post<RoleApi.Create>('/roles', data)
}

// 更新角色
export const updateRole = (id: number, data: UpdateRoleParams) => {
  return api.patch<RoleApi.Update>(`/roles/${id}`, data)
}

// 删除角色
export const deleteRole = (id: number) => {
  return api.delete<RoleApi.Delete>(`/roles/${id}`)
}

export const batchDeleteRoles = (ids: number[]) => {
  const data: BatchDeleteRolesParams = { ids }
  return api.delete<RoleApi.BatchDelete>('/roles/batch', { data })
}

// 获取角色菜单
export const getRoleMenus = (roleId: number, format?: 'tree' | 'flat') => {
  return api.get<RoleApi.GetMenus>(`/roles/${roleId}/menus`, { params: { format } })
}

// 为角色分配菜单
export const assignRoleMenus = (roleId: number, menuIds: number[]) => {
  const data: AssignRoleMenusParams = { menuIds }
  return api.patch<RoleApi.AssignMenus>(`/roles/${roleId}/menus`, data)
}
