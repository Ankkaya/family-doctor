<script setup lang="ts">
import { computed } from 'vue';
import { darkTheme, dateZhCN, zhCN } from 'naive-ui';
import { useThemeStore } from '@/store/modules/theme';

const themeStore = useThemeStore();

// 暗色主题对象
const naiveDarkTheme = computed(() => (themeStore.darkMode ? darkTheme : undefined));

// 主题覆盖配置
const naiveThemeOverrides = computed(() => themeStore.naiveTheme);

</script>

<template>
  <n-config-provider
    :theme="naiveDarkTheme"
    :theme-overrides="naiveThemeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
    class="h-full"
  >
    <n-message-provider>
      <n-dialog-provider>
        <router-view />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
