<template>
  <div class="tab-bar bg-container border-b border-gray-200 dark:border-gray-700 transition-theme">
    <div ref="tabListRef" class="tab-list layout-scrollbar flex items-center px-2 py-1 h-10 overflow-x-auto overflow-y-hidden">
      <div
        v-for="tab in tabStore.tabs"
        :key="tab.key"
        :data-tab-key="tab.key"
        :class="[
          'tab-item flex items-center px-3 py-0.5 mr-1 rounded cursor-pointer text-sm select-none whitespace-nowrap transition-all',
          tab.fixed ? 'tab-item--fixed' : 'tab-item--draggable',
          { 'tab-item--active': tab.key === tabStore.activeTab },
          getDropTargetClass(tab.key),
          tab.key === tabStore.activeTab
            ? 'bg-primary text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        ]"
        @click="handleClick(tab)"
        @contextmenu.prevent="handleContextMenu($event, tab)"
      >
        <span class="tab-item__label">{{ tab.title }}</span>
        <span v-if="!tab.fixed" class="close-slot">
          <n-icon
            class="close-icon"
            @click.stop="handleClose(tab)"
          >
            <close-outline />
          </n-icon>
        </span>
      </div>
    </div>

    <!-- 右键菜单 -->
    <n-dropdown
      :show="showContextMenu"
      :options="contextMenuOptions"
      :x="contextMenuX"
      :y="contextMenuY"
      trigger="manual"
      placement="bottom-start"
      @clickoutside="showContextMenu = false"
      @select="handleContextMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, h, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useTabStore } from '@/store/modules/tab'
import { CloseOutline, RefreshOutline, CloseCircleOutline, ArrowForwardOutline } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import type { Tab } from '@/store/modules/tab'
import {
  Sortable,
  type DragOverEvent,
  type DragStartEvent,
  type DragStopEvent,
  type SortableStopEvent
} from '@shopify/draggable'

const router = useRouter()
const tabStore = useTabStore()
const tabListRef = ref<HTMLElement | null>(null)
let sortableInstance: Sortable | null = null
const dragTargetKey = ref<string | null>(null)
const dragInsertAfter = ref(false)
const draggingTabKey = ref<string | null>(null)

// 右键菜单
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextTab = ref<Tab | null>(null)

