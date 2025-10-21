<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            <span class="text-h5">
              <v-icon left>mdi-earth</v-icon>
              Frihandelssøk
            </span>
            <v-btn
              color="success"
              @click="openAddDialog"
              prepend-icon="mdi-plus"
            >
              Legg til land
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
                  @keyup.enter="searchFrihandel"
                  hint="Søk i land, landskode, valuta, frihandelsavtale"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-btn
                  color="primary"
                  @click="searchFrihandel"
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
                        v-model="search.land"
                        label="Land"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.landskode"
                        label="Landskode"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.valuta"
                        label="Valuta"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.valutakode"
                        label="Valutakode"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.frihandel"
                        label="Frihandelsavtale"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.tilhorighet"
                        label="Tilhørighet"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-select
                        v-model="search.t1"
                        label="T1"
                        :items="['J', 'P', 'G']"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-select
                        v-model="search.t2"
                        label="T2"
                        :items="['J', 'B']"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-select
                        v-model="search.mrntype"
                        label="MRN Type"
                        :items="['T1', 'T2']"
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
                        @click="searchFrihandel"
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
              <template v-slot:item.Frihandel="{ item }">
                <v-chip :color="getFrihandelColor(item.Frihandel)" size="small">
                  {{ item.Frihandel }}
                </v-chip>
              </template>
              <template v-slot:item.T1="{ item }">
                <v-chip :color="getTStatusColor(item.T1)" size="small">
                  {{ item.T1 }}
                </v-chip>
              </template>
              <template v-slot:item.T2="{ item }">
                <v-chip :color="getTStatusColor(item.T2)" size="small">
                  {{ item.T2 }}
                </v-chip>
              </template>
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
                  @click="editFrihandel(item)"
                  color="primary"
                  class="mr-1"
                />
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  @click="deleteFrihandel(item)"
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
          Ingen land funnet som matcher søket ditt.
        </v-alert>
      </v-col>
    </v-row>

    <!-- Detaljer Dialog -->
    <v-dialog v-model="detailsDialog" max-width="800px">
      <v-card>
        <v-card-title class="bg-info">
          <span class="text-h5 text-white">Landdetaljer</span>
        </v-card-title>
        <v-card-text v-if="selectedFrihandel" class="mt-4">
          <v-row dense>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">ID</div>
              <div class="text-body-1">{{ selectedFrihandel.ID || '-' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">Landskode</div>
              <div class="text-body-1 font-weight-bold">{{ selectedFrihandel.Landskode || '-' }}</div>
            </v-col>
            <v-col cols="12">
              <v-divider class="my-2"></v-divider>
            </v-col>
            <v-col cols="12">
              <div class="text-subtitle-2 text-grey">Land</div>
              <div class="text-body-1 font-weight-bold">{{ selectedFrihandel.Land || '-' }}</div>
            </v-col>
            <v-col cols="12">
              <v-divider class="my-2"></v-divider>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">Valuta</div>
              <div class="text-body-1">{{ selectedFrihandel.Valuta || '-' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">Valutakode</div>
              <div class="text-body-1">{{ selectedFrihandel.Valutakode || '-' }}</div>
            </v-col>
            <v-col cols="12">
              <v-divider class="my-2"></v-divider>
            </v-col>
            <v-col cols="12">
              <div class="text-subtitle-2 text-grey">Frihandelsavtale</div>
              <v-chip :color="getFrihandelColor(selectedFrihandel.Frihandel)">
                {{ selectedFrihandel.Frihandel || '-' }}
              </v-chip>
            </v-col>
            <v-col cols="12">
              <v-divider class="my-2"></v-divider>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">T1</div>
              <v-chip :color="getTStatusColor(selectedFrihandel.T1)">
                {{ selectedFrihandel.T1 || '-' }}
              </v-chip>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">T2</div>
              <v-chip :color="getTStatusColor(selectedFrihandel.T2)">
                {{ selectedFrihandel.T2 || '-' }}
              </v-chip>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">MRN Type</div>
              <div class="text-body-1">{{ selectedFrihandel.MRNtype || '-' }}</div>
            </v-col>
            <v-col cols="12">
              <v-divider class="my-2"></v-divider>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">Tilhørighet</div>
              <div class="text-body-1">{{ selectedFrihandel.Tilhorighet || '-' }}</div>
            </v-col>
            <v-col cols="12" md="6" v-if="selectedFrihandel.Merkand">
              <div class="text-subtitle-2 text-grey">Merknad</div>
              <div class="text-body-1">{{ selectedFrihandel.Merkand }}</div>
            </v-col>
            <v-col cols="12">
              <v-divider class="my-2"></v-divider>
            </v-col>
            <v-col cols="12">
              <div class="text-subtitle-2 text-grey">Importert dato</div>
              <div class="text-body-1">{{ formatDate(selectedFrihandel.ImportertDato) }}</div>
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
            {{ editMode ? 'Rediger land' : 'Legg til nytt land' }}
          </span>
        </v-card-title>
        <v-card-text class="mt-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedFrihandel.Landskode"
                label="Landskode *"
                :rules="[rules.required]"
                required
                hint="f.eks. NO, NL, DE"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedFrihandel.Land"
                label="Land *"
                :rules="[rules.required]"
                required
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedFrihandel.Valuta"
                label="Valuta"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedFrihandel.Valutakode"
                label="Valutakode"
                hint="f.eks. NOK, EUR, USD"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedFrihandel.Frihandel"
                label="Frihandelsavtale"
                hint="f.eks. EU-EØS-FHA, GSP, FHA"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedFrihandel.Tilhorighet"
                label="Tilhørighet"
                hint="f.eks. EU, FHA, G"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="editedFrihandel.T1"
                label="T1"
                :items="['J', 'P', 'G']"
                hint="Tollstatus T1"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="editedFrihandel.T2"
                label="T2"
                :items="['J', 'B']"
                hint="Tollstatus T2"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="editedFrihandel.MRNtype"
                label="MRN Type"
                :items="['T1', 'T2']"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="editedFrihandel.Merkand"
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
            @click="saveFrihandel"
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
          Er du sikker på at du vil slette <strong>{{ selectedFrihandel?.Land }}</strong>?
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
  name: 'FrihandelSearch',
  setup() {
    const loading = ref(false)
    const saving = ref(false)
    const deleting = ref(false)
    const searchPerformed = ref(false)
    const results = ref([])
    const detailsDialog = ref(false)
    const editDialog = ref(false)
    const deleteDialog = ref(false)
    const selectedFrihandel = ref(null)
    const editMode = ref(false)

    const search = reactive({
      text: '',
      land: '',
      landskode: '',
      valuta: '',
      valutakode: '',
      frihandel: '',
      tilhorighet: '',
      t1: '',
      t2: '',
      mrntype: ''
    })

    const snackbar = reactive({
      show: false,
      text: '',
      color: 'success'
    })

    const editedFrihandel = reactive({
      ID: null,
      Landskode: '',
      Land: '',
      Valuta: '',
      Valutakode: '',
      Frihandel: '',
      T1: '',
      T2: '',
      MRNtype: '',
      Merkand: '',
      Tilhorighet: ''
    })

    const rules = {
      required: value => !!value || 'Dette feltet er påkrevd'
    }

    const headers = [
      { title: 'ID', key: 'ID', sortable: true },
      { title: 'Landskode', key: 'Landskode', sortable: true },
      { title: 'Land', key: 'Land', sortable: true },
      { title: 'Valuta', key: 'Valuta', sortable: true },
      { title: 'Valutakode', key: 'Valutakode', sortable: true },
      { title: 'Frihandelsavtale', key: 'Frihandel', sortable: true },
      { title: 'T1', key: 'T1', sortable: true, align: 'center' },
      { title: 'T2', key: 'T2', sortable: true, align: 'center' },
      { title: 'MRN', key: 'MRNtype', sortable: true, align: 'center' },
      { title: 'Tilhørighet', key: 'Tilhorighet', sortable: true },
      { title: 'Handlinger', key: 'actions', sortable: false, align: 'center' }
    ]

    const getFrihandelColor = (frihandel) => {
      if (!frihandel) return 'grey'
      if (frihandel.includes('EU-EØS')) return 'blue'
      if (frihandel.includes('FHA')) return 'green'
      if (frihandel.includes('GSP')) return 'orange'
      return 'grey'
    }

    const getTStatusColor = (status) => {
      if (status === 'J') return 'green'
      if (status === 'P') return 'orange'
      if (status === 'G') return 'blue'
      if (status === 'B') return 'red'
      return 'grey'
    }

    const searchFrihandel = async () => {
      loading.value = true
      searchPerformed.value = true
      
      try {
        const params = {}
        
        if (search.text) params.text = search.text
        if (search.land) params.land = search.land
        if (search.landskode) params.landskode = search.landskode
        if (search.valuta) params.valuta = search.valuta
        if (search.valutakode) params.valutakode = search.valutakode
        if (search.frihandel) params.frihandel = search.frihandel
        if (search.tilhorighet) params.tilhorighet = search.tilhorighet
        if (search.t1) params.t1 = search.t1
        if (search.t2) params.t2 = search.t2
        if (search.mrntype) params.mrntype = search.mrntype

        const response = await axios.get('/api/frihandel/search', { params })
        results.value = response.data
        
        if (results.value.length === 0) {
          showMessage('Ingen land funnet', 'info')
        } else {
          showMessage(`Fant ${results.value.length} land`, 'success')
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
      search.land = ''
      search.landskode = ''
      search.valuta = ''
      search.valutakode = ''
      search.frihandel = ''
      search.tilhorighet = ''
      search.t1 = ''
      search.t2 = ''
      search.mrntype = ''
      results.value = []
      searchPerformed.value = false
    }

    const viewDetails = (frihandel) => {
      selectedFrihandel.value = frihandel
      detailsDialog.value = true
    }

    const openAddDialog = () => {
      editMode.value = false
      resetEditedFrihandel()
      editDialog.value = true
    }

    const editFrihandel = (frihandel) => {
      editMode.value = true
      Object.assign(editedFrihandel, frihandel)
      editDialog.value = true
    }

    const closeEditDialog = () => {
      editDialog.value = false
      resetEditedFrihandel()
    }

    const resetEditedFrihandel = () => {
      editedFrihandel.ID = null
      editedFrihandel.Landskode = ''
      editedFrihandel.Land = ''
      editedFrihandel.Valuta = ''
      editedFrihandel.Valutakode = ''
      editedFrihandel.Frihandel = ''
      editedFrihandel.T1 = ''
      editedFrihandel.T2 = ''
      editedFrihandel.MRNtype = ''
      editedFrihandel.Merkand = ''
      editedFrihandel.Tilhorighet = ''
    }

    const saveFrihandel = async () => {
      if (!editedFrihandel.Landskode || editedFrihandel.Landskode.trim() === '') {
        showMessage('Landskode er påkrevd', 'error')
        return
      }
      if (!editedFrihandel.Land || editedFrihandel.Land.trim() === '') {
        showMessage('Land er påkrevd', 'error')
        return
      }

      saving.value = true
      
      try {
        if (editMode.value) {
          await axios.put(`/api/frihandel/${editedFrihandel.ID}`, editedFrihandel)
          showMessage('Land oppdatert', 'success')
        } else {
          await axios.post('/api/frihandel', editedFrihandel)
          showMessage('Land lagt til', 'success')
        }
        
        closeEditDialog()
        if (results.value.length > 0 || searchPerformed.value) {
          searchFrihandel()
        }
      } catch (error) {
        console.error('Lagringsfeil:', error)
        showMessage('Feil ved lagring: ' + (error.response?.data?.error || error.message), 'error')
      } finally {
        saving.value = false
      }
    }

    const deleteFrihandel = (frihandel) => {
      selectedFrihandel.value = frihandel
      deleteDialog.value = true
    }

    const confirmDelete = async () => {
      deleting.value = true
      
      try {
        await axios.delete(`/api/frihandel/${selectedFrihandel.value.ID}`)
        showMessage('Land slettet', 'success')
        deleteDialog.value = false
        searchFrihandel()
      } catch (error) {
        console.error('Slettingsfeil:', error)
        showMessage('Feil ved sletting: ' + (error.response?.data?.error || error.message), 'error')
      } finally {
        deleting.value = false
      }
    }

    const exportToExcel = async () => {
      try {
        const response = await axios.post('/api/frihandel/export', 
          { frihandel: results.value },
          { responseType: 'blob' }
        )
        
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `frihandel_${new Date().toISOString().split('T')[0]}.xlsx`)
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
      selectedFrihandel,
      editMode,
      search,
      editedFrihandel,
      snackbar,
      headers,
      rules,
      searchFrihandel,
      resetSearch,
      viewDetails,
      openAddDialog,
      editFrihandel,
      closeEditDialog,
      saveFrihandel,
      deleteFrihandel,
      confirmDelete,
      exportToExcel,
      formatDate,
      getFrihandelColor,
      getTStatusColor
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