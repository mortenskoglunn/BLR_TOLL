<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-6">
          <v-icon left color="primary">mdi-file-excel-outline</v-icon>
          Excel Import Maler
        </h1>
      </v-col>
    </v-row>

    <!-- Action buttons -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-plus</v-icon>
            Handlinger
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              @click="openCreateDialog"
            >
              <v-icon left>mdi-plus</v-icon>
              Ny Mal
            </v-btn>
          </v-card-title>
          
          <v-card-text>
            <v-btn
              color="success"
              @click="loadTemplates"
              :loading="loading"
              class="mr-2"
            >
              <v-icon left>mdi-refresh</v-icon>
              Oppdater Liste
            </v-btn>
            
            <v-chip class="ml-2" color="info">
              <v-icon left small>mdi-file-excel</v-icon>
              {{ templates.length }} maler totalt
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Templates table -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-view-list</v-icon>
            Mal-oversikt
            <v-spacer></v-spacer>
            <v-text-field
              v-model="search"
              append-icon="mdi-magnify"
              label="Søk maler"
              single-line
              hide-details
              outlined
              dense
            ></v-text-field>
          </v-card-title>
          
          <v-card-text>
            <v-data-table
              :headers="headers"
              :items="templates"
              :search="search"
              :loading="loading"
              class="elevation-1"
              :items-per-page="10"
            >
              <!-- Status column -->
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
              
              <!-- Has header column -->
              <template v-slot:item.has_header="{ item }">
                <v-chip
                  small
                  :color="item.has_header ? 'blue' : 'orange'"
                  text-color="white"
                >
                  <v-icon left small>
                    {{ item.has_header ? 'mdi-format-header-1' : 'mdi-format-header-pound' }}
                  </v-icon>
                  {{ item.has_header ? 'Med header' : 'Uten header' }}
                </v-chip>
              </template>

              <!-- Created at column -->
              <template v-slot:item.created_at="{ item }">
                {{ formatDate(item.created_at) }}
              </template>

              <!-- Updated at column -->
              <template v-slot:item.updated_at="{ item }">
                {{ formatDate(item.updated_at) }}
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
                  color="info"
                  @click="handleViewColumns(item)"
                  class="mr-1"
                >
                  <v-icon small>mdi-table-column</v-icon>
                  Kolonner
                </v-btn>
                
                <v-btn
                  small
                  :color="item.active ? 'warning' : 'success'"
                  @click="toggleTemplateStatus(item)"
                >
                  <v-icon small>
                    {{ item.active ? 'mdi-pause' : 'mdi-play' }}
                  </v-icon>
                  {{ item.active ? 'Deaktiver' : 'Aktiver' }}
                </v-btn>
                
                <v-btn
                  small
                  color="error"
                  @click="handleDeleteClick(item)"
                  class="ml-1"
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

    <!-- Create/Edit Template Dialog -->
    <v-dialog v-model="showDialog" max-width="800px" persistent>
      <v-card>
        <v-card-title>
          <v-icon left :color="isEditing ? 'warning' : 'primary'">
            {{ isEditing ? 'mdi-pencil' : 'mdi-plus' }}
          </v-icon>
          {{ isEditing ? 'Rediger Mal' : 'Opprett Ny Mal' }}
        </v-card-title>
        
        <v-card-text>
          <v-form ref="templateForm" v-model="validForm">
            <!-- Grunnleggende informasjon -->
            <v-card outlined class="mb-4">
              <v-card-subtitle class="pb-0">
                <v-icon left>mdi-information</v-icon>
                Grunnleggende informasjon
              </v-card-subtitle>
              <v-card-text>
                <v-text-field
                  v-model="formData.name"
                  label="Mal navn"
                  :rules="nameRules"
                  outlined
                  prepend-inner-icon="mdi-tag"
                  required
                ></v-text-field>
                
                <v-text-field
                  v-model="formData.supplier_name"
                  label="Leverandør navn"
                  :rules="supplierRules"
                  outlined
                  prepend-inner-icon="mdi-truck"
                  required
                ></v-text-field>
                
                <v-textarea
                  v-model="formData.description"
                  label="Beskrivelse"
                  outlined
                  prepend-inner-icon="mdi-text"
                  rows="3"
                ></v-textarea>
              </v-card-text>
            </v-card>

            <!-- Excel-innstillinger -->
            <v-card outlined class="mb-4">
              <v-card-subtitle class="pb-0">
                <v-icon left>mdi-file-excel</v-icon>
                Excel-innstillinger
              </v-card-subtitle>
              <v-card-text>
                <v-switch
                  v-model="formData.has_header"
                  label="Excel-fil har header-rad"
                  color="primary"
                  class="mt-0"
                ></v-switch>
                
                <v-alert 
                  :type="formData.has_header ? 'info' : 'warning'" 
                  outlined 
                  dense
                  class="mt-2"
                >
                  {{ formData.has_header ? 
                    'Første rad vil bli ignorert som header' : 
                    'All data starter fra første rad' 
                  }}
                </v-alert>
              </v-card-text>
            </v-card>

            <!-- Kolonnemapping -->
            <v-card outlined>
              <v-card-subtitle class="pb-0">
                <v-icon left>mdi-table-column</v-icon>
                Kolonnemapping
                <v-spacer></v-spacer>
                <v-btn
                  small
                  color="success"
                  @click="addColumnMapping"
                  text
                >
                  <v-icon left small>mdi-plus</v-icon>
                  Legg til kolonne
                </v-btn>
              </v-card-subtitle>
              <v-card-text>
                <div v-if="formData.column_mappings.length === 0" class="text-center py-4">
                  <v-icon large color="grey lighten-1">mdi-table-off</v-icon>
                  <p class="grey--text mt-2">Ingen kolonnemap definert</p>
                </div>
                
                <v-row 
                  v-for="(mapping, index) in formData.column_mappings" 
                  :key="index"
                  class="mb-2"
                >
                  <v-col cols="4">
                    <v-text-field
                      v-model="mapping.excel_column"
                      label="Excel kolonne"
                      placeholder="A, B, C eller kolonnenavn"
                      outlined
                      dense
                    ></v-text-field>
                  </v-col>
                  <v-col cols="4">
                    <v-select
                      v-model="mapping.database_field"
                      :items="databaseFields"
                      label="Database felt"
                      outlined
                      dense
                    ></v-select>
                  </v-col>
                  <v-col cols="3">
                    <v-switch
                      v-model="mapping.required"
                      label="Påkrevd"
                      color="error"
                      dense
                    ></v-switch>
                  </v-col>
                  <v-col cols="1" class="d-flex align-center">
                    <v-btn
                      icon
                      color="error"
                      @click="removeColumnMapping(index)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-switch
              v-model="formData.active"
              label="Aktiv mal"
              color="success"
              class="mt-4"
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
            @click="saveTemplate"
          >
            <v-icon left>{{ isEditing ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
            {{ isEditing ? 'Oppdater' : 'Opprett' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- View Columns Dialog -->
    <v-dialog v-model="showColumnsDialog" max-width="600px">
      <v-card>
        <v-card-title>
          <v-icon left color="info">mdi-table-column</v-icon>
          Kolonnemapping - {{ selectedTemplate?.name }}
        </v-card-title>
        
        <v-card-text>
          <v-simple-table>
            <template v-slot:default>
              <thead>
                <tr>
                  <th>Excel Kolonne</th>
                  <th>Database Felt</th>
                  <th>Påkrevd</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="mapping in selectedTemplate?.column_mappings" :key="mapping.excel_column">
                  <td>
                    <v-chip small color="blue" text-color="white">
                      {{ mapping.excel_column }}
                    </v-chip>
                  </td>
                  <td>{{ mapping.database_field }}</td>
                  <td>
                    <v-chip 
                      small 
                      :color="mapping.required ? 'error' : 'success'"
                      text-color="white"
                    >
                      {{ mapping.required ? 'Påkrevd' : 'Valgfri' }}
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </template>
          </v-simple-table>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="showColumnsDialog = false">
            Lukk
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400px" persistent>
      <v-card>
        <v-card-title class="error white--text">
          <v-icon left color="white">mdi-alert</v-icon>
          Slett Mal
        </v-card-title>
        
        <v-card-text class="pt-4">
          <v-alert type="warning" outlined class="mb-3">
            <strong>Advarsel!</strong> Denne handlingen kan ikke angres.
          </v-alert>
          
          <p>Er du sikker på at du vil slette malen?</p>
          
          <v-card outlined class="mt-3">
            <v-card-text>
              <div><strong>Navn:</strong> {{ templateToDelete?.name }}</div>
              <div><strong>Leverandør:</strong> {{ templateToDelete?.supplier_name }}</div>
              <div><strong>Kolonner:</strong> {{ templateToDelete?.column_mappings?.length || 0 }} definert</div>
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
            Slett Mal
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
/* eslint-disable */
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'

export default {
  name: 'ExcelTemplatesView',
  setup() {
    // State
    const templates = ref([])
    const loading = ref(false)
    const saving = ref(false)
    const search = ref('')
    const showDialog = ref(false)
    const showColumnsDialog = ref(false)
    const isEditing = ref(false)
    const editingTemplate = ref(null)
    const selectedTemplate = ref(null)
    const validForm = ref(false)
    
    // Delete dialog state
    const showDeleteDialog = ref(false)
    const templateToDelete = ref(null)
    const deleteConfirmText = ref('')
    const deleting = ref(false)
    
    // Form data
    const formData = reactive({
      name: '',
      supplier_name: '',
      description: '',
      has_header: true,
      column_mappings: [],
      active: true
    })
    
    // Snackbar
    const showSnackbar = ref(false)
    const snackbarText = ref('')
    const snackbarColor = ref('success')
    const snackbarIcon = ref('mdi-check')
    
    // Table headers
    const headers = [
      { text: 'Navn', value: 'name' },
      { text: 'Leverandør', value: 'supplier_name' },
      { text: 'Header', value: 'has_header' },
      { text: 'Kolonner', value: 'column_count' },
      { text: 'Status', value: 'active' },
      { text: 'Opprettet', value: 'created_at' },
      { text: 'Oppdatert', value: 'updated_at' },
      { text: 'Handlinger', value: 'actions', sortable: false }
    ]
    
    // Database fields available for mapping
    const databaseFields = [
      'product_code',
      'product_name', 
      'supplier_part_number',
      'price',
      'currency',
      'quantity',
      'unit',
      'category',
      'subcategory',
      'description',
      'specifications',
      'manufacturer',
      'weight',
      'dimensions',
      'hs_code',
      'country_of_origin',
      'warranty_period',
      'delivery_time',
      'minimum_order_quantity',
      'notes'
    ]
    
    // Form validation rules
    const nameRules = [
      v => !!v || 'Mal navn er påkrevd',
      v => v.length >= 3 || 'Mal navn må være minst 3 tegn'
    ]
    
    const supplierRules = [
      v => !!v || 'Leverandør navn er påkrevd',
      v => v.length >= 2 || 'Leverandør navn må være minst 2 tegn'
    ]
    
    // Methods
    const showNotification = (text, color = 'success', icon = 'mdi-check') => {
      snackbarText.value = text
      snackbarColor.value = color
      snackbarIcon.value = icon
      showSnackbar.value = true
    }
    
    const loadTemplates = async () => {
      loading.value = true
      try {
        const response = await axios.get('/api/auth/excel-templates')
        if (response.data.success) {
          templates.value = response.data.templates.map(template => ({
            ...template,
            column_count: template.column_mappings?.length || 0,
            column_mappings: JSON.parse(template.column_mappings || '[]')
          }))
          showNotification(`${templates.value.length} maler lastet`, 'info', 'mdi-file-excel')
        }
      } catch (error) {
        showNotification(
          `Feil ved lasting av maler: ${error.response?.data?.message || error.message}`,
          'error',
          'mdi-alert'
        )
      } finally {
        loading.value = false
      }
    }
    
    const openCreateDialog = () => {
      isEditing.value = false
      editingTemplate.value = null
      resetForm()
      showDialog.value = true
    }
    
    const handleEditClick = (template) => {
      isEditing.value = true
      editingTemplate.value = template
      fillForm(template)
      showDialog.value = true
    }
    
    const handleViewColumns = (template) => {
      selectedTemplate.value = template
      showColumnsDialog.value = true
    }
    
    const closeDialog = () => {
      showDialog.value = false
      resetForm()
    }
    
    const handleDeleteClick = (template) => {
      templateToDelete.value = template
      deleteConfirmText.value = ''
      showDeleteDialog.value = true
    }
    
    const handleDeleteCancel = () => {
      showDeleteDialog.value = false
      templateToDelete.value = null
      deleteConfirmText.value = ''
    }
    
    const handleDeleteConfirm = async () => {
      if (deleteConfirmText.value !== 'SLETT') return
      
      deleting.value = true
      
      try {
        const response = await axios.delete(`/api/auth/excel-templates/${templateToDelete.value.id}`)
        
        if (response.data.success) {
          showNotification(
            `Mal "${templateToDelete.value.name}" er slettet`,
            'success',
            'mdi-delete'
          )
          handleDeleteCancel()
          loadTemplates()
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
    
    const toggleTemplateStatus = async (template) => {
      try {
        const newStatus = !template.active
        const response = await axios.put(`/api/auth/excel-templates/${template.id}`, {
          active: newStatus
        })
        
        if (response.data.success) {
          template.active = newStatus
          showNotification(
            `Mal "${template.name}" ${newStatus ? 'aktivert' : 'deaktivert'}`,
            newStatus ? 'success' : 'warning',
            newStatus ? 'mdi-play' : 'mdi-pause'
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
    
    const addColumnMapping = () => {
      formData.column_mappings.push({
        excel_column: '',
        database_field: '',
        required: false
      })
    }
    
    const removeColumnMapping = (index) => {
      formData.column_mappings.splice(index, 1)
    }
    
    const resetForm = () => {
      Object.assign(formData, {
        name: '',
        supplier_name: '',
        description: '',
        has_header: true,
        column_mappings: [],
        active: true
      })
    }
    
    const fillForm = (template) => {
      Object.assign(formData, {
        name: template.name,
        supplier_name: template.supplier_name,
        description: template.description || '',
        has_header: template.has_header,
        column_mappings: [...template.column_mappings],
        active: template.active
      })
    }
    
    const saveTemplate = async () => {
      if (!validForm.value) return
      
      saving.value = true
      
      try {
        if (isEditing.value) {
          await updateTemplate()
        } else {
          await createTemplate()
        }
      } finally {
        saving.value = false
      }
    }
    
    const createTemplate = async () => {
      try {
        const templateData = {
          name: formData.name,
          supplier_name: formData.supplier_name,
          description: formData.description,
          has_header: formData.has_header,
          column_mappings: JSON.stringify(formData.column_mappings),
          active: formData.active
        }
        
        const response = await axios.post('/api/auth/excel-templates', templateData)
        
        if (response.data.success) {
          showNotification(`Mal "${formData.name}" opprettet!`, 'success')
          closeDialog()
          loadTemplates()
        }
      } catch (error) {
        showNotification(
          `Feil ved opprettelse: ${error.response?.data?.message || error.message}`,
          'error',
          'mdi-alert'
        )
      }
    }
    
    const updateTemplate = async () => {
      try {
        const templateData = {
          name: formData.name,
          supplier_name: formData.supplier_name,
          description: formData.description,
          has_header: formData.has_header,
          column_mappings: JSON.stringify(formData.column_mappings),
          active: formData.active
        }
        
        const response = await axios.put(`/api/auth/excel-templates/${editingTemplate.value.id}`, templateData)
        
        if (response.data.success) {
          showNotification(`Mal "${formData.name}" oppdatert!`, 'success')
          closeDialog()
          loadTemplates()
        }
      } catch (error) {
        showNotification(
          `Feil ved oppdatering: ${error.response?.data?.message || error.message}`,
          'error',
          'mdi-alert'
        )
      }
    }
    
    const formatDate = (dateString) => {
      if (!dateString) return 'Aldri'
      return new Date(dateString).toLocaleString('no-NO')
    }
    
    // Load templates on mount
    onMounted(() => {
      loadTemplates()
    })
    
    return {
      // Data
      templates,
      loading,
      saving,
      search,
      showDialog,
      showColumnsDialog,
      isEditing,
      editingTemplate,
      selectedTemplate,
      validForm,
      formData,
      headers,
      databaseFields,
      
      // Delete dialog
      showDeleteDialog,
      templateToDelete,
      deleteConfirmText,
      deleting,
      
      // Validation rules
      nameRules,
      supplierRules,
      
      // Snackbar
      showSnackbar,
      snackbarText,
      snackbarColor,
      snackbarIcon,
      
      // Methods
      loadTemplates,
      openCreateDialog,
      handleEditClick,
      handleViewColumns,
      closeDialog,
      handleDeleteClick,
      handleDeleteCancel,
      handleDeleteConfirm,
      toggleTemplateStatus,
      addColumnMapping,
      removeColumnMapping,
      saveTemplate,
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