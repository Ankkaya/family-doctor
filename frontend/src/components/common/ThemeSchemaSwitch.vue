<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NTooltip, NIcon } from 'naive-ui';
import { Sunny, Moon, Contrast } from '@vicons/ionicons5';

interface Props {
  /** 当前主题模式 */
  themeScheme: ThemeScheme;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'switch'): void;
}

const emit = defineEmits<Emits>();

function handleSwitch() {
  emit('switch');
}

// 图标和提示映射
const themeMeta: Record<ThemeScheme, { icon: any; label: string }> = {
  light: { icon: Sunny, label: '亮色模式' },
  dark: { icon: Moon, label: '暗色模式' },
  auto: { icon: Contrast, label: '跟随系统' }
};

const currentMeta = computed(() => themeMeta[props.themeScheme]);
</script>

<template>
  <n-tooltip placement="bottom" trigger="hover">
    <template #trigger>
      <n-button text @click="handleSwitch">
        <template #icon>
          <n-icon :component="currentMeta.icon" />
        </template>
      </n-button>
    </template>
    <span>{{ currentMeta.label }} (点击切换)</span>
  </n-tooltip>
</template>
