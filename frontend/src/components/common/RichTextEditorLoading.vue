<template>
  <div class="rich-text-editor-loading">
    <div class="toolbar">
      <span v-for="index in 8" :key="index" class="tool" />
    </div>
    <div class="body">
      <span class="line w-11/12" />
      <span class="line w-9/12" />
      <span class="line w-10/12" />
      <span class="line w-8/12" />
      <span class="line w-7/12" />
    </div>
  </div>
</template>

<style scoped>
.rich-text-editor-loading {
  border: 1px solid rgb(229 231 235);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.toolbar {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid rgb(229 231 235);
  background: rgb(249 250 251);
}

.tool,
.line {
  display: inline-block;
  border-radius: 9999px;
  background: linear-gradient(90deg, rgb(229 231 235) 25%, rgb(243 244 246) 37%, rgb(229 231 235) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}

.tool {
  width: 28px;
  height: 28px;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 420px;
  padding: 18px 16px;
}

.line {
  height: 14px;
}

@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: 0 0;
  }
}
</style>
