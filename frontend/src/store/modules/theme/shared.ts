import type { GlobalThemeOverrides } from 'naive-ui';
import { DARK_CLASS } from '@/constants/app';
import { toggleHtmlClass } from '@/utils/common';
import { localStg } from '@/utils/storage';
import { themeSettings } from '@/theme/settings';

/** 初始化主题设置 */
export function initThemeSettings(): App.Theme.ThemeSetting {
  const localSettings = localStg.get<App.Theme.ThemeSetting>('themeSettings');
  return localSettings || themeSettings;
}

/** 切换 CSS 暗黑模式 */
export function toggleCssDarkMode(darkMode = false) {
  const { add, remove } = toggleHtmlClass(DARK_CLASS);
  if (darkMode) {
    add();
  } else {
    remove();
  }
}

/** 切换辅助颜色模式（灰度/色弱） */
export function toggleAuxiliaryColorModes(
  grayscaleMode = false,
  colourWeakness = false
) {
  const htmlElement = document.documentElement;
  htmlElement.style.filter = [
    grayscaleMode ? 'grayscale(100%)' : '',
    colourWeakness ? 'invert(80%)' : ''
  ].filter(Boolean).join(' ');
}

/**
 * 将 Hex 颜色转换为 RGB 分量
 * @param hex 十六进制颜色值，如 #18A058
 * @returns RGB 分量数组，如 [24, 160, 88]
 */
function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b];
}

/**
 * 生成主题色的色阶
 * @param hex 主题色 hex 值
 * @returns 色阶映射对象
 */
function generatePrimaryPalette(hex: string): Record<number, string> {
  const [r, g, b] = hexToRgb(hex);
  
  // 生成色阶：50-900
  const palette: Record<number, string> = {
    50: `${r + (255 - r) * 0.9} ${g + (255 - g) * 0.9} ${b + (255 - b) * 0.9}`,
    100: `${r + (255 - r) * 0.8} ${g + (255 - g) * 0.8} ${b + (255 - b) * 0.8}`,
    200: `${r + (255 - r) * 0.6} ${g + (255 - g) * 0.6} ${b + (255 - b) * 0.6}`,
    300: `${r + (255 - r) * 0.4} ${g + (255 - g) * 0.4} ${b + (255 - b) * 0.4}`,
    400: `${r + (255 - r) * 0.2} ${g + (255 - g) * 0.2} ${b + (255 - b) * 0.2}`,
    500: `${r} ${g} ${b}`,
    600: `${Math.floor(r * 0.8)} ${Math.floor(g * 0.8)} ${Math.floor(b * 0.8)}`,
    700: `${Math.floor(r * 0.6)} ${Math.floor(g * 0.6)} ${Math.floor(b * 0.6)}`,
    800: `${Math.floor(r * 0.4)} ${Math.floor(g * 0.4)} ${Math.floor(b * 0.4)}`,
    900: `${Math.floor(r * 0.2)} ${Math.floor(g * 0.2)} ${Math.floor(b * 0.2)}`,
  };
  
  return palette;
}

/**
 * 将 hex 颜色转换为 RGB 分量字符串
 * @param hex 十六进制颜色值
 * @returns RGB 分量字符串，如 "24 160 88"
 */
function hexToRgbVar(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `${r} ${g} ${b}`;
}

/**
 * 创建主题 Token（CSS 变量值）
 * @param colors 主题颜色配置
 * @returns 亮色和暗色主题 token
 */
export function createThemeToken(colors: App.Theme.ThemeColor) {
  const { light, dark } = themeSettings.tokens;

  // 生成主题色色阶
  const primaryPalette = generatePrimaryPalette(colors.primary);
  const infoRgb = hexToRgbVar(colors.info);
  const successRgb = hexToRgbVar(colors.success);
  const warningRgb = hexToRgbVar(colors.warning);
  const errorRgb = hexToRgbVar(colors.error);

  // 构建 CSS 变量对象
  const buildCssVars = (isDark = false) => {
    const tokenSource = isDark ? { ...light, ...dark } : light;
    
    return {
      // 主题色色阶
      '--primary-color': primaryPalette[500],
      '--primary-50-color': primaryPalette[50],
      '--primary-100-color': primaryPalette[100],
      '--primary-200-color': primaryPalette[200],
      '--primary-300-color': primaryPalette[300],
      '--primary-400-color': primaryPalette[400],
      '--primary-500-color': primaryPalette[500],
      '--primary-600-color': primaryPalette[600],
      '--primary-700-color': primaryPalette[700],
      '--primary-800-color': primaryPalette[800],
      '--primary-900-color': primaryPalette[900],
      
      // 功能色
      '--info-color': infoRgb,
      '--success-color': successRgb,
      '--warning-color': warningRgb,
      '--error-color': errorRgb,
      
      // 进度条颜色（使用主题色）
      '--nprogress-color': primaryPalette[500],
      
      // 背景色
      '--container-bg-color': tokenSource.colors.container,
      '--layout-bg-color': tokenSource.colors.layout,
      '--inverted-bg-color': tokenSource.colors.inverted,
      '--base-text-color': tokenSource.colors['base-text'],
      
      // 阴影
      '--header-box-shadow': tokenSource.boxShadow.header,
      '--sider-box-shadow': tokenSource.boxShadow.sider,
      '--tab-box-shadow': tokenSource.boxShadow.tab,
    };
  };

  const lightVars = buildCssVars(false);
  const darkVars = buildCssVars(true);

  return { lightVars, darkVars };
}

