<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-6">
          <v-icon left color="primary">mdi-test-tube</v-icon>
          API Test Side
        </h1>
      </v-col>
    </v-row>

    <!-- Database Connection Test -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card class="mb-4">
          <v-card-title>
            <v-icon left>mdi-database</v-icon>
            Database Test
          </v-card-title>
          <v-card-text>
            <p>Test forbindelsen til SQL Server database.</p>
            <v-btn 
              color="primary" 
              @click="testDatabase" 
              :loading="testing.database"
            >
              <v-icon left>mdi-database-check</v-icon>
              Test Database
            </v-btn>
            
            <v-alert 
              v-if="results.database" 
              :type="results.database.success ? 'success' : 'error'"
              class="mt-4"
            >
              <strong>Resultat:</strong> {{ results.database.message }}
              <div v-if="results.database.data" class="mt-2">
                <small>{{ JSON.stringify(results.database.data, null, 2) }}</small>
              </div>
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="mb-4">
          <v-card-title>
            <v-icon left>mdi-flower</v-icon>
            Blomster Søk Test
          </v-card-title>
          <v-card-text>
            <p>Test søk i blomster-database.</p>
            <v-text-field
              v-model="searchTerm"
              label="Blomst navn"
              outlined
              dense
              prepend-inner-icon="mdi-magnify"
            ></v-text-field>
            
            <v-btn 
              color="success" 
              @click="searchBlomster" 
              :loading="testing.search"
              :disabled="!searchTerm"
            >
              <v-icon left>mdi-database-search</v-icon>
              Søk Blomst
            </v-btn>
            
            <v-alert 
              v-if="results.search" 
              :type="results.search.success ? 'success' : 'error'"
              class="mt-4"
            >
              <strong>Resultat:</strong> {{ results.search.message }}
              <div v-if="results.search.data" class="mt-2">
                <v-chip small color="info" class="mr-2">
                  Vekt: {{ results.search.data.vekt }}kg
                </v-chip>
                <v-chip small color="warning">
                  {{ results.search.data.klassifisering }}
                </v-chip>
              </div>
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- User Info Test -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-account</v-icon>
            Bruker Info
          </v-card-title>
          <v-card-text>
            <v-btn 
              color="info" 
              @click="getUserInfo" 
              :loading="testing.user"
            >
              <v-icon left>mdi-account-details</v-icon>
              Hent Bruker Info
            </v-btn>
            
            <v-alert 
              v-if="results.user" 
              :type="results.user.success ? 'success' : 'error'"
              class="mt-4"
            >
              <div v-if="results.user.success && results.user.data">
                <strong>Bruker:</strong> {{ results.user.data.username }}<br>
                <strong>Rolle:</strong> {{ results.user.data.role }}<br>
                <strong>Login count:</strong> {{ results.user.data.login_count }}<br>
                <strong>Siste login:</strong> {{ formatDate(results.user.data.last_login) }}
              </div>
              <div v-else>
                <strong>Feil:</strong> {{ results.user.message }}
              </div>
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-chart-bar</v-icon>
            Database Statistikk
          </v-card-title>
          <v-card-text>
            <v-btn 
              color="warning" 
              @click="getStats" 
              :loading="testing.stats"
            >
              <v-icon left>mdi-chart-line</v-icon>
              Hent Statistikk
            </v-btn>
            
            <div v-if="results.stats && results.stats.success" class="mt-4">
              <v-row>
                <v-col cols="6" v-for="stat in statsDisplay" :key="stat.label">
                  <v-card color="blue-grey lighten-5" flat>
                    <v-card-text class="text-center">
                      <div class="text-h6">{{ stat.value }}</div>
                      <div class="caption">{{ stat.label }}</div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </div>
            
            <v-alert 
              v-if="results.stats && !results.stats.success" 
              type="error"
              class="mt-4"
            >
              <strong>Feil:</strong> {{ results.stats.message }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, reactive, computed } from 'vue'
import axios from 'axios'

export default {
  name: 'TestView',
  setup() {
    const searchTerm = ref('rose')
    
    const testing = reactive({
      database: false,
      search: false,
      user: false,
      stats: false
    })
    
    const results = reactive({
      database: null,
      search: null,
      user: null,
      stats: null
    })
    
    const statsDisplay = computed(() => {
      if (!results.stats || !results.stats.success) return []
      
      const stats = results.stats.data
      return [
        { label: 'Totale Blomster', value: stats.total_blomster || 0 },
        { label: 'Klassifiseringer', value: stats.unique_classifications || 0 },
        { label: 'Gjennomsnitts Vekt', value: (stats.average_weight || 0).toFixed(2) + ' kg' },
        { label: 'Maks Vekt', value: (stats.max_weight || 0).toFixed(2) + ' kg' }
      ]
    })
    
    const testDatabase = async () => {
      testing.database = true
      results.database = null
      
      try {
        const response = await axios.get('/health')
        results.database = {
          success: true,
          message: 'Database forbindelse OK',
          data: {
            status: response.data.status,
            uptime: Math.round(response.data.uptime) + 's'
          }
        }
      } catch (error) {
        results.database = {
          success: false,
          message: error.response?.data?.message || error.message
        }
      } finally {
        testing.database = false
      }
    }
    
    const searchBlomster = async () => {
      testing.search = true
      results.search = null
      
      try {
        const response = await axios.get(`/api/database/search?blomst=${encodeURIComponent(searchTerm.value)}`)
        
        if (response.data.found) {
          results.search = {
            success: true,
            message: `Blomst "${response.data.bestMatch.navn}" funnet!`,
            data: {
              navn: response.data.bestMatch.navn,
              vekt: response.data.bestMatch.vekt,
              klassifisering: response.data.bestMatch.klassifisering
            }
          }
        } else {
          results.search = {
            success: false,
            message: `Blomst "${searchTerm.value}" ikke funnet i database`
          }
        }
      } catch (error) {
        results.search = {
          success: false,
          message: error.response?.data?.message || error.message
        }
      } finally {
        testing.search = false
      }
    }
    
    const getUserInfo = async () => {
      testing.user = true
      results.user = null
      
      try {
        const response = await axios.get('/api/auth/me')
        results.user = {
          success: true,
          message: 'Bruker info hentet',
          data: response.data.user
        }
      } catch (error) {
        results.user = {
          success: false,
          message: error.response?.data?.message || error.message
        }
      } finally {
        testing.user = false
      }
    }
    
    const getStats = async () => {
      testing.stats = true
      results.stats = null
      
      try {
        const response = await axios.get('/api/database/stats')
        results.stats = {
          success: true,
          message: 'Statistikk hentet',
          data: response.data.stats
        }
      } catch (error) {
        results.stats = {
          success: false,
          message: error.response?.data?.message || error.message
        }
      } finally {
        testing.stats = false
      }
    }
    
    const formatDate = (dateString) => {
      if (!dateString) return 'Aldri'
      return new Date(dateString).toLocaleString('no-NO')
    }
    
    return {
      searchTerm,
      testing,
      results,
      statsDisplay,
      testDatabase,
      searchBlomster,
      getUserInfo,
      getStats,
      formatDate
    }
  }
}
</script>