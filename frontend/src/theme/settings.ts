/** 默认主题配置 */
export const themeSettings: App.Theme.ThemeSetting = {
  themeScheme: 'dark',
  grayscale: false,
  colourWeakness: false,
  themeColor: '#18A058',
  otherColor: {
    info: '#2080F0',
    success: '#18A058',
    warning: '#F0A020',
    error: '#D03050'
  },
  tokens: {
    light: {
      colors: {
        // 使用 RGB 分量格式，便于在 CSS 中使用 rgb(var(--xxx))
        container: '255 255 255',
        layout: '239 244 248',
        inverted: '0 20 40',
        'base-text': '31 31 31'
      },
      boxShadow: {
        header: '0 1px 2px rgb(15, 23, 42, 0.06), 0 8px 24px rgb(15, 23, 42, 0.04)',
        sider: '2px 0 12px 0 rgb(15, 23, 42, 0.06)',
        tab: '0 1px 2px rgb(15, 23, 42, 0.06), 0 4px 12px rgb(15, 23, 42, 0.04)'
      }
    },
    dark: {
      colors: {
        container: '30 36 45',
        layout: '15 19 26',
        inverted: '0 20 40',
        'base-text': '224 224 224'
      },
      boxShadow: {
        header: '0 1px 2px rgb(0, 0, 0, 0.24), 0 10px 28px rgb(2, 6, 23, 0.32)',
        sider: '2px 0 12px 0 rgb(2, 6, 23, 0.34)',
        tab: '0 1px 2px rgb(0, 0, 0, 0.22), 0 6px 18px rgb(2, 6, 23, 0.28)'
      }
    }
  }
};

/** 主题色板生成配置 */
export const colorPaletteConfig = {
  // 主题色生成的色阶
  primaryLevels: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const
};
