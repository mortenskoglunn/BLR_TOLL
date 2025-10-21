<template>
  <v-app>
    <!-- App Bar -->
    <v-app-bar app color="primary" dark elevation="4">
      <v-app-bar-nav-icon @click="drawer = !drawer" v-if="user"></v-app-bar-nav-icon>
      
      <v-toolbar-title class="font-weight-bold" @click="goToHome" style="cursor: pointer;">
        <v-icon left>mdi-flower</v-icon>
        BLR TOLL System
      </v-toolbar-title>
      
      <v-spacer></v-spacer>
      
      <!-- User info hvis logget inn -->
      <div v-if="user" class="d-flex align-center">
        <v-chip class="mr-3" color="white" text-color="primary" small>
          <v-icon left small>mdi-account-circle</v-icon>
          {{ user.username }} ({{ user.role }})
        </v-chip>
        
        <v-btn icon @click="logout" title="Logg ut">
          <v-icon>mdi-logout</v-icon>
        </v-btn>
      </div>
    </v-app-bar>

    <!-- Navigation Drawer -->
    <v-navigation-drawer v-model="drawer" app temporary v-if="user">
      <v-list>
        <!-- User info -->
        <v-list-item>
          <v-list-item-avatar>
            <v-icon color="primary" large>mdi-account-circle</v-icon>
          </v-list-item-avatar>
          <v-list-item-content>
            <v-list-item-title class="font-weight-bold">
              {{ user.fullName || user.username }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ getRoleText(user.role) }}
            </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
        
        <v-divider class="my-2"></v-divider>
        
        <!-- Navigation items -->
        <v-list-item
          v-for="item in getFilteredNavigationItems()"
          :key="item.route"
          :to="item.route"
          color="primary"
        >
          <v-list-item-icon>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ item.title }}</v-list-item-title>
            <v-list-item-subtitle v-if="item.subtitle">
              {{ item.subtitle }}
            </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
      </v-list>

      <template v-slot:append>
        <div class="pa-2">
          <v-btn block color="red" dark @click="logout">
            <v-icon left>mdi-logout</v-icon>
            Logg ut
          </v-btn>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Main content -->
    <v-main>
      <!-- Innlogging hvis ikke logget inn -->
      <v-container fluid class="fill-height" v-if="!user">
        <LoginForm @login="handleLogin" />
      </v-container>
      
      <!-- Router view hvis logget inn -->
      <div v-else>
        <router-view />
      </div>
    </v-main>

    <!-- Global notifications -->
    <v-snackbar
      v-model="notification.show"
      :color="notification.color"
      :timeout="4000"
      top
      right
    >
      <v-icon left>{{ notification.icon }}</v-icon>
      {{ notification.text }}
      <template v-slot:action="{ attrs }">
        <v-btn text v-bind="attrs" @click="notification.show = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import LoginForm from '@/components/LoginForm.vue'

export default {
  name: 'App',
  components: {
    LoginForm
  },
  setup() {
    const router = useRouter()
    const user = ref(null)
    const drawer = ref(false)
    
    const notification = reactive({
      show: false,
      text: '',
      color: 'info',
      icon: 'mdi-information'
    })
    
    const navigationItems = ref([
      {
        title: 'Dashboard',
        subtitle: 'Oversikt og statistikk',
        icon: 'mdi-view-dashboard',
        route: '/dashboard'
      },
      {
        title: 'Produktsøk',
        subtitle: 'Søk i produktdatabase',
        icon: 'mdi-database-search',
        route: '/product-search'
      },
      {
        title: 'Firmasøk',
        subtitle: 'Søk i firmadatabase',
        icon: 'mdi-office-building',
        route: '/company-search'
      },
      {
        title: 'Frihandelssøk',
        subtitle: 'Søk i frihandelsdatabase',
        icon: 'mdi-earth',
        route: '/frihandel-search'
      },
      {
        title: 'HS-kode søk',
        subtitle: 'Søk i HS-kode database (EU/Norge)',
        icon: 'mdi-barcode',
        route: '/hseuno-search'
      },
      {
        title: 'Importerte Produkter',
        subtitle: 'Se alle importerte produkter',
        icon: 'mdi-package-variant',
        route: '/products-import'
      },
      {
        title: 'Excel Import',
        subtitle: 'Last opp og behandle Excel-filer',
        icon: 'mdi-file-excel',
        route: '/excel-import'
      },
      {
        title: 'Excel Maler',
        subtitle: 'Administrer import-maler',
        icon: 'mdi-file-excel-outline',
        route: '/excel-templates'
      },
      {
        title: 'Test API',
        subtitle: 'Test database forbindelse',
        icon: 'mdi-test-tube',
        route: '/test'
      },
      {
        title: 'Admin Users',
        subtitle: 'Administrer brukere',
        icon: 'mdi-account-multiple',
        route: '/admin-users',
        requiresRole: 'admin'
      }
    ])
    
    const getFilteredNavigationItems = () => {
      if (!user.value) return []
      
      return navigationItems.value.filter(item => {
        // Hvis item krever en rolle, sjekk om brukeren har den
        if (item.requiresRole) {
          return user.value.role === 'admin' || user.value.role === item.requiresRole
        }
        // Ellers vis item for alle innloggede brukere
        return true
      })
    }
    
    const showNotification = (text, color = 'info', icon = 'mdi-information') => {
      notification.text = text
      notification.color = color
      notification.icon = icon
      notification.show = true
    }
    
    const handleLogin = (userData) => {
      user.value = userData
      localStorage.setItem('toll_user', JSON.stringify(userData))
      showNotification(`Velkommen, ${userData.username}!`, 'success', 'mdi-check')
      
      // Redirect to dashboard
      router.push('/dashboard')
    }
    
    const logout = () => {
      user.value = null
      localStorage.removeItem('toll_token')
      localStorage.removeItem('toll_user')
      showNotification('Du er logget ut', 'info', 'mdi-logout')
      
      // Redirect to home
      router.push('/')
    }
    
    const getRoleText = (role) => {
      const roleTexts = {
        'admin': 'Administrator',
        'user': 'Bruker', 
        'viewer': 'Leser'
      }
      return roleTexts[role] || role
    }
    
    const goToHome = () => {
      if (user.value) {
        router.push('/dashboard')
      } else {
        router.push('/')
      }
    }
    
    // Check if user is already logged in on app start
    onMounted(() => {
      const savedUser = localStorage.getItem('toll_user')
      const savedToken = localStorage.getItem('toll_token')
      
      if (savedUser && savedToken) {
        try {
          user.value = JSON.parse(savedUser)
          console.log('User restored from localStorage:', user.value)
          
          // If we're on the home page, redirect to dashboard
          if (router.currentRoute.value.path === '/') {
            router.push('/dashboard')
          }
        } catch (error) {
          console.error('Error parsing saved user:', error)
          localStorage.removeItem('toll_user')
          localStorage.removeItem('toll_token')
        }
      }
    })
    
    return {
      user,
      drawer,
      notification,
      navigationItems,
      getFilteredNavigationItems,
      handleLogin,
      logout,
      getRoleText,
      goToHome
    }
  }
}
</script>

<style scoped>
.v-app-bar-title {
  cursor: pointer;
}

.v-navigation-drawer {
  z-index: 1000;
}
</style>