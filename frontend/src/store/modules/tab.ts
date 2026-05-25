import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'

export interface Tab {
  key: string
  title: string
  name: string
  fixed?: boolean
  query?: Record<string, any>
  params?: Record<string, any>
}

export const useTabStore = defineStore('tab', () => {
  // State
  const tabs = ref<Tab[]>([
    {
      key: '/dashboard',
      title: '首页',
      name: 'dashboard',
      fixed: true
    }
  ])
  const activeTab = ref('/dashboard')

  // Getters
  const cachedViews = computed(() => {
    // 返回需要缓存的组件名，排除需要刷新的
    return tabs.value
      .filter(tab => !tab.fixed && !excludeCache.value.includes(tab.name))
      .map(tab => tab.name)
      .filter(Boolean) as string[]
  })

  const fixedTabs = computed(() => tabs.value.filter(tab => tab.fixed))
  const unfixedTabs = computed(() => tabs.value.filter(tab => !tab.fixed))

  // Actions
  const addTab = (route: RouteLocationNormalized) => {
    // 跳过隐藏路由（如 redirect）
    if (route.meta?.hidden) {
      return
    }

    const key = route.fullPath
    const title = (route.meta?.title as string) || '未命名'
    const name = route.name as string

    // 如果已存在，只更新激活状态
    const existIndex = tabs.value.findIndex(tab => tab.key === key)
    if (existIndex >= 0) {
      activeTab.value = key
      // 更新标题（可能动态变化）
      if (tabs.value[existIndex].title !== title) {
        tabs.value[existIndex].title = title
      }
      return
    }

    // 添加新标签
    tabs.value.push({
      key,
      title,
      name,
      fixed: route.path === '/dashboard',
      query: { ...route.query },
      params: { ...route.params }
    })
    activeTab.value = key
  }

  const removeTab = (key: string) => {
    const index = tabs.value.findIndex(tab => tab.key === key)
    if (index < 0) return

    const tab = tabs.value[index]
    // 固定标签不能关闭
    if (tab.fixed) return

    tabs.value.splice(index, 1)

    // 如果关闭的是当前激活的标签，需要激活其他标签
    if (activeTab.value === key) {
      // 优先激活左侧标签
      const newActive = tabs.value[index - 1] || tabs.value[index] || tabs.value[0]
      if (newActive) {
        activeTab.value = newActive.key
      }
    }
  }

  const activateTab = (key: string) => {
    if (tabs.value.find(tab => tab.key === key)) {
      activeTab.value = key
    }
  }

  const closeOthers = (key: string) => {
    const currentTab = tabs.value.find(tab => tab.key === key)
    if (!currentTab) return

    tabs.value = tabs.value.filter(tab => tab.fixed || tab.key === key)
    activeTab.value = key
  }

  const closeRight = (key: string) => {
    const index = tabs.value.findIndex(tab => tab.key === key)
    if (index < 0) return

    // 保留固定标签和当前标签及左侧标签
    const rightTabs = tabs.value.slice(index + 1)
    const hasActiveInRight = rightTabs.some(tab => tab.key === activeTab.value)

    tabs.value = tabs.value.filter((tab, i) => tab.fixed || i <= index)

    // 如果当前激活的标签在右侧被关闭了，则激活当前标签
    if (hasActiveInRight) {
      activeTab.value = key
    }
  }

  const closeAll = () => {
    tabs.value = tabs.value.filter(tab => tab.fixed)
    activeTab.value = tabs.value[0]?.key || '/dashboard'
  }

  const reorderTabs = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return
    }

    const movableTabs = tabs.value.filter(tab => !tab.fixed)
    const targetTabs = [...movableTabs]
    const [movedTab] = targetTabs.splice(fromIndex, 1)

    if (!movedTab) {
      return
    }

    targetTabs.splice(toIndex, 0, movedTab)
    tabs.value = [...tabs.value.filter(tab => tab.fixed), ...targetTabs]
  }

  const setTabOrder = (orderedKeys: string[]) => {
    if (!orderedKeys.length) {
      return
    }

    const tabMap = new Map(tabs.value.map(tab => [tab.key, tab]))
    const orderedTabs = orderedKeys
      .map(key => tabMap.get(key))
      .filter((tab): tab is Tab => Boolean(tab))

    if (orderedTabs.length !== tabs.value.length) {
      return
    }

    tabs.value = orderedTabs
  }

  // 需要排除缓存的组件名（用于刷新）
  const excludeCache = ref<string[]>([])

  const refreshTab = (key: string) => {
    // 通过临时从缓存中排除该组件来实现刷新
    const tab = tabs.value.find(t => t.key === key)
    if (!tab || !tab.name) return

    // 将该组件名加入排除列表
    if (!excludeCache.value.includes(tab.name)) {
      excludeCache.value.push(tab.name)
    }

    // 300ms 后从排除列表中移除，恢复缓存功能
    setTimeout(() => {
      const idx = excludeCache.value.indexOf(tab.name)
      if (idx > -1) {
        excludeCache.value.splice(idx, 1)
      }
    }, 300)
  }

  const clearCache = () => {
    excludeCache.value = []
  }

  // 从 localStorage 恢复标签（可选）
  const restoreTabs = () => {
    try {
      const saved = localStorage.getItem('app_tabs')
      if (saved) {
        const parsed = JSON.parse(saved) as Tab[]
        // 只恢复非固定标签
        const unfixed = parsed.filter(tab => !tab.fixed && tab.key !== '/dashboard')
        tabs.value = [...fixedTabs.value, ...unfixed]
      }
    } catch {
      // ignore
    }
  }

  // 保存到 localStorage
  const saveTabs = () => {
    try {
      localStorage.setItem('app_tabs', JSON.stringify(tabs.value))
    } catch {
      // ignore
    }
  }

  return {
    tabs,
    activeTab,
    cachedViews,
    excludeCache,
    fixedTabs,
    unfixedTabs,
    addTab,
    removeTab,
    activateTab,
    closeOthers,
    closeRight,
    closeAll,
    reorderTabs,
    setTabOrder,
    refreshTab,
    clearCache,
    restoreTabs,
    saveTabs
  }
})
