<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            <span class="text-h5">
              <v-icon left>mdi-office-building</v-icon>
              Firmasøk
            </span>
            <v-btn
              color="success"
              @click="openAddDialog"
              prepend-icon="mdi-plus"
            >
              Legg til firma
            </v-btn>
          </v-card-title>

          <!-- Søkefelt -->
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="search.text"
                  label="Fritekst søk"
                  prepend-icon="mdi-magnify"
                  clearable
                  @keyup.enter="searchCompanies"
                  hint="Søk i firmanavn, adresse, poststed, land"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-btn
                  color="primary"
                  @click="searchCompanies"
                  :loading="loading"
                  block
                  size="large"
                >
                  <v-icon left>mdi-magnify</v-icon>
                  Søk
                </v-btn>
              </v-col>
            </v-row>

            <!-- Avansert søk -->
            <v-expansion-panels class="mt-4">
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon left>mdi-filter</v-icon>
                  Avansert søk
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.firmanavn"
                        label="Firmanavn"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.kundenummer"
                        label="Kundenummer"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.adresse"
                        label="Adresse"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.poststed"
                        label="Poststed"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.postkode"
                        label="Postkode"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.land"
                        label="Land"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.autno"
                        label="AutNo"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.kode"
                        label="Kode"
                        clearable
                      />
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col cols="12" class="text-right">
                      <v-btn
                        color="secondary"
                        @click="resetSearch"
                        class="mr-2"
                      >
                        <v-icon left>mdi-refresh</v-icon>
                        Nullstill
                      </v-btn>
                      <v-btn
                        color="primary"
                        @click="searchCompanies"
                        :loading="loading"
                      >
                        <v-icon left>mdi-magnify</v-icon>
                        Søk
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Søkeresultater -->
    <v-row v-if="results.length > 0" class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <span class="text-h6">Søkeresultater ({{ results.length }})</span>
            <v-spacer></v-spacer>
            <v-btn
              color="success"
              @click="exportToExcel"
              prepend-icon="mdi-microsoft-excel"
              size="small"
            >
              Eksporter til Excel
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-data-table
              :headers="headers"
              :items="results"
              :items-per-page="25"
              :items-per-page-options="[10, 25, 50, 100]"
              fixed-header
              height="600px"
              class="elevation-1"
            >
              <template v-slot:item.actions="{ item }">
                <v-btn
                  icon="mdi-eye"
                  size="small"
                  @click="viewDetails(item)"
                  color="info"
                  class="mr-1"
                />
                <v-btn
                  icon="mdi-pencil"
                  size="small"
                  @click="editCompany(item)"
                  color="primary"
                  class="mr-1"
                />
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  @click="deleteCompany(item)"
                  color="error"
                />
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Ingen resultater melding -->
    <v-row v-if="searchPerformed && results.length === 0" class="mt-4">
      <v-col cols="12">
        <v-alert type="info" variant="tonal">
          Ingen firma funnet som matcher søket ditt.
        </v-alert>
      </v-col>
    </v-row>

    <!-- Detaljer Dialog -->
    <v-dialog v-model="detailsDialog" max-width="800px">
      <v-card>
        <v-card-title class="bg-info">
          <span class="text-h5 text-white">Firmadetaljer</span>
        </v-card-title>
        <v-card-text v-if="selectedCompany" class="mt-4">
          <v-row dense>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">ID</div>
              <div class="text-body-1">{{ selectedCompany.ID || '-' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">Linjenr</div>
              <div class="text-body-1">{{ selectedCompany.Linjenr || '-' }}</div>
            </v-col>
            <v-col cols="12">
              <v-divider class="my-2"></v-divider>
            </v-col>
            <v-col cols="12" md="8">
              <div class="text-subtitle-2 text-grey">Firmanavn</div>
              <div class="text-body-1 font-weight-bold">{{ selectedCompany.Firmanavn || '-' }}</div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">Kundenummer</div>
              <div class="text-body-1">{{ selectedCompany.Kundenummer || '-' }}</div>
            </v-col>
            <v-col cols="12">
              <v-divider class="my-2"></v-divider>
            </v-col>
            <v-col cols="12" md="8">
              <div class="text-subtitle-2 text-grey">Adresse</div>
              <div class="text-body-1">{{ selectedCompany.Adresse || '-' }}</div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">Postkode</div>
              <div class="text-body-1">{{ selectedCompany.Postkode || '-' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">Poststed</div>
              <div class="text-body-1">{{ selectedCompany.Poststed || '-' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">Land</div>
              <div class="text-body-1">{{ selectedCompany.Land || '-' }}</div>
            </v-col>
            <v-col cols="12">
              <v-divider class="my-2"></v-divider>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">AutNo</div>
              <div class="text-body-1">{{ selectedCompany.AutNo || '-' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">Priskode</div>
              <div class="text-body-1">{{ selectedCompany.Priskode || '-' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">Valutakode</div>
              <div class="text-body-1">{{ selectedCompany.Valutakode || '-' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">Kode</div>
              <div class="text-body-1">{{ selectedCompany.Kode || '-' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">Incoterm</div>
              <div class="text-body-1">{{ selectedCompany.Incoterm || '-' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">Incosted</div>
              <div class="text-body-1">{{ selectedCompany.Incosted || '-' }}</div>
            </v-col>
            <v-col cols="12" v-if="selectedCompany.Merknad">
              <v-divider class="my-2"></v-divider>
              <div class="text-subtitle-2 text-grey">Merknad</div>
              <div class="text-body-1">{{ selectedCompany.Merknad }}</div>
            </v-col>
            <v-col cols="12">
              <v-divider class="my-2"></v-divider>
            </v-col>
            <v-col cols="12">
              <div class="text-subtitle-2 text-grey">Importert dato</div>
              <div class="text-body-1">{{ formatDate(selectedCompany.ImportertDato) }}</div>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="detailsDialog = false">Lukk</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Legg til / Rediger Dialog -->
    <v-dialog v-model="editDialog" max-width="900px">
      <v-card>
        <v-card-title class="bg-primary">
          <span class="text-h5 text-white">
            {{ editMode ? 'Rediger firma' : 'Legg til nytt firma' }}
          </span>
        </v-card-title>
        <v-card-text class="mt-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedCompany.Linjenr"
                label="Linjenr"
                type="number"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedCompany.Firmanavn"
                label="Firmanavn *"
                :rules="[rules.required]"
                required
              />
            </v-col>
            <v-col cols="12" md="8">
              <v-text-field
                v-model="editedCompany.Adresse"
                label="Adresse"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editedCompany.Postkode"
                label="Postkode"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedCompany.Poststed"
                label="Poststed"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedCompany.Land"
                label="Land"
                placeholder="f.eks. NO, NL, DE, DK"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedCompany.AutNo"
                label="AutNo"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedCompany.Priskode"
                label="Priskode"
                type="number"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedCompany.Kundenummer"
                label="Kundenummer"
                type="number"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedCompany.Valutakode"
                label="Valutakode"
                placeholder="f.eks. EUR, NOK, DKK"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedCompany.Incoterm"
                label="Incoterm"
                placeholder="f.eks. FCA"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedCompany.Incosted"
                label="Incosted"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedCompany.Kode"
                label="Kode"
                placeholder="f.eks. EU, NO"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="editedCompany.Merknad"
                label="Merknad"
                rows="3"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" @click="closeEditDialog">Avbryt</v-btn>
          <v-btn
            color="primary"
            @click="saveCompany"
            :loading="saving"
          >
            {{ editMode ? 'Oppdater' : 'Lagre' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Slett Dialog -->
    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title class="bg-error">
          <span class="text-h5 text-white">Bekreft sletting</span>
        </v-card-title>
        <v-card-text class="mt-4">
          Er du sikker på at du vil slette firmaet <strong>{{ selectedCompany?.Firmanavn }}</strong>?
          Denne handlingen kan ikke angres.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" @click="deleteDialog = false">Avbryt</v-btn>
          <v-btn color="error" @click="confirmDelete" :loading="deleting">Slett</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for meldinger -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Lukk</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, reactive } from 'vue'
import axios from 'axios'

export default {
  name: 'CompanySearch',
  setup() {
    const loading = ref(false)
    const saving = ref(false)
    const deleting = ref(false)
    const searchPerformed = ref(false)
    const results = ref([])
    const detailsDialog = ref(false)
    const editDialog = ref(false)
    const deleteDialog = ref(false)
    const selectedCompany = ref(null)
    const editMode = ref(false)
    const formValid = ref(false)
    const companyForm = ref(null)

    const search = reactive({
      text: '',
      firmanavn: '',
      kundenummer: '',
      adresse: '',
      poststed: '',
      postkode: '',
      land: '',
      autno: '',
      kode: ''
    })

    const snackbar = reactive({
      show: false,
      text: '',
      color: 'success'
    })

    const editedCompany = reactive({
      ID: null,
      Linjenr: '',
      Firmanavn: '',
      Adresse: '',
      Postkode: '',
      Poststed: '',
      Land: '',
      AutNo: '',
      Priskode: '',
      Kundenummer: '',
      Valutakode: '',
      Merknad: '',
      Incoterm: '',
      Incosted: '',
      Kode: ''
    })

    const rules = {
      required: value => !!value || 'Dette feltet er påkrevd'
    }

    const headers = [
      { title: 'ID', key: 'ID', sortable: true },
      { title: 'Firmanavn', key: 'Firmanavn', sortable: true },
      { title: 'Kundenr', key: 'Kundenummer', sortable: true },
      { title: 'Adresse', key: 'Adresse', sortable: true },
      { title: 'Postkode', key: 'Postkode', sortable: true },
      { title: 'Poststed', key: 'Poststed', sortable: true },
      { title: 'Land', key: 'Land', sortable: true },
      { title: 'AutNo', key: 'AutNo', sortable: true },
      { title: 'Valuta', key: 'Valutakode', sortable: true },
      { title: 'Kode', key: 'Kode', sortable: true },
      { title: 'Handlinger', key: 'actions', sortable: false, align: 'center' }
    ]

    const searchCompanies = async () => {
      loading.value = true
      searchPerformed.value = true
      
      try {
        const params = {}
        
        if (search.text) params.text = search.text
        if (search.firmanavn) params.firmanavn = search.firmanavn
        if (search.kundenummer) params.kundenummer = search.kundenummer
        if (search.adresse) params.adresse = search.adresse
        if (search.poststed) params.poststed = search.poststed
        if (search.postkode) params.postkode = search.postkode
        if (search.land) params.land = search.land
        if (search.autno) params.autno = search.autno
        if (search.kode) params.kode = search.kode

        const response = await axios.get('/api/companies/search', { params })
        results.value = response.data
        
        console.log('Søkeresultater:', results.value)
        console.log('Antall resultater:', results.value.length)
        
        if (results.value.length === 0) {
          showMessage('Ingen firma funnet', 'info')
        } else {
          showMessage(`Fant ${results.value.length} firma`, 'success')
        }
      } catch (error) {
        console.error('Søkefeil:', error)
        showMessage('Feil ved søk: ' + (error.response?.data?.error || error.message), 'error')
      } finally {
        loading.value = false
      }
    }

    const resetSearch = () => {
      search.text = ''
      search.firmanavn = ''
      search.kundenummer = ''
      search.adresse = ''
      search.poststed = ''
      search.postkode = ''
      search.land = ''
      search.autno = ''
      search.kode = ''
      results.value = []
      searchPerformed.value = false
    }

    const viewDetails = (company) => {
      selectedCompany.value = company
      detailsDialog.value = true
    }

    const openAddDialog = () => {
      console.log('openAddDialog called')
      editMode.value = false
      resetEditedCompany()
      editDialog.value = true
      console.log('editDialog set to:', editDialog.value)
    }

    const editCompany = (company) => {
      editMode.value = true
      Object.assign(editedCompany, company)
      editDialog.value = true
    }

    const closeEditDialog = () => {
      editDialog.value = false
      resetEditedCompany()
    }

    const resetEditedCompany = () => {
      editedCompany.ID = null
      editedCompany.Linjenr = ''
      editedCompany.Firmanavn = ''
      editedCompany.Adresse = ''
      editedCompany.Postkode = ''
      editedCompany.Poststed = ''
      editedCompany.Land = ''
      editedCompany.AutNo = ''
      editedCompany.Priskode = ''
      editedCompany.Kundenummer = ''
      editedCompany.Valutakode = ''
      editedCompany.Merknad = ''
      editedCompany.Incoterm = ''
      editedCompany.Incosted = ''
      editedCompany.Kode = ''
      if (companyForm.value) {
        companyForm.value.resetValidation()
      }
    }

    const saveCompany = async () => {
      if (!editedCompany.Firmanavn || editedCompany.Firmanavn.trim() === '') {
        showMessage('Firmanavn er påkrevd', 'error')
        return
      }

      saving.value = true
      
      try {
        if (editMode.value) {
          await axios.put(`/api/companies/${editedCompany.ID}`, editedCompany)
          showMessage('Firma oppdatert', 'success')
        } else {
          await axios.post('/api/companies', editedCompany)
          showMessage('Firma lagt til', 'success')
        }
        
        closeEditDialog()
        if (results.value.length > 0 || searchPerformed.value) {
          searchCompanies()
        }
      } catch (error) {
        console.error('Lagringsfeil:', error)
        showMessage('Feil ved lagring: ' + (error.response?.data?.error || error.message), 'error')
      } finally {
        saving.value = false
      }
    }

    const deleteCompany = (company) => {
      selectedCompany.value = company
      deleteDialog.value = true
    }

    const confirmDelete = async () => {
      deleting.value = true
      
      try {
        await axios.delete(`/api/companies/${selectedCompany.value.ID}`)
        showMessage('Firma slettet', 'success')
        deleteDialog.value = false
        searchCompanies()
      } catch (error) {
        console.error('Slettingsfeil:', error)
        showMessage('Feil ved sletting: ' + (error.response?.data?.error || error.message), 'error')
      } finally {
        deleting.value = false
      }
    }

    const exportToExcel = async () => {
      try {
        const response = await axios.post('/api/companies/export', 
          { companies: results.value },
          { responseType: 'blob' }
        )
        
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `firma_${new Date().toISOString().split('T')[0]}.xlsx`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        
        showMessage('Excel-fil lastet ned', 'success')
      } catch (error) {
        console.error('Eksportfeil:', error)
        showMessage('Feil ved eksport: ' + (error.response?.data?.error || error.message), 'error')
      }
    }

    const formatDate = (dateString) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      return date.toLocaleString('no-NO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const showMessage = (text, color = 'success') => {
      snackbar.text = text
      snackbar.color = color
      snackbar.show = true
    }

    return {
      loading,
      saving,
      deleting,
      searchPerformed,
      results,
      detailsDialog,
      editDialog,
      deleteDialog,
      selectedCompany,
      editMode,
      formValid,
      companyForm,
      search,
      editedCompany,
      snackbar,
      headers,
      rules,
      searchCompanies,
      resetSearch,
      viewDetails,
      openAddDialog,
      editCompany,
      closeEditDialog,
      saveCompany,
      deleteCompany,
      confirmDelete,
      exportToExcel,
      formatDate
    }
  }
}
</script>

<style scoped>
:deep(.v-data-table) {
  font-size: 14px;
}

:deep(.v-data-table-header) th {
  background-color: #f5f5f5 !important;
  font-weight: 600 !important;
}

:deep(.v-data-table__td) {
  padding: 8px !important;
}

.text-subtitle-2 {
  font-weight: 600;
  margin-bottom: 4px;
}
</style>