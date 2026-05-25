<template>
  <n-form
    class="query-form transition-theme"
    label-placement="left"
    v-bind="$attrs"
    @keydown.enter="handleEnter"
  >
    <slot />
  </n-form>
</template>

<script setup lang="ts">
import { getCurrentInstance } from 'vue'

defineOptions({
  inheritAttrs: false
})

const emit = defineEmits<{
  search: []
}>()

const instance = getCurrentInstance()

const handleEnter = (event: KeyboardEvent) => {
  if (!instance?.vnode.props?.onSearch) return
  if (event.isComposing) return

  const target = event.target as HTMLElement | null
  if (target?.closest('textarea, [contenteditable="true"]')) return

  event.preventDefault()
  emit('search')
}
</script>

<style lang="scss">
.query-form {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0 16px;
  align-items: end;

  .n-form-item {
    width: 100%;
  }

  .n-form-item:last-child {
    grid-column: 4;
  }

  .n-form-item:last-child .n-form-item-blank {
    justify-content: flex-end;
  }

  .n-input,
  .n-input-number,
  .n-select,
  .n-date-picker,
  .n-cascader,
  .n-tree-select {
    width: 100% !important;
  }
}

@media (max-width: 1400px) {
  .query-form {
    grid-template-columns: repeat(3, minmax(0, 1fr));

    .n-form-item:last-child {
      grid-column: 3;
    }
  }
}

@media (max-width: 1024px) {
  .query-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    .n-form-item:last-child {
      grid-column: 2;
    }
  }
}

@media (max-width: 640px) {
  .query-form {
    grid-template-columns: minmax(0, 1fr);

    .n-form-item:last-child {
      grid-column: auto;
    }
  }
}
</style>
