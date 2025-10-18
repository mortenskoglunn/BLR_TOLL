<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-6">
          <v-icon left color="primary">mdi-account-multiple</v-icon>
          Brukeradministrasjon
        </h1>
      </v-col>
    </v-row>

    <!-- Action buttons -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-account-plus</v-icon>
            Handlinger
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              @click="openCreateDialog"
            >
              <v-icon left>mdi-account-plus</v-icon>
              Ny Bruker
            </v-btn>
          </v-card-title>
          
          <v-card-text>
            <v-btn
              color="success"
              @click="loadUsers"
              :loading="loading"
              class="mr-2"
            >
              <v-icon left>mdi-refresh</v-icon>
              Oppdater Liste
            </v-btn>
            
            <v-chip class="ml-2" color="info">
              <v-icon left small>mdi-account</v-icon>
              {{ users.length }} brukere totalt
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Users table -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-account-group</v-icon>
            Brukerliste
            <v-spacer></v-spacer>
            <v-text-field
              v-model="search"
              append-icon="mdi-magnify"
              label="Søk brukere"
              single-line
              hide-details
              outlined
              dense
            ></v-text-field>
          </v-card-title>
          
          <v-card-text>
            <v-data-table
              :headers="headers"
              :items="users"
              :search="search"
              :loading="loading"
              class="elevation-1"
              :items-per-page="15"
            >
              <!-- Role column -->
              <template v-slot:item.role="{ item }">
                <v-chip
                  small
                  :color="getRoleColor(item.role)"
                  text-color="white"
                >
                  <v-icon left small>{{ getRoleIcon(item.role) }}</v-icon>
                  {{ getRoleText(item.role) }}
                </v-chip>
              </template>
              
              <!-- Active status column -->
              <template v-slot:item.active="{ item }">
                <v-chip
                  small
                  :color="item.active ? 'success' : 'error'"
                  text-color="white"
                >
                  <v-icon left small>
                    {{ item.active ? 'mdi-check' : 'mdi-close' }}
                  </v-icon>
                  {{ item.active ? 'Aktiv' : 'Inaktiv' }}
                </v-chip>
              </template>
              
              <!-- Last login column -->
              <template v-slot:item.last_login="{ item }">
                {{ formatDate(item.last_login) }}
              </template>
              
              <!-- Created at column -->
              <template v-slot:item.created_at="{ item }">
                {{ formatDate(item.created_at) }}
              </template>
              
              <!-- Actions column -->
              <template v-slot:item.actions="{ item }">
                <v-btn
                  small
                  color="primary"
                  @click="handleEditClick(item)"
                  class="mr-1"
                >
                  <v-icon small>mdi-pencil</v-icon>
                  Rediger
                </v-btn>
                
                <v-btn
                  small
                  :color="item.active ? 'warning' : 'success'"
                  @click="toggleUserStatus(item)"
                  :disabled="item.username === currentUser?.username"
                  class="mr-1"
                >
                  <v-icon small>
                    {{ item.active ? 'mdi-account-off' : 'mdi-account-check' }}
                  </v-icon>
                  {{ item.active ? 'Deaktiver' : 'Aktiver' }}
                </v-btn>
                
                <v-btn
                  small
                  color="error"
                  @click="handleDeleteClick(item)"
                  :disabled="item.username === currentUser?.username"
                >
                  <v-icon small>mdi-delete</v-icon>
                  Slett
                </v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Create/Edit User Dialog -->
    <v-dialog v-model="showDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title>
          <v-icon left :color="isEditing ? 'warning' : 'primary'">
            {{ isEditing ? 'mdi-account-edit' : 'mdi-account-plus' }}
          </v-icon>
          {{ isEditing ? 'Rediger Bruker' : 'Opprett Ny Bruker' }}
        </v-card-title>
        
        <v-card-text>
          <v-form ref="userForm" v-model="validForm">
            <v-text-field
              v-model="formData.username"
              label="Brukernavn"
              :rules="usernameRules"
              outlined
              prepend-inner-icon="mdi-account"
              :disabled="isEditing"
              required
            ></v-text-field>
            
            <v-text-field
              v-model="formData.fullName"
              label="Fullt navn"
              outlined
              prepend-inner-icon="mdi-account-details"
            ></v-text-field>
            
            <v-text-field
              v-model="formData.email"
              label="E-post"
              :rules="emailRules"
              outlined
              prepend-inner-icon="mdi-email"
              type="email"
            ></v-text-field>
            
            <v-select
              v-model="formData.role"
              :items="roleOptions"
              item-text="text"
              item-value="value"
              label="Rolle"
              :rules="roleRules"
              outlined
              prepend-inner-icon="mdi-shield-account"
              required
            ></v-select>
            
            <v-text-field
              v-if="!isEditing"
              v-model="formData.password"
              label="Passord"
              :rules="passwordRules"
              :type="showPassword ? 'text' : 'password'"
              :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
              @click:append-inner="showPassword = !showPassword"
              outlined
              prepend-inner-icon="mdi-lock"
              required
            ></v-text-field>
            
            <v-text-field
              v-if="!isEditing"
              v-model="formData.confirmPassword"
              label="Bekreft Passord"
              :rules="confirmPasswordRules"
              :type="showConfirmPassword ? 'text' : 'password'"
              :append-inner-icon="showConfirmPassword ? 'mdi-eye' : 'mdi-eye-off'"
              @click:append-inner="showConfirmPassword = !showConfirmPassword"
              outlined
              prepend-inner-icon="mdi-lock-check"
              required
            ></v-text-field>
            
            <!-- Change password section for editing -->
            <div v-if="isEditing">
              <v-divider class="my-4"></v-divider>
              <v-checkbox
                v-model="changePassword"
                label="Endre passord"
                color="warning"
              ></v-checkbox>
              
              <div v-if="changePassword">
                <v-text-field
                  v-model="formData.newPassword"
                  label="Nytt passord"
                  :rules="newPasswordRules"
                  :type="showNewPassword ? 'text' : 'password'"
                  :append-inner-icon="showNewPassword ? 'mdi-eye' : 'mdi-eye-off'"
                  @click:append-inner="showNewPassword = !showNewPassword"
                  outlined
                  prepend-inner-icon="mdi-lock"
                ></v-text-field>
                
                <v-text-field
                  v-model="formData.confirmNewPassword"
                  label="Bekreft nytt passord"
                  :rules="confirmNewPasswordRules"
                  :type="showConfirmNewPassword ? 'text' : 'password'"
                  :append-inner-icon="showConfirmNewPassword ? 'mdi-eye' : 'mdi-eye-off'"
                  @click:append-inner="showConfirmNewPassword = !showConfirmNewPassword"
                  outlined
                  prepend-inner-icon="mdi-lock-check"
                ></v-text-field>
              </div>
            </div>
            
            <v-switch
              v-model="formData.active"
              label="Aktiv bruker"
              color="success"
              class="mt-2"
            ></v-switch>
          </v-form>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="closeDialog">
            Avbryt
          </v-btn>
          <v-btn
            :color="isEditing ? 'warning' : 'primary'"
            :disabled="!validForm || saving"
            :loading="saving"
            @click="saveUser"
          >
            <v-icon left>{{ isEditing ? 'mdi-content-save' : 'mdi-account-plus' }}</v-icon>
            {{ isEditing ? 'Oppdater' : 'Opprett' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400px" persistent>
      <v-card>
        <v-card-title class="error white--text">
          <v-icon left color="white">mdi-alert</v-icon>
          Slett Bruker
        </v-card-title>
        
        <v-card-text class="pt-4">
          <v-alert type="warning" outlined class="mb-3">
            <strong>Advarsel!</strong> Denne handlingen kan ikke angres.
          </v-alert>
          
          <p>Er du sikker på at du vil slette brukeren?</p>
          
          <v-card outlined class="mt-3">
            <v-card-text>
              <div><strong>Brukernavn:</strong> {{ userToDelete?.username }}</div>
              <div><strong>Fullt navn:</strong> {{ userToDelete?.full_name || 'Ikke angitt' }}</div>
              <div><strong>Rolle:</strong> {{ getRoleText(userToDelete?.role) }}</div>
            </v-card-text>
          </v-card>
          
          <v-text-field
            v-model="deleteConfirmText"
            label="Skriv 'SLETT' for å bekrefte"
            outlined
            class="mt-3"
            :error="deleteConfirmText && deleteConfirmText !== 'SLETT'"
            error-message="Du må skrive 'SLETT' for å bekrefte"
          ></v-text-field>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="handleDeleteCancel">
            Avbryt
          </v-btn>
          <v-btn
            color="error"
            :disabled="deleteConfirmText !== 'SLETT' || deleting"
            :loading="deleting"
            @click="handleDeleteConfirm"
          >
            <v-icon left>mdi-delete</v-icon>
            Slett Bruker
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Notifications -->
    <v-snackbar
      v-model="showSnackbar"
      :color="snackbarColor"
      timeout="4000"
      top
      right
    >
      <v-icon left>{{ snackbarIcon }}</v-icon>
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script>
// eslint-disable-next-line vue/valid-v-slot
/* eslint-disable */
import { ref, reactive, computed, onMounted } from 'vue'
import axios from 'axios'

export default {
  name: 'AdminUsersView',
  setup() {
    // State
    const users = ref([])
    const loading = ref(false)
    const saving = ref(false)
    const search = ref('')
    const showDialog = ref(false)
    const isEditing = ref(false)
    const editingUser = ref(null)
    const validForm = ref(false)
    const changePassword = ref(false)
    
    // Delete dialog state
    const showDeleteDialog = ref(false)
    const userToDelete = ref(null)
    const deleteConfirmText = ref('')
    const deleting = ref(false)
    
    // Password visibility toggles
    const showPassword = ref(false)
    const showConfirmPassword = ref(false)
    const showNewPassword = ref(false)
    const showConfirmNewPassword = ref(false)
    
    // Form data
    const formData = reactive({
      username: '',
      fullName: '',
      email: '',
      role: 'user',
      password: '',
      confirmPassword: '',
      newPassword: '',
      confirmNewPassword: '',
      active: true
    })
    
    // Snackbar
    const showSnackbar = ref(false)
    const snackbarText = ref('')
    const snackbarColor = ref('success')
    const snackbarIcon = ref('mdi-check')
    
    // Current user (to prevent self-deactivation)
    const currentUser = computed(() => {
      const user = localStorage.getItem('toll_user')
      return user ? JSON.parse(user) : null
    })
    
    // Table headers
    const headers = [
      { text: 'Brukernavn', value: 'username' },
      { text: 'Fullt navn', value: 'full_name' },
      { text: 'E-post', value: 'email' },
      { text: 'Rolle', value: 'role' },
      { text: 'Status', value: 'active' },
      { text: 'Innlogginger', value: 'login_count' },
      { text: 'Siste login', value: 'last_login' },
      { text: 'Opprettet', value: 'created_at' },
      { text: 'Handlinger', value: 'actions', sortable: false }
    ]
    
    // Role options
    const roleOptions = [
      { text: 'Administrator', value: 'admin' },
      { text: 'Bruker', value: 'user' },
      { text: 'Leser', value: 'viewer' }
    ]
    
    // Form validation rules
    const usernameRules = [
      v => !!v || 'Brukernavn er påkrevd',
      v => v.length >= 3 || 'Brukernavn må være minst 3 tegn',
      v => /^[a-zA-Z0-9_]+$/.test(v) || 'Kun bokstaver, tall og underscore tillatt'
    ]
    
    const emailRules = [
      v => !v || /.+@.+\..+/.test(v) || 'E-post må være gyldig'
    ]
    
    const roleRules = [
      v => !!v || 'Rolle er påkrevd'
    ]
    
    const passwordRules = [
      v => !!v || 'Passord er påkrevd',
      v => v.length >= 6 || 'Passord må være minst 6 tegn'
    ]
    
    const confirmPasswordRules = [
      v => !!v || 'Bekreft passord er påkrevd',
      v => v === formData.password || 'Passordene må være like'
    ]
    
    const newPasswordRules = [
      v => !changePassword.value || !!v || 'Nytt passord er påkrevd',
      v => !changePassword.value || v.length >= 6 || 'Passord må være minst 6 tegn'
    ]
    
    const confirmNewPasswordRules = [
      v => !changePassword.value || !!v || 'Bekreft nytt passord er påkrevd',
      v => !changePassword.value || v === formData.newPassword || 'Passordene må være like'
    ]
    
    // Methods
    const showNotification = (text, color = 'success', icon = 'mdi-check') => {
      snackbarText.value = text
      snackbarColor.value = color
      snackbarIcon.value = icon
      showSnackbar.value = true
    }
    
    const loadUsers = async () => {
      loading.value = true
      try {
        const response = await axios.get('/api/auth/users')
        if (response.data.success) {
          users.value = response.data.users
          showNotification(`${users.value.length} brukere lastet`, 'info', 'mdi-account-group')
        }
      } catch (error) {
        showNotification(
          `Feil ved lasting av brukere: ${error.response?.data?.message || error.message}`,
          'error',
          'mdi-alert'
        )
      } finally {
        loading.value = false
      }
    }
    
    const openCreateDialog = () => {
      isEditing.value = false
      editingUser.value = null
      resetForm()
      showDialog.value = true
    }
    
    const handleEditClick = (user) => {
      isEditing.value = true
      editingUser.value = user
      fillForm(user)
      showDialog.value = true
    }
    
    const closeDialog = () => {
      showDialog.value = false
      changePassword.value = false
      resetForm()
    }
    
    const handleDeleteClick = (user) => {
      userToDelete.value = user
      deleteConfirmText.value = ''
      showDeleteDialog.value = true
    }
    
    const handleDeleteCancel = () => {
      showDeleteDialog.value = false
      userToDelete.value = null
      deleteConfirmText.value = ''
    }
    
    const handleDeleteConfirm = async () => {
      if (deleteConfirmText.value !== 'SLETT') return
      
      deleting.value = true
      
      try {
        const response = await axios.delete(`/api/auth/users/${userToDelete.value.id}`)
        
        if (response.data.success) {
          showNotification(
            `Bruker "${userToDelete.value.username}" er slettet`,
            'success',
            'mdi-delete'
          )
          handleDeleteCancel()
          loadUsers()
        }
      } catch (error) {
        showNotification(
          `Feil ved sletting: ${error.response?.data?.message || error.message}`,
          'error',
          'mdi-alert'
        )
      } finally {
        deleting.value = false
      }
    }
    
    const resetForm = () => {
      Object.assign(formData, {
        username: '',
        fullName: '',
        email: '',
        role: 'user',
        password: '',
        confirmPassword: '',
        newPassword: '',
        confirmNewPassword: '',
        active: true
      })
    }
    
    const fillForm = (user) => {
      Object.assign(formData, {
        username: user.username,
        fullName: user.full_name || '',
        email: user.email || '',
        role: user.role,
        password: '',
        confirmPassword: '',
        newPassword: '',
        confirmNewPassword: '',
        active: user.active
      })
    }
    
    const saveUser = async () => {
      if (!validForm.value) return
      
      saving.value = true
      
      try {
        if (isEditing.value) {
          await updateUser()
        } else {
          await createUser()
        }
      } finally {
        saving.value = false
      }
    }
    
    const createUser = async () => {
      try {
        const userData = {
          username: formData.username,
          password: formData.password,
          role: formData.role,
          fullName: formData.fullName || null,
          email: formData.email || null
        }
        
        const response = await axios.post('/api/auth/register', userData)
        
        if (response.data.success) {
          showNotification(`Bruker "${formData.username}" opprettet!`, 'success')
          closeDialog()
          loadUsers()
        }
      } catch (error) {
        showNotification(
          `Feil ved opprettelse: ${error.response?.data?.message || error.message}`,
          'error',
          'mdi-alert'
        )
      }
    }
    
    const updateUser = async () => {
      try {
        const userData = {
          fullName: formData.fullName || null,
          email: formData.email || null,
          role: formData.role,
          active: formData.active
        }
        
        if (changePassword.value) {
          userData.newPassword = formData.newPassword
        }
        
        const response = await axios.put(`/api/auth/users/${editingUser.value.id}`, userData)
        
        if (response.data.success) {
          showNotification(`Bruker "${formData.username}" oppdatert!`, 'success')
          closeDialog()
          loadUsers()
        }
      } catch (error) {
        showNotification(
          `Feil ved oppdatering: ${error.response?.data?.message || error.message}`,
          'error',
          'mdi-alert'
        )
      }
    }
    
    const toggleUserStatus = async (user) => {
      try {
        const newStatus = !user.active
        const response = await axios.put(`/api/auth/users/${user.id}`, {
          active: newStatus
        })
        
        if (response.data.success) {
          user.active = newStatus
          showNotification(
            `Bruker "${user.username}" ${newStatus ? 'aktivert' : 'deaktivert'}`,
            newStatus ? 'success' : 'warning',
            newStatus ? 'mdi-account-check' : 'mdi-account-off'
          )
        }
      } catch (error) {
        showNotification(
          `Feil ved statusendring: ${error.response?.data?.message || error.message}`,
          'error',
          'mdi-alert'
        )
      }
    }
    
    // Helper functions
    const getRoleColor = (role) => {
      const colors = {
        'admin': 'red',
        'user': 'blue',
        'viewer': 'green'
      }
      return colors[role] || 'grey'
    }
    
    const getRoleIcon = (role) => {
      const icons = {
        'admin': 'mdi-shield-crown',
        'user': 'mdi-account',
        'viewer': 'mdi-eye'
      }
      return icons[role] || 'mdi-account'
    }
    
    const getRoleText = (role) => {
      const texts = {
        'admin': 'Administrator',
        'user': 'Bruker',
        'viewer': 'Leser'
      }
      return texts[role] || role
    }
    
    const formatDate = (dateString) => {
      if (!dateString) return 'Aldri'
      return new Date(dateString).toLocaleString('no-NO')
    }
    
    // Load users on mount
    onMounted(() => {
      loadUsers()
    })
    
    return {
      // Data
      users,
      loading,
      saving,
      search,
      showDialog,
      isEditing,
      editingUser,
      validForm,
      changePassword,
      formData,
      headers,
      roleOptions,
      currentUser,
      
      // Delete dialog
      showDeleteDialog,
      userToDelete,
      deleteConfirmText,
      deleting,
      
      // Password visibility
      showPassword,
      showConfirmPassword,
      showNewPassword,
      showConfirmNewPassword,
      
      // Validation rules
      usernameRules,
      emailRules,
      roleRules,
      passwordRules,
      confirmPasswordRules,
      newPasswordRules,
      confirmNewPasswordRules,
      
      // Snackbar
      showSnackbar,
      snackbarText,
      snackbarColor,
      snackbarIcon,
      
      // Methods
      loadUsers,
      openCreateDialog,
      handleEditClick,
      closeDialog,
      handleDeleteClick,
      handleDeleteCancel,
      handleDeleteConfirm,
      saveUser,
      toggleUserStatus,
      getRoleColor,
      getRoleIcon,
      getRoleText,
      formatDate
    }
  }
}
</script>

<style scoped>
.v-data-table {
  border-radius: 8px;
}

.v-card {
  transition: all 0.3s ease;
}
</style>