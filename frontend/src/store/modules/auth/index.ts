import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, Menu } from '@/types'
import { login as loginApi, register as registerApi, getCurrentUser } from '@/api/auth'
import { getUserMenus } from '@/api/user'
import router from '@/router'
import { encryptPassword } from '@/utils/crypto'
import { clearAuthTokens, getAccessToken, setAuthTokens } from '@/utils/auth-refresh'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getAccessToken())
  const user = ref<User | null>(null)
  const menus = ref<Menu[]>([])
  const loading = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.roles?.some(role => role.code === 'admin') ?? false)

  const flattenMenus = (list: Menu[] = menus.value): Menu[] => {
    return list.flatMap(menu => [
      menu,
      ...(menu.children?.length ? flattenMenus(menu.children) : [])
    ])
  }

  const menuPermissions = computed(() => {
    const permissionSet = new Set<string>()
    for (const menu of flattenMenus()) {
      if (menu.permission) {
        permissionSet.add(menu.permission)
      }
      if (menu.path) {
        permissionSet.add(menu.path)
      }
    }
    return permissionSet
  })

  const menuPaths = computed(() => {
    const pathSet = new Set<string>(['/dashboard'])
    for (const menu of flattenMenus()) {
      if (menu.path && menu.type !== 'button') {
        pathSet.add(menu.path)
      }
    }
    return pathSet
  })

  const hasPermission = (permission?: string | string[]) => {
    if (!permission) return true
    if (isAdmin.value) return true

    const permissions = Array.isArray(permission) ? permission : [permission]
    return permissions.every(item => menuPermissions.value.has(item))
  }

  const canAccessMenuPath = (path: string) => {
    if (path === '/dashboard') return true
    if (isAdmin.value) return true
    return menuPaths.value.has(path)
  }

  const findMenuTrail = (path: string) => {
    const walk = (list: Menu[], parents: Menu[] = []): Menu[] => {
      for (const menu of list) {
        if (menu.type === 'button') {
          continue
        }

        const nextParents = [...parents, menu]
        if (menu.path === path) {
          return nextParents
        }

        if (menu.children?.length) {
          const found = walk(menu.children, nextParents)
          if (found.length) {
            return found
          }
        }
      }
      return []
    }

    return walk(menus.value)
  }

  // 登录（密码使用 RSA 公钥加密后传输）
  const login = async (username: string, password: string) => {
    loading.value = true
    try {
      const cipher = await encryptPassword(password)
      const res = await loginApi({ username, password: cipher })
      token.value = res.token
      user.value = res.user
      setAuthTokens({ token: res.token, refreshToken: res.refreshToken })
      await fetchMenus()
      return true
    } catch (error) {
      return false
    } finally {
      loading.value = false
    }
  }

  // 注册（注册接口暂未启用 RSA 加密，沿用明文）
  const register = async (username: string, password: string, name?: string) => {
    loading.value = true
    try {
      const res = await registerApi({ username, password, name })
      token.value = res.token
      user.value = res.user
      setAuthTokens({ token: res.token, refreshToken: res.refreshToken })
      await fetchMenus()
      return true
    } catch (error) {
      return false
    } finally {
      loading.value = false
    }
  }

  // 获取当前用户信息
  const fetchUser = async () => {
    if (!token.value) return
    try {
      const res = await getCurrentUser()
      token.value = getAccessToken()
      user.value = res
    } catch (error) {
      logout()
    }
  }

  // 获取当前用户菜单
  const fetchMenus = async () => {
    if (!user.value) return
    try {
      const res = await getUserMenus(user.value.id)
      menus.value = res
    } catch (error) {
      console.error('获取菜单失败')
    }
  }

  // 登出
  const logout = () => {
    token.value = ''
    user.value = null
    menus.value = []
    clearAuthTokens()
    router.push('/login')
  }

  // 初始化
  const init = async () => {
    if (token.value) {
      await fetchUser()
      await fetchMenus()
    }
  }

  return {
    token,
    user,
    menus,
    loading,
    isLoggedIn,
    isAdmin,
    menuPermissions,
    menuPaths,
    hasPermission,
    canAccessMenuPath,
    findMenuTrail,
    login,
    register,
    fetchUser,
    fetchMenus,
    logout,
    init
  }
})
