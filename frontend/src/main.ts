import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import App from './App.vue'
import router from './router'
import { useThemeStore } from './store/modules/theme'
import AppDataTable from './components/common/AppDataTable'
import './styles/reset.css'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(naive)
app.component('NDataTable', AppDataTable)

// 初始化主题（必须在 mount 之前，确保 CSS 变量先设置好）
const themeStore = useThemeStore()
themeStore.init()

app.mount('#app')
