<template>
  <div class="min-h-screen flex items-center justify-center bg-layout transition-theme">
    <!-- 主题切换按钮 -->
    <div class="absolute top-4 right-4">
      <ThemeSchemaSwitch :theme-scheme="themeStore.themeScheme" @switch="themeStore.toggleThemeScheme" />
    </div>
    
    <div class="bg-container rounded-lg shadow-lg p-8 w-full max-w-md transition-theme">
      <h2 class="text-2xl font-bold text-center mb-8 text-base-text">Docker Demo Admin</h2>
      <n-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-placement="top"
        size="large"
        @keydown.enter.prevent="handleLogin"
      >
        <n-form-item label="用户名" path="username">
          <n-input v-model:value="form.username" name="username" placeholder="请输入用户名" autocomplete="username" />
        </n-form-item>
        <n-form-item label="密码" path="password">
          <n-input
            v-model:value="form.password"
            type="password"
            name="password"
            placeholder="请输入密码"
            show-password-on="click"
            autocomplete="current-password"
          />
        </n-form-item>
        <n-form-item>
          <n-button
            type="primary"
            class="w-full"
            :loading="authStore.loading"
            @click="handleLogin"
          >
            登录
          </n-button>
        </n-form-item>
      </n-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/store'
import { useThemeStore } from '@/store/modules/theme'
import type { FormInst, FormRules } from 'naive-ui'
import { useMessage } from 'naive-ui'
import ThemeSchemaSwitch from '@/components/common/ThemeSchemaSwitch.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const formRef = ref<FormInst>()
const message = useMessage()

const form = reactive({
  username: '',
  password: ''
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名至少3位', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (authStore.loading) return
  if (!formRef.value) return

  await formRef.value.validate(async (errors) => {
    if (!errors) {
      const success = await authStore.login(form.username, form.password)
      if (success) {
        const redirect = route.query.redirect as string || '/dashboard'
        router.push(redirect)
        message.success('登录成功')
      } else {
        message.error('登录失败')
      }
    }
  })
}
</script>