const renderIcon = (icon: any) => {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const contextMenuOptions = ref<DropdownOption[]>([
  {
    key: 'refresh',
    label: '刷新当前',
    icon: renderIcon(RefreshOutline),
    disabled: false
  },
  {
    key: 'close',
    label: '关闭当前',
    icon: renderIcon(CloseCircleOutline),
    disabled: false
  },
  {
    key: 'closeOthers',
    label: '关闭其他',
    icon: renderIcon(CloseOutline),
    disabled: false
  },
  {
    key: 'closeRight',
    label: '关闭右侧',
    icon: renderIcon(ArrowForwardOutline),
    disabled: false
  },
  {
    key: 'closeAll',
    label: '关闭所有',
    icon: renderIcon(CloseOutline),
    disabled: false
  }
])

const navigateToTab = (tab?: Tab | null) => {
  if (!tab) return
  router.push(tab.key).catch(() => undefined)
}

// 点击标签切换路由
const handleClick = (tab: Tab) => {
  if (tab.key !== tabStore.activeTab) {
    tabStore.activateTab(tab.key)
    navigateToTab(tab)
  }
}

// 关闭标签
const handleClose = (tab: Tab) => {
  if (tab.fixed) return
  const wasActive = tab.key === tabStore.activeTab
  tabStore.removeTab(tab.key)

  if (wasActive) {
    const active = tabStore.tabs.find(t => t.key === tabStore.activeTab)
    navigateToTab(active)
  }
}

// 右键菜单
const handleContextMenu = (e: MouseEvent, tab: Tab) => {
  e.preventDefault()
  contextTab.value = tab
  showContextMenu.value = false
  
  // 更新菜单禁用状态
  contextMenuOptions.value = [
    {
      key: 'refresh',
      label: '刷新当前',
      icon: renderIcon(RefreshOutline),
      disabled: tab.fixed
    },
    {
      key: 'close',
      label: '关闭当前',
      icon: renderIcon(CloseCircleOutline),
      disabled: tab.fixed
    },
    {
      key: 'closeOthers',
      label: '关闭其他',
      icon: renderIcon(CloseOutline),
      disabled: tabStore.tabs.length <= 1
    },
    {
      key: 'closeRight',
      label: '关闭右侧',
      icon: renderIcon(ArrowForwardOutline),
      disabled: tabStore.tabs.findIndex(t => t.key === tab.key) >= tabStore.tabs.length - 1
    },
    {
      key: 'closeAll',
      label: '关闭所有',
      icon: renderIcon(CloseOutline),
      disabled: tabStore.unfixedTabs.length === 0
    }
  ]
  
  nextTick(() => {
    contextMenuX.value = e.clientX
    contextMenuY.value = e.clientY
    showContextMenu.value = true
  })
}

// 右键菜单选择
const handleContextMenuSelect = (key: string) => {
  showContextMenu.value = false
  if (!contextTab.value) return

  switch (key) {
    case 'refresh':
      // 刷新当前标签页
      if (contextTab.value.key !== tabStore.activeTab) {
        // 如果刷新的不是当前激活的标签，先激活它
        tabStore.activateTab(contextTab.value.key)
      }
      // 从缓存中移除该组件，然后通过 redirect 重新加载
      tabStore.refreshTab(contextTab.value.key)
      router.replace({
        path: '/redirect',
        query: { to: contextTab.value.key }
      }).catch(() => {
        // 如果失败，直接刷新页面
        window.location.reload()
      })
      break
    case 'close':
      handleClose(contextTab.value)
      break
    case 'closeOthers':
      tabStore.closeOthers(contextTab.value.key)
      navigateToTab(contextTab.value)
      break
    case 'closeRight':
      tabStore.closeRight(contextTab.value.key)
      navigateToTab(tabStore.tabs.find(t => t.key === tabStore.activeTab) || contextTab.value)
      break
    case 'closeAll':
      tabStore.closeAll()
      navigateToTab(tabStore.tabs.find(t => t.key === tabStore.activeTab))
      break
  }
}

const clearDropIndicator = () => {
  dragTargetKey.value = null
  dragInsertAfter.value = false
}

const syncTabOrderFromDom = () => {
  if (!tabListRef.value) {
    return
  }

  const orderedKeys = Array.from(tabListRef.value.querySelectorAll<HTMLElement>('.tab-item'))
    .map(element => element.dataset.tabKey)
    .filter((key): key is string => Boolean(key))

  tabStore.setTabOrder(orderedKeys)
}

const getDropTargetClass = (tabKey: string) => {
  if (dragTargetKey.value !== tabKey) {
    return ''
  }

  return dragInsertAfter.value ? 'tab-item--drop-after' : 'tab-item--drop-before'
}

const handleDragStart = (event: DragStartEvent) => {
  clearDropIndicator()
  draggingTabKey.value = event.source.dataset.tabKey ?? null
}

const handleDragOver = (event: DragOverEvent) => {
  const over = event.over
  if (!over?.dataset.tabKey || over.dataset.tabKey === draggingTabKey.value) {
    clearDropIndicator()
    return
  }

  dragTargetKey.value = over.dataset.tabKey
  const overRect = over.getBoundingClientRect()
  dragInsertAfter.value = event.sensorEvent.clientX > overRect.left + overRect.width / 2
}

const handleDragStop = (_event: DragStopEvent) => {
  clearDropIndicator()
  draggingTabKey.value = null
}

const handleSortableStop = (_event: SortableStopEvent) => {
  syncTabOrderFromDom()
}

onMounted(() => {
  if (!tabListRef.value) {
    return
  }

  sortableInstance = new Sortable(tabListRef.value, {
    draggable: '.tab-item--draggable',
    distance: 4,
    classes: {
      'body:dragging': 'tab-bar--dragging',
      'container:dragging': 'tab-list--dragging',
      'source:dragging': 'tab-item--dragging',
      'source:placed': 'tab-item--placed',
      'container:placed': 'tab-list--placed',
      'draggable:over': 'tab-item--over',
      'container:over': 'tab-list--over',
      'source:original': 'tab-item--original',
      'mirror': 'tab-item--mirror'
    },
    mirror: {
      appendTo: tabListRef.value,
      constrainDimensions: true,
      xAxis: true
    },
    sortAnimation: {
      duration: 180,
      easingFunction: 'ease'
    },
  })

  sortableInstance
    .on('drag:start', handleDragStart)
    .on('drag:over', handleDragOver)
    .on('drag:stop', handleDragStop)
    .on('sortable:stop', handleSortableStop)
})

onBeforeUnmount(() => {
  clearDropIndicator()
  draggingTabKey.value = null
  sortableInstance?.destroy()
  sortableInstance = null
})
</script>

<style scoped>
.tab-bar {
  flex-shrink: 0;
  box-sizing: border-box;
  height: 40px; /* 固定高度 */
  min-height: 40px;
  max-height: 40px;
  overflow: hidden;
}

.tab-list {
  height: 100%;
  min-height: 0;
  flex-wrap: nowrap;
  align-items: center;
  overflow-y: hidden;
  position: relative;
  box-sizing: border-box;
  scrollbar-gutter: auto;
}

.tab-list::-webkit-scrollbar {
  width: 0;
  height: 6px;
}

.tab-list::-webkit-scrollbar-track {
  background: transparent;
}

.tab-list::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.dark .tab-list::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.15);
}

