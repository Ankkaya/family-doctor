/** 主题模式 */
declare type ThemeScheme = 'light' | 'dark' | 'auto';

declare namespace App {
  namespace Theme {
    interface ThemeSetting {
      /** 主题模式 */
      themeScheme: ThemeScheme;
      /** 灰度模式 */
      grayscale: boolean;
      /** 色弱模式 */
      colourWeakness: boolean;
      /** 主题色 */
      themeColor: string;
      /** 其他颜色 */
      otherColor: OtherColor;
      /** Token 配置 */
      tokens: {
        light: ThemeToken;
        dark?: Partial<ThemeToken>;
      };
    }

    interface OtherColor {
      info: string;
      success: string;
      warning: string;
      error: string;
    }

    interface ThemeColor {
      primary: string;
      info: string;
      success: string;
      warning: string;
      error: string;
    }

    interface ThemeToken {
      colors: {
        container: string;
        layout: string;
        inverted: string;
        'base-text': string;
      };
      boxShadow: {
        header: string;
        sider: string;
        tab: string;
      };
    }
  }
}
