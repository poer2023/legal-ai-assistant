import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { useTheme } from './stores/theme'

useTheme().initTheme()
createApp(App).use(router).mount('#app')
