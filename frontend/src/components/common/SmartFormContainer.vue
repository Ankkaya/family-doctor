<template>
  <n-drawer
    v-if="useDrawer"
    :show="show"
    placement="right"
    :width="drawerWidth"
    @update:show="handleShowUpdate"
  >
    <div class="smart-form-container transition-theme">
      <div class="smart-form-container__header">
        <div class="smart-form-container__title">{{ title }}</div>
      </div>
      <div class="smart-form-container__body layout-scrollbar transition-theme">
        <slot />
      </div>
      <div v-if="$slots.footer" class="smart-form-container__footer">
        <slot name="footer" />
      </div>
    </div>
  </n-drawer>

  <n-modal
    v-else
    :show="show"
    preset="card"
    :title="title"
    :style="modalStyle"
    @update:show="handleShowUpdate"
  >
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  show: boolean
  title: string
  formItemCount: number
  modalWidth?: string
  drawerWidth?: number | string
}>(), {
  modalWidth: '500px',
  drawerWidth: 720,
})

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const useDrawer = computed(() => props.formItemCount > 5)
const modalStyle = computed(() => ({ width: props.modalWidth }))

const handleShowUpdate = (value: boolean) => {
  emit('update:show', value)
}
</script>

<style scoped>
.smart-form-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: rgb(var(--base-text-color));
  background: rgb(var(--container-bg-color));
}

.smart-form-container__header {
  flex-shrink: 0;
  padding: 20px 24px 16px;
  color: inherit;
  background: rgb(var(--container-bg-color));
  border-bottom: 1px solid rgba(var(--base-text-color), 0.12);
}

.smart-form-container__title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  color: inherit;
}

.smart-form-container__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px;
  color: inherit;
  background: rgb(var(--container-bg-color));
}

.smart-form-container__footer {
  flex-shrink: 0;
  padding: 16px 24px 20px;
  background: rgb(var(--container-bg-color));
  border-top: 1px solid rgba(var(--base-text-color), 0.12);
}
</style>
