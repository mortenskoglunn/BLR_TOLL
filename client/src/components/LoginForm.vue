<template>
  <v-row align="center" justify="center" class="fill-height">
    <v-col cols="12" sm="8" md="6" lg="4">
      <v-card class="elevation-12" rounded="lg">
        <v-card-title class="justify-center py-6">
          <div class="text-center">
            <v-icon size="64" color="primary" class="mb-4">mdi-flower</v-icon>
            <h2 class="primary--text">BLR TOLL</h2>
            <p class="text--secondary ma-0">Blomster Import System</p>
          </div>
        </v-card-title>
        
        <v-card-text class="px-6 pb-6">
          <v-form ref="form" v-model="valid" lazy-validation @submit.prevent="login">
            <v-text-field
              v-model="credentials.username"
              :rules="usernameRules"
              label="Brukernavn"
              prepend-inner-icon="mdi-account"
              outlined
              required
              autofocus
              :disabled="loading"
              @keyup.enter="login"
            ></v-text-field>
            
            <v-text-field
              v-model="credentials.password"
              :rules="passwordRules"
              :type="showPassword ? 'text' : 'password'"
              label="Passord"
              prepend-inner-icon="mdi-lock"
              :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
              @click:append-inner="showPassword = !showPassword"
              outlined
              required
              :disabled="loading"
              @keyup.enter="login"
            ></v-text-field>
            
            <v-btn
              :disabled="!valid || loading"
              :loading="loading"
              color="primary"
              block
              large
              @click="login"
              class="mb-4"
            >
              <v-icon left>mdi-login</v-icon>
              Logg inn
            </v-btn>
          </v-form>
          
          <!-- Error message -->
          <v-alert
            v-if="error"
            type="error"
            dense
            text
            class="mt-4"
          >
            {{ error }}
          </v-alert>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
import { ref, reactive } from 'vue'
import axios from 'axios'

export default {
  name: 'LoginForm',
  emits: ['login'],
  setup(props, { emit }) {
    const valid = ref(false)
    const loading = ref(false)
    const showPassword = ref(false)
    const error = ref('')
    const form = ref(null)
    
    const credentials = reactive({
      username: '',
      password: ''
    })
    
    const usernameRules = [
      v => !!v || 'Brukernavn er påkrevd',
      v => v.length >= 3 || 'Brukernavn må være minst 3 tegn'
    ]
    
    const passwordRules = [
      v => !!v || 'Passord er påkrevd',
      v => v.length >= 6 || 'Passord må være minst 6 tegn'
    ]
    
    const login = async () => {
      if (!form.value.validate()) return
      
      loading.value = true
      error.value = ''
      
      try {
        console.log('🔐 Attempting login for:', credentials.username)
        
        const response = await axios.post('/api/auth/login', {
          username: credentials.username,
          password: credentials.password
        })
        
        if (response.data.success) {
          const { user, token } = response.data
          
          // Lagre token
          localStorage.setItem('toll_token', token)
          
          console.log('✅ Login successful for:', user.username)
          
          // Emit login event til parent
          emit('login', user)
        } else {
          throw new Error(response.data.message || 'Login feilet')
        }
      } catch (err) {
        console.error('❌ Login error:', err)
        
        if (err.response) {
          // Server responerte med feilkode
          error.value = err.response.data.message || 'Login feilet'
        } else if (err.request) {
          // Forespørsel ble sendt men ingen respons
          error.value = 'Kan ikke nå serveren. Sjekk at backend kjører på port 5000.'
        } else {
          // Noe annet gikk galt
          error.value = err.message || 'Login feilet'
        }
      } finally {
        loading.value = false
      }
    }
    
    return {
      valid,
      loading,
      showPassword,
      error,
      form,
      credentials,
      usernameRules,
      passwordRules,
      login
    }
  }
}
</script>

<style scoped>
.v-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.v-card-title {
  background: white;
  margin: 16px;
  border-radius: 12px;
}
</style>