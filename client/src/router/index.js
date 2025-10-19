import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue')
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/excel-import',
    name: 'ExcelImport',
    component: () => import('@/views/ExcelImport.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/test',
    name: 'TestView', 
    component: () => import('@/views/TestView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin-users',
    name: 'AdminUsers',
    component: () => import('@/views/AdminUsers.vue'),
    meta: { 
      requiresAuth: true,
      requiresRole: 'admin'
    }
  },
  {
    path: '/excel-templates',
    name: 'ExcelTemplates',
    component: () => import('@/views/ExcelTemplates.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/products-import',
    name: 'ProductsImport',
    component: () => import('@/views/Products_import.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/product-search',
    name: 'ProductSearch',
    component: () => import('@/views/ProductSearch.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

// Navigation guards
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresRole = to.meta.requiresRole
  const user = JSON.parse(localStorage.getItem('toll_user') || 'null')
  const token = localStorage.getItem('toll_token')
  
  if (requiresAuth && (!user || !token)) {
    next('/')
  } else if (requiresRole && user) {
    if (user.role === 'admin' || user.role === requiresRole) {
      next()
    } else {
      alert('Du har ikke tilgang til denne siden')
      next('/dashboard')
    }
  } else {
    next()
  }
})

export default router