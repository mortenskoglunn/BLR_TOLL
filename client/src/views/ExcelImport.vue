<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-6">
          <v-icon left color="primary">mdi-file-excel</v-icon>
          Excel Import
        </h1>
      </v-col>
    </v-row>

    <!-- Velg mal først -->
    <v-row v-if="!selectedTemplate">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-file-excel-outline</v-icon>
            Velg Import-mal
          </v-card-title>
          
          <v-card-text>
            <v-alert type="info" outlined class="mb-4">
              <strong>Trinn 1:</strong> Velg hvilken import-mal som skal brukes for Excel-filen din.
            </v-alert>

            <v-text-field
              v-model="templateSearch"
              append-icon="mdi-magnify"
              label="Søk etter mal"
              outlined
              dense
              class="mb-4"
            ></v-text-field>

            <v-progress-linear v-if="loadingTemplates" indeterminate color="primary"></v-progress-linear>

            <v-list v-if="!loadingTemplates">
              <v-list-item
                v-for="template in filteredTemplates"
                :key="template.id"
                @click="selectTemplate(template)"
                :disabled="!template.active"
                class="template-item"
              >
                <v-list-item-avatar>
                  <v-icon :color="template.active ? 'primary' : 'grey'">
                    mdi-file-excel-outline
                  </v-icon>
                </v-list-item-avatar>

                <v-list-item-content>
                  <v-list-item-title>
                    {{ template.name }}
                    <v-chip v-if="!template.active" x-small color="error" class="ml-2">
                      Inaktiv
                    </v-chip>
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    Leverandør: {{ template.supplier_name }} • 
                    {{ template.column_count }} kolonner • 
                    {{ template.has_header ? 'Med header' : 'Uten header' }}
                  </v-list-item-subtitle>
                </v-list-item-content>

                <v-list-item-action>
                  <v-btn icon color="primary">
                    <v-icon>mdi-chevron-right</v-icon>
                  </v-btn>
                </v-list-item-action>
              </v-list-item>

              <v-list-item v-if="filteredTemplates.length === 0">
                <v-list-item-content>
                  <v-list-item-title class="text-center grey--text">
                    <v-icon large color="grey lighten-1">mdi-alert-circle-outline</v-icon>
                    <div class="mt-2">Ingen aktive maler funnet</div>
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-center mt-2">
                    <v-btn color="primary" outlined small @click="goToTemplates">
                      <v-icon left small>mdi-plus</v-icon>
                      Opprett ny mal
                    </v-btn>
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Valgt mal og fil-upload -->
    <v-row v-if="selectedTemplate">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-check-circle</v-icon>
            Valgt mal
            <v-spacer></v-spacer>
            <v-btn text color="primary" @click="changeTemplate">
              <v-icon left>mdi-swap-horizontal</v-icon>
              Bytt mal
            </v-btn>
          </v-card-title>

          <v-card-text>
            <v-alert type="success" outlined>
              <div class="d-flex align-center">
                <v-icon left color="success">mdi-file-excel-outline</v-icon>
                <div>
                  <strong>{{ selectedTemplate.name }}</strong>
                  <div class="text-caption">
                    Leverandør: {{ selectedTemplate.supplier_name }} • 
                    {{ selectedTemplate.column_count }} kolonner definert
                  </div>
                </div>
              </div>
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Fil-upload -->
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-upload</v-icon>
            <strong>Trinn 2:</strong> Last opp Excel-fil
          </v-card-title>

          <v-card-text>
            <v-file-input
              v-model="file"
              label="Velg Excel-fil"
              accept=".xlsx,.xls"
              prepend-icon="mdi-file-excel"
              outlined
              :disabled="uploading"
              show-size
              @change="handleFileSelect"
            >
              <template v-slot:selection="{ text }">
                <v-chip small color="primary" label>
                  <v-icon left small>mdi-file-excel</v-icon>
                  {{ text }}
                </v-chip>
              </template>
            </v-file-input>

            <v-alert v-if="selectedTemplate.has_header" type="info" dense outlined>
              <v-icon left small>mdi-information</v-icon>
              Første rad i Excel-filen vil bli ignorert (header-rad)
            </v-alert>

            <v-alert v-else type="warning" dense outlined>
              <v-icon left small>mdi-alert</v-icon>
              Excel-filen skal IKKE ha header-rad. Data starter fra første rad.
            </v-alert>

            <v-btn
              color="primary"
              large
              block
              :disabled="!file || uploading"
              :loading="uploading"
              @click="uploadFile"
              class="mt-4"
            >
              <v-icon left>mdi-upload</v-icon>
              Last opp og importer
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Import resultat -->
    <v-row v-if="importResult">
      <v-col cols="12">
        <v-card :color="importResult.success ? 'success' : 'error'" dark>
          <v-card-title>
            <v-icon left>{{ importResult.success ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
            Import {{ importResult.success ? 'Fullført' : 'Feilet' }}
          </v-card-title>

          <v-card-text>
            <div v-if="importResult.success">
              <p><strong>Fil:</strong> {{ importResult.filename }}</p>
              <p><strong>Rader behandlet:</strong> {{ importResult.rowsProcessed }}</p>
              <p><strong>Vellykkede:</strong> {{ importResult.rowsSuccessful }}</p>
              <p><strong>Feilet:</strong> {{ importResult.rowsFailed }}</p>
            </div>
            <div v-else>
              <p><strong>Feilmelding:</strong> {{ importResult.error }}</p>
            </div>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text @click="resetImport">
              Importer ny fil
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

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
/* eslint-disable */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

export default {
  name: 'ExcelImportView',
  setup() {
    const router = useRouter()
    
    // State
    const templates = ref([])
    const loadingTemplates = ref(false)
    const selectedTemplate = ref(null)
    const templateSearch = ref('')
    const file = ref(null)
    const uploading = ref(false)
    const importResult = ref(null)
    
    // Snackbar
    const showSnackbar = ref(false)
    const snackbarText = ref('')
    const snackbarColor = ref('success')
    const snackbarIcon = ref('mdi-check')
    
    // Computed
    const filteredTemplates = computed(() => {
      if (!templateSearch.value) {
        return templates.value.filter(t => t.active)
      }
      
      const search = templateSearch.value.toLowerCase()
      return templates.value.filter(t => 
        t.active && (
          t.name.toLowerCase().includes(search) ||
          t.supplier_name.toLowerCase().includes(search)
        )
      )
    })
    
    // Methods
    const showNotification = (text, color = 'success', icon = 'mdi-check') => {
      snackbarText.value = text
      snackbarColor.value = color
      snackbarIcon.value = icon
      showSnackbar.value = true
    }
    
    const loadTemplates = async () => {
      loadingTemplates.value = true
      try {
        const response = await axios.get('/api/auth/excel-templates')
        if (response.data.success) {
          templates.value = response.data.templates.map(template => ({
            ...template,
            column_count: template.column_mappings?.length || 0,
            column_mappings: JSON.parse(template.column_mappings || '[]')
          }))
        }
      } catch (error) {
        showNotification(
          `Feil ved lasting av maler: ${error.response?.data?.message || error.message}`,
          'error',
          'mdi-alert'
        )
      } finally {
        loadingTemplates.value = false
      }
    }
    
    const selectTemplate = (template) => {
      selectedTemplate.value = template
      showNotification(`Mal "${template.name}" valgt`, 'info', 'mdi-check')
    }
    
    const changeTemplate = () => {
      selectedTemplate.value = null
      file.value = null
      importResult.value = null
    }
    
    const goToTemplates = () => {
      router.push('/excel-templates')
    }
    
    const handleFileSelect = () => {
      if (file.value) {
        showNotification(`Fil valgt: ${file.value.name}`, 'info', 'mdi-file-excel')
      }
    }
    
    const uploadFile = async () => {
      if (!file.value || !selectedTemplate.value) return
      
      uploading.value = true
      importResult.value = null
      
      try {
        const formData = new FormData()
        formData.append('file', file.value)
        formData.append('templateId', selectedTemplate.value.id)
        formData.append('templateName', selectedTemplate.value.name)
        formData.append('supplierName', selectedTemplate.value.supplier_name)
        formData.append('hasHeader', selectedTemplate.value.has_header)
        formData.append('columnMappings', JSON.stringify(selectedTemplate.value.column_mappings))
        
        const response = await axios.post('/api/upload/excel', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        if (response.data.success) {
          importResult.value = {
            success: true,
            filename: file.value.name,
            rowsProcessed: response.data.rowsProcessed || 0,
            rowsSuccessful: response.data.rowsSuccessful || 0,
            rowsFailed: response.data.rowsFailed || 0
          }
          showNotification('Import fullført!', 'success', 'mdi-check-circle')
        }
      } catch (error) {
        importResult.value = {
          success: false,
          error: error.response?.data?.message || error.message
        }
        showNotification(
          `Import feilet: ${error.response?.data?.message || error.message}`,
          'error',
          'mdi-alert'
        )
      } finally {
        uploading.value = false
      }
    }
    
    const resetImport = () => {
      file.value = null
      importResult.value = null
      selectedTemplate.value = null
    }
    
    // Load templates on mount
    onMounted(() => {
      loadTemplates()
    })
    
    return {
      // Data
      templates,
      loadingTemplates,
      selectedTemplate,
      templateSearch,
      file,
      uploading,
      importResult,
      
      // Computed
      filteredTemplates,
      
      // Snackbar
      showSnackbar,
      snackbarText,
      snackbarColor,
      snackbarIcon,
      
      // Methods
      loadTemplates,
      selectTemplate,
      changeTemplate,
      goToTemplates,
      handleFileSelect,
      uploadFile,
      resetImport
    }
  }
}
</script>

<style scoped>
.template-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.template-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>