/**
 * 添加主题 CSS 变量到全局
 * @param lightVars 亮色主题变量
 * @param darkVars 暗色主题变量
 */
export function addThemeCssVarsToGlobal(
  lightVars: Record<string, string>,
  darkVars: Record<string, string>
) {
  // 生成 CSS 字符串
  const generateCssBlock = (vars: Record<string, string>) => {
    return Object.entries(vars)
      .map(([key, value]) => `${key}: ${value}`)
      .join(';');
  };

  const css = `
    :root { ${generateCssBlock(lightVars)} }
    html.dark { ${generateCssBlock(darkVars)} }
  `;

  // 插入到 document.head
  const styleId = 'theme-css-vars';
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }
  
  style.textContent = css;
}

// ==================== Naive UI 主题配置 ====================

type NaiveColorScene = '' | 'Suppl' | 'Hover' | 'Pressed' | 'Active';
type NaiveColorKey = `${keyof App.Theme.ThemeColor}Color${NaiveColorScene}`;
type NaiveThemeColor = Partial<Record<NaiveColorKey, string>>;

/**
 * 调整颜色亮度
 * @param hex 十六进制颜色
 * @param factor 调整因子 (0-1)，小于1变暗，大于1变亮
 * @returns 调整后的 hex 颜色
 */
function adjustColorBrightness(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  
  if (factor < 1) {
    // 变暗
    const newR = Math.floor(r * factor);
    const newG = Math.floor(g * factor);
    const newB = Math.floor(b * factor);
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  } else {
    // 变亮
    const newR = Math.min(255, Math.floor(r + (255 - r) * (factor - 1)));
    const newG = Math.min(255, Math.floor(g + (255 - g) * (factor - 1)));
    const newB = Math.min(255, Math.floor(b + (255 - b) * (factor - 1)));
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }
}

/**
 * 添加透明度到颜色
 * @param hex 十六进制颜色
 * @param alpha 透明度 0-1
 * @returns rgba 字符串
 */
function addColorAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 获取 Naive UI 颜色配置
 * @param colors 主题颜色
 * @returns Naive UI 主题颜色配置
 */
function getNaiveThemeColors(colors: App.Theme.ThemeColor): NaiveThemeColor {
  // 定义颜色场景处理器
  const colorActions: { scene: NaiveColorScene; handler: (color: string) => string }[] = [
    { scene: '', handler: (color) => color },                                    // 基础色
    { scene: 'Suppl', handler: (color) => color },                               // 补充色
    { scene: 'Hover', handler: (color) => adjustColorBrightness(color, 1.2) },   // 悬停色（变亮）
    { scene: 'Pressed', handler: (color) => adjustColorBrightness(color, 0.8) }, // 按下色（变暗）
    { scene: 'Active', handler: (color) => addColorAlpha(color, 0.1) }           // 激活色（带透明度）
  ];

  const themeColors: NaiveThemeColor = {};

  // 为每种主题色生成各场景颜色
  (Object.keys(colors) as Array<keyof App.Theme.ThemeColor>).forEach((colorType) => {
    const colorValue = colors[colorType];
    colorActions.forEach((action) => {
      const colorKey: NaiveColorKey = `${colorType}Color${action.scene}`;
      themeColors[colorKey] = action.handler(colorValue);
    });
  });

  return themeColors;
}

/**
 * 获取 Naive UI 主题配置
 * @param colors 主题颜色
 * @returns GlobalThemeOverrides 配置对象
 */
export function getNaiveTheme(colors: App.Theme.ThemeColor): GlobalThemeOverrides {
  const { primary: colorLoading } = colors;

  const theme: GlobalThemeOverrides = {
    // 通用配置（颜色、圆角）
    common: {
      ...getNaiveThemeColors(colors),
      borderRadius: '6px',  // 全局圆角
      borderRadiusSmall: '4px',
    },
    
    // 加载条颜色
    LoadingBar: {
      colorLoading
    },
    
    // 标签圆角
    Tag: {
      borderRadius: '6px'
    },
    
    // 按钮主色文字（确保白色）
    Button: {
      textColorPrimary: '#ffffff',
      textColorInfo: '#ffffff',
      textColorSuccess: '#ffffff',
      textColorWarning: '#ffffff',
      textColorError: '#ffffff',
    },
    
    // 卡片圆角
    Card: {
      borderRadius: '8px'
    },
    
    // 模态框圆角
    Modal: {
      borderRadius: '8px'
    },
    
    // 抽屉圆角
    Drawer: {
      borderRadius: '8px'
    },
    
    // 输入框
    Input: {
      borderRadius: '6px'
    },
    
    // 选择器
    Select: {
      borderRadius: '6px'
    }
  };
  return theme;
}
