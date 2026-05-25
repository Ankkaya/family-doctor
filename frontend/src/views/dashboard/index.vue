<template>
  <div class="dashboard page-container space-y-4">
    <n-card class="bg-container transition-theme" :bordered="false">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-base-text mb-1">
            {{ greeting }}，{{ user?.name || user?.username }}
          </h2>
          <p class="text-sm text-base-text-secondary">
            {{ today }} · 平台基座服务已就绪
          </p>
        </div>
        <n-tag :bordered="false" type="success" round>
          <template #icon>
            <AppIcon icon="mdi:check-circle" :size="14" />
          </template>
          系统运行正常
        </n-tag>
      </div>
    </n-card>

    <n-grid :x-gap="16" :y-gap="16" cols="1 s:2 m:4" responsive="screen">
      <n-gi v-for="item in kpis" :key="item.label">
        <n-card
          hoverable
          class="h-full bg-container transition-theme cursor-pointer"
          :bordered="false"
          @click="router.push(item.to)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="text-sm text-base-text-secondary mb-2">{{ item.label }}</div>
              <div class="text-3xl font-bold" :style="{ color: item.color }">
                {{ item.value }}
              </div>
              <div class="text-xs text-base-text-secondary mt-2">{{ item.hint }}</div>
            </div>
            <div
              class="w-12 h-12 flex items-center justify-center rounded-lg shrink-0"
              :style="{ background: item.bg, color: item.color }"
            >
              <AppIcon :icon="item.icon" :size="24" />
            </div>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-card title="快捷入口" class="bg-container transition-theme" :bordered="false">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <button
          v-for="shortcut in shortcuts"
          :key="shortcut.label"
          type="button"
          class="shortcut-item flex flex-col items-center justify-center gap-2 p-3 rounded-lg transition-theme text-base-text"
          @click="router.push(shortcut.to)"
        >
          <span
            class="w-10 h-10 flex items-center justify-center rounded-lg"
            :style="{ background: shortcut.bg, color: shortcut.color }"
          >
            <AppIcon :icon="shortcut.icon" :size="20" />
          </span>
          <span class="text-xs text-center">{{ shortcut.label }}</span>
        </button>
      </div>
    </n-card>

    <n-grid :x-gap="16" :y-gap="16" cols="1 m:2" responsive="screen">
      <n-gi>
        <n-card title="系统设施" class="bg-container transition-theme h-full" :bordered="false">
          <n-list :bordered="false">
            <n-list-item v-for="item in facilities" :key="item.label">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2 min-w-0">
                  <AppIcon :icon="item.icon" :size="18" :color="item.color" />
                  <span class="text-base-text">{{ item.label }}</span>
                </div>
                <n-tag size="small" :bordered="false" :type="item.type">{{ item.status }}</n-tag>
              </div>
            </n-list-item>
          </n-list>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card title="开发提示" class="bg-container transition-theme h-full" :bordered="false">
          <n-list :bordered="false">
            <n-list-item v-for="item in nextSteps" :key="item">
              <div class="flex items-start gap-2 text-sm text-base-text">
                <AppIcon icon="mdi:chevron-right" :size="16" color="#2080f0" />
                <span>{{ item }}</span>
              </div>
            </n-list-item>
          </n-list>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { NCard, NGi, NGrid, NList, NListItem, NTag } from 'naive-ui'
import { useAuthStore } from '@/store'
import AppIcon from '@/components/common/AppIcon.vue'

const router = useRouter()
const authStore = useAuthStore()
const user = computed(() => authStore.user)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 22) return '晚上好'
  return '夜深了'
})

const today = computed(() => {
  const date = new Date()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`
})

const kpis = computed(() => [
  {
    label: '已授权菜单',
    value: authStore.menus.length,
    hint: '来自后端动态菜单',
    icon: 'mdi:menu-open',
    color: '#2080f0',
    bg: 'rgba(32, 128, 240, 0.1)',
    to: '/system/menus',
  },
  {
    label: '用户管理',
    value: 'RBAC',
    hint: '用户与角色授权',
    icon: 'mdi:account-cog-outline',
    color: '#18a058',
    bg: 'rgba(24, 160, 88, 0.1)',
    to: '/system/users',
  },
  {
    label: '系统配置',
    value: 'KV',
    hint: '统一配置中心',
    icon: 'mdi:tune-variant',
    color: '#f0a020',
    bg: 'rgba(240, 160, 32, 0.1)',
    to: '/system/settings',
  },
  {
    label: '审计日志',
    value: 'Log',
    hint: '操作与登录审计',
    icon: 'mdi:history',
    color: '#8a2be2',
    bg: 'rgba(138, 43, 226, 0.1)',
    to: '/system/logs',
  },
])

const shortcuts = [
  { label: '用户管理', icon: 'mdi:account-group-outline', to: '/system/users', color: '#2080f0', bg: 'rgba(32, 128, 240, 0.1)' },
  { label: '角色管理', icon: 'mdi:shield-account-outline', to: '/system/roles', color: '#18a058', bg: 'rgba(24, 160, 88, 0.1)' },
  { label: '菜单管理', icon: 'mdi:menu', to: '/system/menus', color: '#f0a020', bg: 'rgba(240, 160, 32, 0.1)' },
  { label: '系统配置', icon: 'mdi:cog-outline', to: '/system/settings', color: '#8a2be2', bg: 'rgba(138, 43, 226, 0.1)' },
  { label: '操作日志', icon: 'mdi:clipboard-text-clock-outline', to: '/system/logs', color: '#00a2ae', bg: 'rgba(0, 162, 174, 0.1)' },
  { label: '上传记录', icon: 'mdi:cloud-upload-outline', to: '/system/upload-records', color: '#d03050', bg: 'rgba(208, 48, 80, 0.1)' },
]

const facilities = [
  { label: 'PostgreSQL 数据库', status: 'Docker', type: 'success' as const, icon: 'mdi:database-outline', color: '#2080f0' },
  { label: 'Redis 缓存', status: 'Docker', type: 'success' as const, icon: 'mdi:database-clock-outline', color: '#d03050' },
  { label: 'MinIO 对象存储', status: 'Docker', type: 'success' as const, icon: 'mdi:folder-cloud-outline', color: '#f0a020' },
  { label: 'JWT 登录认证', status: '启用', type: 'info' as const, icon: 'mdi:key-chain', color: '#18a058' },
]

const nextSteps = [
  '参考 docs/add-module.md 创建新的业务模块',
  '在菜单管理中注册前端页面和访问路径',
  '通过角色管理分配菜单权限',
  '在系统配置中维护运行时业务参数',
]
</script>

<style scoped>
.shortcut-item:hover {
  background: var(--n-color-hover, rgba(0, 0, 0, 0.04));
}

.text-base-text-secondary {
  color: var(--n-text-color-3, #909399);
}
</style>
