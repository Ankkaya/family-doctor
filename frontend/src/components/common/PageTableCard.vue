<template>
  <n-card class="bg-container transition-theme" :bordered="false">
    <div
      v-if="$slots.toolbar || hasBuiltInActions || hasColumnSettings"
      class="page-table-card__toolbar"
      :class="{ 'page-table-card__toolbar--split': Boolean($slots.toolbar) }"
    >
      <div v-if="$slots.toolbar" class="page-table-card__toolbar-main">
        <slot name="toolbar" />
      </div>
      <div v-if="hasBuiltInActions || hasColumnSettings" class="page-table-card__toolbar-extra">
        <n-space align="center" :size="8">
          <n-button
            v-if="canExport"
            secondary
            :loading="exportLoading"
            @click="emit('export')"
          >
            <template #icon>
              <n-icon><download-outline /></n-icon>
            </template>
            导出
          </n-button>
          <n-button
            v-if="canBatchDelete"
            secondary
            type="error"
            :disabled="selectedCount <= 0"
            :loading="batchDeleteLoading"
            @click="emit('batch-delete')"
          >
            <template #icon>
              <n-icon><trash-outline /></n-icon>
            </template>
            批量删除
          </n-button>
        </n-space>
        <TableColumnSettings
          v-if="hasColumnSettings"
          :value="columnSettingValue"
          :options="columnSettingOptions"
          @update:value="handleColumnSettingUpdate"
          @reset="emit('reset-columns')"
        />
      </div>
    </div>

    <slot />

    <div v-if="$slots.footer" class="page-table-card__footer">
      <slot name="footer" />
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NIcon, NSpace } from 'naive-ui'
import { DownloadOutline, TrashOutline } from '@vicons/ionicons5'
import TableColumnSettings from './TableColumnSettings.vue'
import type { TableColumnSettingOption } from '@/utils/table-column-settings'
import { useAuthStore } from '@/store'

const props = withDefaults(defineProps<{
  columnSettingOptions?: TableColumnSettingOption[]
  columnSettingValue?: string[]
  exportPermission?: string | string[]
  batchDeletePermission?: string | string[]
  exportLoading?: boolean
  batchDeleteLoading?: boolean
  selectedCount?: number
}>(), {
  columnSettingOptions: () => [],
  columnSettingValue: () => [],
  exportPermission: undefined,
  batchDeletePermission: undefined,
  exportLoading: false,
  batchDeleteLoading: false,
  selectedCount: 0,
})

const emit = defineEmits<{
  'update:column-setting-value': [value: string[]]
  'reset-columns': []
  export: []
  'batch-delete': []
}>()

const authStore = useAuthStore()
const hasColumnSettings = computed(() => props.columnSettingOptions.length > 0)
const canExport = computed(() => (
  Boolean(props.exportPermission) && authStore.hasPermission(props.exportPermission)
))
const canBatchDelete = computed(() => (
  Boolean(props.batchDeletePermission) && authStore.hasPermission(props.batchDeletePermission)
))
const hasBuiltInActions = computed(() => canExport.value || canBatchDelete.value)

function handleColumnSettingUpdate(value: string[]) {
  emit('update:column-setting-value', value)
}
</script>

<style scoped>
.page-table-card__toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.page-table-card__toolbar--split {
  align-items: center;
  gap: 16px;
  justify-content: space-between;
}

.page-table-card__toolbar-main {
  min-width: 0;
  flex: 1;
}

.page-table-card__toolbar-extra {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-table-card__footer {
  margin-top: 16px;
}
</style>
