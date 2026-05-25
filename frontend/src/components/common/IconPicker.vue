<template>
  <div class="icon-picker">
    <n-tabs v-model:value="activeLibrary" type="line" animated>
      <n-tab-pane
        v-for="library in iconLibraries"
        :key="library.key"
        :name="library.key"
        :tab="library.label"
      />
    </n-tabs>

    <n-input
      :value="keyword"
      :placeholder="activeLibraryPlaceholder"
      clearable
      @update:value="handleKeywordChange"
    />
    <div class="mt-2 flex items-center justify-between text-xs text-gray-500">
      <span>{{ summaryText }}</span>
      <n-button v-if="modelValue" text size="small" @click="handleClear">清空</n-button>
    </div>

    <div v-if="selectedIconName" class="selected-icon mt-3">
      <span class="selected-label">已选图标</span>
      <button
        type="button"
        class="icon-item icon-item-active"
        :title="selectedIconName"
        @click="handleSelect(selectedIconName)"
      >
        <AppIcon :icon="selectedIconName" size="18" />
        <span class="icon-label">{{ selectedIconName }}</span>
      </button>
    </div>

    <div v-if="filteredIcons.length" class="icon-grid mt-3">
      <button
        v-for="iconName in filteredIcons"
        :key="iconName"
        type="button"
        :class="[
          'icon-item',
          modelValue === iconName ? 'icon-item-active' : ''
        ]"
        :title="iconName"
        @click="handleSelect(iconName)"
      >
        <AppIcon :icon="iconName" size="18" />
        <span class="icon-label">{{ iconName }}</span>
      </button>
    </div>
    <div v-else class="empty-state mt-3">
      没有匹配到图标，请尝试其他英文关键字
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NInput, NTabPane, NTabs } from 'naive-ui'
import * as Ionicons from '@vicons/ionicons5'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const keyword = ref('')
const activeLibrary = ref<'ion' | 'material-symbols' | 'mdi'>('ion')
const ionIconNames = Object.keys(Ionicons as Record<string, any>)
  .filter(name => /^[A-Z]/.test(name))
  .sort((a, b) => a.localeCompare(b))

const materialSymbolsIcons = [
  'material-symbols:home-outline',
  'material-symbols:dashboard-outline',
  'material-symbols:menu',
  'material-symbols:settings-outline',
  'material-symbols:person-outline',
  'material-symbols:groups-outline',
  'material-symbols:storefront-outline',
  'material-symbols:shopping-bag-outline',
  'material-symbols:shopping-cart-outline',
  'material-symbols:inventory-2-outline',
  'material-symbols:category-outline',
  'material-symbols:bookmark-outline',
  'material-symbols:database-outline',
  'material-symbols:straighten-outline',
  'material-symbols:local-shipping-outline',
  'material-symbols:receipt-long-outline',
  'material-symbols:move-to-inbox-outline',
  'material-symbols:assignment-return-outline',
  'material-symbols:swap-horiz-outline',
  'material-symbols:tune-outline',
  'material-symbols:history-rounded',
  'material-symbols:print-outline',
  'material-symbols:print-connect-outline',
  'material-symbols:local-activity-outline',
  'material-symbols:cloud-upload',
  'material-symbols:cloud-download',
  'material-symbols:upload-file-outline',
]

const mdiIcons = [
  'mdi:warehouse-outline',
  'mdi:home-outline',
  'mdi:view-dashboard-outline',
  'mdi:cog-outline',
  'mdi:account-outline',
  'mdi:account-group-outline',
  'mdi:cart-outline',
  'mdi:cart-check',
  'mdi:package-variant-closed',
  'mdi:package-variant',
  'mdi:shape-outline',
  'mdi:tag-outline',
  'mdi:truck-delivery-outline',
  'mdi:clipboard-text-outline',
  'mdi:archive-arrow-down-outline',
  'mdi:archive-arrow-up-outline',
  'mdi:swap-horizontal',
  'mdi:tune',
  'mdi:history',
  'mdi:printer-outline',
  'mdi:ticket-percent-outline',
]

const iconLibraries = [
  { key: 'ion', label: 'Ionicons' },
  { key: 'material-symbols', label: 'Material Symbols' },
  { key: 'mdi', label: 'MDI' },
] as const

const iconMapByLibrary: Record<'ion' | 'material-symbols' | 'mdi', string[]> = {
  ion: ionIconNames,
  'material-symbols': materialSymbolsIcons,
  mdi: mdiIcons,
}

const detectLibrary = (value?: string) => {
  if (!value) return 'ion'
  if (value.startsWith('material-symbols:')) return 'material-symbols'
  if (value.startsWith('mdi:')) return 'mdi'
  return 'ion'
}

watch(
  () => props.modelValue,
  (value) => {
    if (value) {
      activeLibrary.value = detectLibrary(value)
      if (!keyword.value.trim()) {
        keyword.value = value
      }
    }
  },
  { immediate: true },
)

const filteredIcons = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  const source = iconMapByLibrary[activeLibrary.value]

  if (!search) {
    if (props.modelValue && detectLibrary(props.modelValue) === activeLibrary.value) {
      return [props.modelValue]
    }
    return source.slice(0, 24)
  }

  const startsWithMatches = source.filter(name => name.toLowerCase().startsWith(search))
  const includesMatches = source.filter(
    name => !name.toLowerCase().startsWith(search) && name.toLowerCase().includes(search),
  )

  return [...startsWithMatches, ...includesMatches].slice(0, 24)
})

const handleKeywordChange = (value: string) => {
  keyword.value = value
}

const handleSelect = (iconName: string) => {
  emit('update:modelValue', iconName)
}

const handleClear = () => {
  keyword.value = ''
  emit('update:modelValue', '')
}

const selectedIconName = computed(() => {
  if (!props.modelValue) {
    return ''
  }
  return props.modelValue
})

const activeLibraryPlaceholder = computed(() => {
  const placeholders: Record<'ion' | 'material-symbols' | 'mdi', string> = {
    ion: '输入图标关键字，例如 Home、Cart、Bag',
    'material-symbols': '输入图标关键字，例如 home、shopping、settings',
    mdi: '输入图标关键字，例如 warehouse、printer、ticket',
  }
  return placeholders[activeLibrary.value]
})

const summaryText = computed(() => {
  const search = keyword.value.trim()
  if (!search) {
    const activeLabel = iconLibraries.find(item => item.key === activeLibrary.value)?.label || activeLibrary.value
    return props.modelValue ? `当前显示已选图标，当前图标库：${activeLabel}` : `当前图标库：${activeLabel}`
  }

  return `匹配到 ${filteredIcons.value.length} 个图标`
})
</script>

<style scoped>
.selected-icon {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selected-label {
  font-size: 12px;
  color: rgb(107 114 128);
}

.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  max-width: 100%;
  padding: 8px 10px;
  border: 1px solid rgb(229 231 235);
  border-radius: 10px;
  background: white;
  color: rgb(75 85 99);
  transition: all 0.2s ease;
}

.icon-item:hover {
  border-color: rgb(24 160 88);
  color: rgb(24 160 88);
}

.icon-item-active {
  border-color: rgb(24 160 88);
  background: rgb(240 249 244);
  color: rgb(24 160 88);
}

.icon-label {
  font-size: 12px;
  white-space: nowrap;
}

.empty-state {
  padding: 12px;
  border: 1px dashed rgb(209 213 219);
  border-radius: 10px;
  text-align: center;
  font-size: 12px;
  color: rgb(107 114 128);
}
</style>
