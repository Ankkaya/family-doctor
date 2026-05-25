import api from './request'
import type {
  UserApi,
  QueryUserParams,
  CreateUserParams,
  UpdateUserParams,
  ResetUserPasswordParams,
  AssignUserRolesParams,
  BatchDeleteUsersParams,
} from '@/types/api/index.ts'

// 获取用户列表
export const getUsers = async (params?: QueryUserParams) => {
  const data = await api.get<Record<string, unknown> | unknown[]>('/users', { params })
  if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.items)) {
    return data as unknown as UserApi.List
  }
  if (Array.isArray(data)) {
    const page = params?.page ?? 1
    const pageSize = params?.pageSize ?? data.length
    return { items: data, total: data.length, page, pageSize } as UserApi.List
  }
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 10
  return { items: [], total: 0, page, pageSize } as UserApi.List
}

// 获取当前登录用户
export const getCurrentUser = () => {
  return api.get<UserApi.Current>('/users/me')
}

// 获取单个用户
export const getUser = (id: number) => {
  return api.get<UserApi.Detail>(`/users/${id}`)
}

// 创建用户
export const createUser = (data: CreateUserParams) => {
  return api.post<UserApi.Create>('/users', data)
}

// 更新用户
export const updateUser = (id: number, data: UpdateUserParams) => {
  return api.patch<UserApi.Update>(`/users/${id}`, data)
}

// 重置用户密码
export const resetUserPassword = (id: number, data: ResetUserPasswordParams) => {
  return api.patch<UserApi.ResetPassword>(`/users/${id}/password`, data)
}

// 删除用户
export const deleteUser = (id: number) => {
  return api.delete<UserApi.Delete>(`/users/${id}`)
}

export const batchDeleteUsers = (ids: number[]) => {
  const data: BatchDeleteUsersParams = { ids }
  return api.delete<UserApi.BatchDelete>('/users/batch', { data })
}

// 获取用户角色
export const getUserRoles = (userId: number) => {
  return api.get<UserApi.GetRoles>(`/users/${userId}/roles`)
}

// 分配用户角色
export const assignUserRoles = (userId: number, roleIds: number[]) => {
  const data: AssignUserRolesParams = { roleIds }
  return api.patch<UserApi.AssignRoles>(`/users/${userId}/roles`, data)
}

// 获取用户菜单
export const getUserMenus = (userId: number, format?: 'tree' | 'flat') => {
  return api.get<UserApi.GetMenus>(`/users/${userId}/menus`, { params: { format } })
}
