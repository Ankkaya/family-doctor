/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主题色（使用 CSS 变量）
        primary: {
          DEFAULT: 'rgb(var(--primary-color))',
          50: 'rgb(var(--primary-50-color))',
          100: 'rgb(var(--primary-100-color))',
          200: 'rgb(var(--primary-200-color))',
          300: 'rgb(var(--primary-300-color))',
          400: 'rgb(var(--primary-400-color))',
          500: 'rgb(var(--primary-500-color))',
          600: 'rgb(var(--primary-600-color))',
          700: 'rgb(var(--primary-700-color))',
          800: 'rgb(var(--primary-800-color))',
          900: 'rgb(var(--primary-900-color))',
        },
        // 功能色
        info: 'rgb(var(--info-color))',
        success: 'rgb(var(--success-color))',
        warning: 'rgb(var(--warning-color))',
        error: 'rgb(var(--error-color))',
        // 背景色
        container: 'rgb(var(--container-bg-color))',
        layout: 'rgb(var(--layout-bg-color))',
        inverted: 'rgb(var(--inverted-bg-color))',
        // 文字色
        'base-text': 'rgb(var(--base-text-color))',
      },
      boxShadow: {
        'header': 'var(--header-box-shadow)',
        'sider': 'var(--sider-box-shadow)',
        'tab': 'var(--tab-box-shadow)',
      },
    },
  },
  plugins: [],
}
