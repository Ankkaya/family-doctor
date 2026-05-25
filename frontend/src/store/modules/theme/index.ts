import { computed, effectScope, onScopeDispose, ref, toRefs, watch } from 'vue';
import type { Ref } from 'vue';
import { usePreferredColorScheme } from '@vueuse/core';
import { defineStore } from 'pinia';
import { localStg } from '@/utils/storage';
import {
  initThemeSettings,
  toggleAuxiliaryColorModes,
  toggleCssDarkMode,
  createThemeToken,
  addThemeCssVarsToGlobal,
  getNaiveTheme
} from './shared';

export const useThemeStore = defineStore('theme', () => {
  const scope = effectScope();

  // 获取操作系统主题偏好
  const osTheme = usePreferredColorScheme();

  // 主题设置
  const settings: Ref<App.Theme.ThemeSetting> = ref(initThemeSettings());

  // 是否为暗黑模式（计算属性）
  const darkMode = computed(() => {
    if (settings.value.themeScheme === 'auto') {
      return osTheme.value === 'dark';
    }
    return settings.value.themeScheme === 'dark';
  });

  // 灰度模式
  const grayscaleMode = computed(() => settings.value.grayscale);

  // 色弱模式
  const colourWeaknessMode = computed(() => settings.value.colourWeakness);

  // 主题颜色
  const themeColors = computed<App.Theme.ThemeColor>(() => {
    const { themeColor, otherColor } = settings.value;
    return {
      primary: themeColor,
      ...otherColor
    };
  });

  // Naive UI 主题配置
  const naiveTheme = computed(() => getNaiveTheme(themeColors.value));

  /**
   * 设置主题模式
   * @param themeScheme 'light' | 'dark' | 'auto'
   */
  function setThemeScheme(themeScheme: ThemeScheme) {
    settings.value.themeScheme = themeScheme;
    // 立即应用暗黑模式变化
    toggleCssDarkMode(darkMode.value);
  }

  /**
   * 切换主题模式（循环：light -> dark -> auto -> light）
   */
  function toggleThemeScheme() {
    const themeSchemes: ThemeScheme[] = ['light', 'dark', 'auto'];
    const index = themeSchemes.findIndex(item => item === settings.value.themeScheme);
    const nextIndex = index === themeSchemes.length - 1 ? 0 : index + 1;
    setThemeScheme(themeSchemes[nextIndex]);
  }

  /**
   * 设置灰度模式
   */
  function setGrayscale(isGrayscale: boolean) {
    settings.value.grayscale = isGrayscale;
    toggleAuxiliaryColorModes(isGrayscale, settings.value.colourWeakness);
  }

  /**
   * 设置色弱模式
   */
  function setColourWeakness(isColourWeakness: boolean) {
    settings.value.colourWeakness = isColourWeakness;
    toggleAuxiliaryColorModes(settings.value.grayscale, isColourWeakness);
  }

  /** 缓存主题设置 */
  function cacheThemeSettings() {
    localStg.set('themeSettings', settings.value);
  }

  // ========== 初始化 ==========
  function init() {
    // 立即应用当前状态
    toggleCssDarkMode(darkMode.value);
    toggleAuxiliaryColorModes(grayscaleMode.value, colourWeaknessMode.value);
    
    // 立即设置 CSS 变量
    const colors = themeColors.value;
    const { lightVars, darkVars } = createThemeToken(colors);
    addThemeCssVarsToGlobal(lightVars, darkVars);
  }

  // ========== 副作用监听 ==========
  scope.run(() => {
    // 监听暗黑模式变化
    watch(
      darkMode,
      (val) => {
        toggleCssDarkMode(val);
      }
    );

    // 监听灰度/色弱模式变化
    watch(
      [grayscaleMode, colourWeaknessMode],
      ([grayscale, colourWeakness]) => {
        toggleAuxiliaryColorModes(grayscale, colourWeakness);
      }
    );

    // 监听主题颜色变化，更新 CSS 变量
    watch(
      themeColors,
      (val) => {
        const { lightVars, darkVars } = createThemeToken(val);
        addThemeCssVarsToGlobal(lightVars, darkVars);
      },
      { deep: true }
    );
  });

  // 页面关闭时缓存设置
  window.addEventListener('beforeunload', cacheThemeSettings);

  // 清理副作用
  onScopeDispose(() => {
    scope.stop();
    window.removeEventListener('beforeunload', cacheThemeSettings);
  });

  return {
    ...toRefs(settings.value),
    darkMode,
    themeColors,
    naiveTheme,
    setThemeScheme,
    toggleThemeScheme,
    setGrayscale,
    setColourWeakness,
    init
  };
});
