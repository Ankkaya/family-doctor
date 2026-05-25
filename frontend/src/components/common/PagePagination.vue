<template>
  <div class="page-pagination">
    <n-pagination
      :page="page"
      :page-size="pageSize"
      :page-sizes="pageSizes"
      :item-count="itemCount"
      :show-size-picker="showSizePicker"
      @update:page="handlePageUpdate"
      @update:page-size="handlePageSizeUpdate"
    />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  page: number
  pageSize: number
  itemCount: number
  pageSizes?: number[]
  showSizePicker?: boolean
}>(), {
  pageSizes: () => [10, 20, 50, 100],
  showSizePicker: true,
})

const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
}>()

function handlePageUpdate(value: number) {
  emit('update:page', value)
}

function handlePageSizeUpdate(value: number) {
  emit('update:pageSize', value)
}
</script>

<style scoped>
.page-pagination {
  display: flex;
  justify-content: flex-end;
}
</style>
