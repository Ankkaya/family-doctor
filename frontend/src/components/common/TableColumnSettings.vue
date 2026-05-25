<template>
  <n-popover trigger="click" placement="bottom-end" :width="220">
    <template #trigger>
      <n-button secondary>
        <template #icon>
          <n-icon>
            <OptionsOutline />
          </n-icon>
        </template>
        列设置
      </n-button>
    </template>

    <div class="column-settings">
      <div class="column-settings__header">
        <span>显示列</span>
        <n-button text type="primary" size="small" @click="emit('reset')">重置</n-button>
      </div>
      <n-checkbox-group :value="value" @update:value="handleUpdate">
        <n-space vertical size="small">
          <n-checkbox
            v-for="option in options"
            :key="option.key"
            :value="option.key"
            :disabled="option.disabled"
          >
            {{ option.title }}
          </n-checkbox>
        </n-space>
      </n-checkbox-group>
    </div>
  </n-popover>
</template>

<script setup lang="ts">
import { NIcon } from 'naive-ui'
import { OptionsOutline } from '@vicons/ionicons5'
import type { TableColumnSettingOption } from '@/utils/table-column-settings'

defineProps<{
  options: TableColumnSettingOption[]
  value: string[]
}>()

const emit = defineEmits<{
  'update:value': [value: string[]]
  reset: []
}>()

function handleUpdate(value: Array<string | number>) {
  emit('update:value', value.map(String))
}
</script>

<style scoped>
.column-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.column-settings__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
}
</style>
