<template>
  <n-card class="mb-4 bg-container transition-theme" :bordered="false">
    <div class="page-toolbar">
      <n-space align="center" wrap>
        <slot />
      </n-space>
    </div>
  </n-card>
</template>

<script setup lang="ts">
</script>

<style scoped>
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
}
</style>
