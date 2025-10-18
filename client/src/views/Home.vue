<template>
  <v-container fluid class="fill-height">
    <LoginForm @login="handleLogin" />
  </v-container>
</template>

<script>
import LoginForm from '@/components/LoginForm.vue'

export default {
  name: 'HomeView', // Changed to multi-word
  components: {
    LoginForm
  },
  setup() {
    const handleLogin = () => {
      // Redirect to dashboard after login
      window.location.href = '/dashboard'
    }
    
    return {
      handleLogin
    }
  }
}
</script>