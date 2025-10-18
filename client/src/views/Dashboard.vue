<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-6">
          <v-icon left color="primary">mdi-view-dashboard</v-icon>
          Dashboard
        </h1>
      </v-col>
    </v-row>

    <!-- Stats kort -->
    <v-row>
      <v-col cols="12" md="3" v-for="stat in stats" :key="stat.title">
        <v-card :color="stat.color" dark>
          <v-card-text>
            <div class="d-flex align-center">
              <div>
                <h3 class="text-h5">{{ stat.value }}</h3>
                <p class="mb-0">{{ stat.title }}</p>
              </div>
              <v-spacer></v-spacer>
              <v-icon size="40">{{ stat.icon }}</v-icon>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick Actions -->
    <v-row class="mt-6">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-lightning-bolt</v-icon>
            Hurtighandlinger
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="4" v-for="action in quickActions" :key="action.title">
                <v-btn
                  :to="action.route"
                  :color="action.color"
                  block
                  large
                  class="mb-3"
                >
                  <v-icon left>{{ action.icon }}</v-icon>
                  {{ action.title }}
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Recent Activity -->
    <v-row class="mt-6">
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-history</v-icon>
            Siste aktivitet
          </v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item v-for="activity in recentActivity" :key="activity.id">
                <v-list-item-avatar>
                  <v-icon :color="activity.color">{{ activity.icon }}</v-icon>
                </v-list-item-avatar>
                <v-list-item-content>
                  <v-list-item-title>{{ activity.title }}</v-list-item-title>
                  <v-list-item-subtitle>{{ activity.time }}</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-information</v-icon>
            System Info
          </v-card-title>
          <v-card-text>
            <v-simple-table dense>
              <tbody>
                <tr>
                  <td>Versjon</td>
                  <td>1.0.0</td>
                </tr>
                <tr>
                  <td>Database</td>
                  <td class="text-success">Tilkoblet</td>
                </tr>
                <tr>
                  <td>Siste backup</td>
                  <td>{{ new Date().toLocaleDateString('no-NO') }}</td>
                </tr>
              </tbody>
            </v-simple-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from 'axios'

export default {
  name: 'DashboardView', // Changed to multi-word
  setup() {
    const stats = ref([
      { title: 'Total Blomster', value: '0', icon: 'mdi-flower', color: 'primary' },
      { title: 'Excel Importer', value: '0', icon: 'mdi-file-excel', color: 'success' },
      { title: 'Database Søk', value: '0', icon: 'mdi-database-search', color: 'info' },
      { title: 'Aktive Brukere', value: '3', icon: 'mdi-account-multiple', color: 'warning' }
    ])
    
    const quickActions = ref([
      { title: 'Import Excel', route: '/excel-import', icon: 'mdi-file-excel', color: 'primary' },
      { title: 'Søk Database', route: '/database-search', icon: 'mdi-database-search', color: 'success' }
    ])
    
    const recentActivity = ref([
      { id: 1, title: 'Excel fil importert', time: 'For 2 timer siden', icon: 'mdi-file-excel', color: 'success' },
      { id: 2, title: 'Database søk utført', time: 'For 4 timer siden', icon: 'mdi-database-search', color: 'info' },
      { id: 3, title: 'Bruker logget inn', time: 'For 1 dag siden', icon: 'mdi-login', color: 'primary' }
    ])
    
    const loadStats = async () => {
      try {
        const response = await axios.get('/api/database/stats')
        if (response.data.success) {
          stats.value[0].value = response.data.stats.total_blomster.toString()
        }
      } catch (error) {
        console.error('Failed to load stats:', error)
      }
    }
    
    onMounted(() => {
      loadStats()
    })
    
    return {
      stats,
      quickActions,
      recentActivity
    }
  }
}
</script>