.tab-item {
  position: relative;
  flex-shrink: 0; /* 防止标签被压缩 */
  min-height: 24px;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;
}

.tab-item__label {
  min-width: 0;
}

.tab-item--draggable {
  cursor: grab;
}

.tab-item--draggable:active {
  cursor: grabbing;
}

.tab-item--dragging {
  opacity: 0.3;
  transform: scale(0.96);
}

.tab-item--original {
  opacity: 0.3;
}

.tab-item--mirror {
  opacity: 0.98;
  transform: scale(1.03);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.22);
  pointer-events: none;
  z-index: 20;
  cursor: grabbing;
}

.dark .tab-item--mirror {
  box-shadow: 0 16px 36px rgba(2, 6, 23, 0.42);
}

.tab-item--drop-before::before,
.tab-item--drop-after::after {
  content: '';
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 9999px;
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.95), rgba(14, 165, 233, 0.75));
  box-shadow: 0 0 0 2px rgba(191, 219, 254, 0.9);
}

.tab-item--drop-before::before {
  left: -6px;
}

.tab-item--drop-after::after {
  right: -5px;
}

.dark .tab-item--drop-before::before,
.dark .tab-item--drop-after::after {
  box-shadow: 0 0 0 2px rgba(30, 41, 59, 0.95);
}

.close-slot {
  width: 0;
  margin-left: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateX(-4px);
  pointer-events: none;
  transition:
    width 0.22s ease,
    margin-left 0.22s ease,
    opacity 0.18s ease,
    transform 0.22s ease;
}

.tab-item--active .close-slot,
.tab-item:not(.tab-item--active):hover .close-slot {
  width: 14px;
  margin-left: 6px;
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}

.close-icon {
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  transform: scale(0.82);
  transition:
    transform 0.2s ease,
    background-color 0.2s ease;
}

.tab-item:not(.tab-item--active):hover .close-icon {
  transform: scale(1);
}

.tab-item--active .close-icon {
  transform: scale(1);
}

.close-icon:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.dark .close-icon:hover {
  background-color: rgba(0, 0, 0, 0.3);
}
</style>
