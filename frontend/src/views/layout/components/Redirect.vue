<template>
  <div></div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 获取目标路径（query.to 可能是 string 或 string[]）
const to = route.query.to
const targetPath = Array.isArray(to) ? to[0] : to

if (typeof targetPath === 'string' && targetPath) {
  router.replace(targetPath)
} else {
  router.replace('/dashboard')
}
</script>
