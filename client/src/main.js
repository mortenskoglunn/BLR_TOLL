import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

// Axios setup
import axios from 'axios'

// Configure axios defaults
axios.defaults.baseURL = process.env.VUE_APP_API_URL || 'http://localhost:5000'
axios.defaults.timeout = 30000

// Request interceptor to add auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('toll_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('toll_token')
      localStorage.removeItem('toll_user')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

// Create Vuetify instance
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1976D2',
          secondary: '#424242',
          accent: '#82B1FF',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FF9800'
        }
      }
    }
  }
})

// Create app with router
const app = createApp(App)
app.config.globalProperties.$http = axios
app.use(router).use(vuetify).mount('#app')