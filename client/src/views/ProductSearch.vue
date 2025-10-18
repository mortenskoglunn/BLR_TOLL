<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-6">
          <v-icon left color="primary">mdi-database-search</v-icon>
          Produktsøk
        </h1>
      </v-col>
    </v-row>

    <!-- Hovedsøk -->
    <v-row>
      <v-col cols="12">
        <v-card elevation="3">
          <v-card-text>
            <v-text-field
              v-model="mainSearch"
              label="Søk etter produktnavn, artikkel, tariffnummer..."
              prepend-inner-icon="mdi-magnify"
              outlined
              clearable
              autofocus
              hide-details
              @keyup.enter="performSearch"
              class="text-h6"
            >
              <template v-slot:append>
                <v-btn
                  color="primary"
                  @click="performSearch"
                  :loading="loading"
                  large
                >
                  Søk
                </v-btn>
              </template>
            </v-text-field>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Avanserte filtre -->
    <v-row class="mt-2">
      <v-col cols="12">
        <v-expansion-panels v-model="filtersExpanded">
          <v-expansion-panel>
            <v-expansion-panel-header>
              <div>
                <v-icon left>mdi-filter-variant</v-icon>
                <strong>Avansert søk</strong>
                <v-chip
                  v-if="activeFiltersCount > 0"
                  small
                  color="primary"
                  class="ml-2"
                >
                  {{ activeFiltersCount }} aktive
                </v-chip>
              </div>
            </v-expansion-panel-header>
            
            <v-expansion-panel-content>
              <v-row>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="filters.søkenavn"
                    label="Søkenavn"
                    outlined
                    dense
                    clearable
                    prepend-inner-icon="mdi-text"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="filters.art1"
                    label="Artikkel 1 (Art1)"
                    outlined
                    dense
                    clearable
                    prepend-inner-icon="mdi-barcode"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="filters.art2"
                    label="Artikkel 2 (Art2)"
                    outlined
                    dense
                    clearable
                    prepend-inner-icon="mdi-barcode"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="filters.art3"
                    label="Artikkel 3 (Art3)"
                    outlined
                    dense
                    clearable
                    prepend-inner-icon="mdi-barcode"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="filters.tar1"
                    label="Tariffnummer 1 (Tar1)"
                    outlined
                    dense
                    clearable
                    prepend-inner-icon="mdi-tag"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="filters.tar2"
                    label="Tariffnummer 2 (Tar2)"
                    outlined
                    dense
                    clearable
                    prepend-inner-icon="mdi-tag"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="4">
                  <v-select
                    v-model="filters.kat"
                    :items="categoryOptions"
                    label="Kategori (Kat)"
                    outlined
                    dense
                    clearable
                    prepend-inner-icon="mdi-shape"
                  ></v-select>
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="filters.emmaNavn"
                    label="Emma-navn"
                    outlined
                    dense
                    clearable
                    prepend-inner-icon="mdi-account"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="filters.notat"
                    label="Notat"
                    outlined
                    dense
                    clearable
                    prepend-inner-icon="mdi-note-text"
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="12">
                  <v-btn
                    color="primary"
                    @click="performSearch"
                    :loading="loading"
                  >
                    <v-icon left>mdi-magnify</v-icon>
                    Søk med filtre
                  </v-btn>
                  
                  <v-btn
                    color="grey"
                    text
                    @click="clearFilters"
                    class="ml-2"
                  >
                    <v-icon left>mdi-close</v-icon>
                    Nullstill filtre
                  </v-btn>
                </v-col>
              </v-row>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>

    <!-- Søkeresultater -->
    <v-row class="mt-4" v-if="searchPerformed">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-format-list-bulleted</v-icon>
            Søkeresultater
            <v-spacer></v-spacer>
            <v-chip color="info">
              {{ searchResults.length }} {{ searchResults.length === 1 ? 'produkt' : 'produkter' }}
            </v-chip>
          </v-card-title>

          <v-card-text>
            <v-data-table
              :headers="headers"
              :items="searchResults"
              :loading="loading"
              class="elevation-1"
              :items-per-page="25"
              :footer-props="{
                'items-per-page-options': [10, 25, 50, 100]
              }"
            >
              <!-- ID -->
              <template v-slot:item.id="{ item }">
                <v-chip x-small color="grey" dark>
                  {{ item.id }}
                </v-chip>
              </template>

              <!-- Søkenavn -->
              <template v-slot:item.Søkenavn="{ item }">
                <strong>{{ item.Søkenavn || '-' }}</strong>
              </template>

              <!-- Art1 -->
              <template v-slot:item.Art1="{ item }">
                <v-chip small color="blue" dark v-if="item.Art1">
                  {{ item.Art1 }}
                </v-chip>
                <span v-else class="grey--text">-</span>
              </template>

              <!-- Tar1 -->
              <template v-slot:item.Tar1="{ item }">
                <v-chip small color="green" dark v-if="item.Tar1">
                  {{ item.Tar1 }}
                </v-chip>
                <span v-else class="grey--text">-</span>
              </template>

              <!-- HS Toll NÅ -->
              <template v-slot:item.hs_toll="{ item }">
                <v-chip small color="orange" dark v-if="item['HS Toll NÅ']">
                  {{ item['HS Toll NÅ'] }}
                </v-chip>
                <span v-else class="grey--text">-</span>
              </template>

              <!-- Kategori -->
              <template v-slot:item.Kat="{ item }">
                <v-chip small outlined v-if="item.Kat">
                  {{ item.Kat }}
                </v-chip>
                <span v-else class="grey--text">-</span>
              </template>

              <!-- Handlinger -->
              <template v-slot:item.actions="{ item }">
                <v-btn icon small color="info" @click="viewDetails(item)">
                  <v-icon small>mdi-eye</v-icon>
                </v-btn>
                <v-btn icon small color="primary" @click="copyToClipboard(item)">
                  <v-icon small>mdi-content-copy</v-icon>
                </v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tom resultat melding -->
    <v-row class="mt-4" v-if="searchPerformed && searchResults.length === 0 && !loading">
      <v-col cols="12">
        <v-alert type="info" prominent>
          <v-row align="center">
            <v-col class="grow">
              <div class="text-h6">Ingen resultater funnet</div>
              <div>Prøv å endre søkekriteriene dine</div>
            </v-col>
            <v-col class="shrink">
              <v-icon size="64">mdi-database-search-outline</v-icon>
            </v-col>
          </v-row>
        </v-alert>
      </v-col>
    </v-row>

    <!-- Produktdetaljer dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="900px">
      <v-card v-if="selectedProduct">
        <v-card-title class="primary white--text">
          <v-icon left color="white">mdi-package-variant</v-icon>
          Produktdetaljer - ID: {{ selectedProduct.id }}
        </v-card-title>

        <v-card-text class="pt-4">
          <v-row>
            <!-- Venstre kolonne -->
            <v-col cols="12" md="6">
              <v-list dense>
                <v-subheader>GRUNNINFO</v-subheader>
                
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Søkenavn</v-list-item-subtitle>
                    <v-list-item-title class="text-wrap">
                      {{ selectedProduct.Søkenavn || '-' }}
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Emma-navn</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.EmmaNavn || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Kategori (Kat)</v-list-item-subtitle>
                    <v-list-item-title>
                      <v-chip small>{{ selectedProduct.Kat || '-' }}</v-chip>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-divider class="my-3"></v-divider>
                <v-subheader>ARTIKKEL/VARENUMMER</v-subheader>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Art1</v-list-item-subtitle>
                    <v-list-item-title>
                      <v-chip small color="blue" dark>{{ selectedProduct.Art1 || '-' }}</v-chip>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Art2</v-list-item-subtitle>
                    <v-list-item-title>
                      <v-chip small color="blue" dark>{{ selectedProduct.Art2 || '-' }}</v-chip>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Art3</v-list-item-subtitle>
                    <v-list-item-title>
                      <v-chip small color="blue" dark>{{ selectedProduct.Art3 || '-' }}</v-chip>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-col>

            <!-- Høyre kolonne -->
            <v-col cols="12" md="6">
              <v-list dense>
                <v-subheader>TARIFFNUMMER</v-subheader>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Tar1</v-list-item-subtitle>
                    <v-list-item-title>
                      <v-chip small color="green" dark>{{ selectedProduct.Tar1 || '-' }}</v-chip>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Tar2</v-list-item-subtitle>
                    <v-list-item-title>
                      <v-chip small color="green" dark>{{ selectedProduct.Tar2 || '-' }}</v-chip>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Tar3</v-list-item-subtitle>
                    <v-list-item-title>
                      <v-chip small color="green" dark>{{ selectedProduct.Tar3 || '-' }}</v-chip>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>HS Toll NÅ</v-list-item-subtitle>
                    <v-list-item-title>
                      <v-chip color="orange" dark>{{ selectedProduct['HS Toll NÅ'] || '-' }}</v-chip>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-divider class="my-3"></v-divider>
                <v-subheader>GAMLE KODER</v-subheader>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Gml1</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.Gml1 || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Gml2</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.Gml2 || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Gml (primær)</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.Gml || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>

          <v-divider class="my-4"></v-divider>

          <div v-if="selectedProduct.Notat">
            <v-subheader>NOTAT</v-subheader>
            <p class="ml-4">{{ selectedProduct.Notat }}</p>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-btn text color="grey" @click="showDetailsDialog = false">
            Lukk
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="copyToClipboard(selectedProduct)">
            <v-icon left>mdi-content-copy</v-icon>
            Kopier info
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
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

export default {
  name: 'ProductSearch',
  setup() {
    // State
    const mainSearch = ref('')
    const filters = ref({
      søkenavn: '',
      art1: '',
      art2: '',
      art3: '',
      tar1: '',
      tar2: '',
      kat: '',
      emmaNavn: '',
      notat: ''
    })
    const searchResults = ref([])
    const loading = ref(false)
    const searchPerformed = ref(false)
    const filtersExpanded = ref(null)
    const showDetailsDialog = ref(false)
    const selectedProduct = ref(null)
    const allCategories = ref([])
    
    // Snackbar
    const showSnackbar = ref(false)
    const snackbarText = ref('')
    const snackbarColor = ref('success')
    const snackbarIcon = ref('mdi-check')
    
    // Table headers
    const headers = [
      { text: 'ID', value: 'id', width: '80px' },
      { text: 'Søkenavn', value: 'Søkenavn', width: '250px' },
      { text: 'Art1', value: 'Art1' },
      { text: 'Art2', value: 'Art2' },
      { text: 'Tar1', value: 'Tar1' },
      { text: 'Tar2', value: 'Tar2' },
      { text: 'HS Toll', value: 'hs_toll' },
      { text: 'Kategori', value: 'Kat' },
      { text: 'Handlinger', value: 'actions', sortable: false, width: '120px' }
    ]
    
    // Computed
    const activeFiltersCount = computed(() => {
      return Object.values(filters.value).filter(v => v && v !== '').length
    })
    
    const categoryOptions = computed(() => {
      return allCategories.value.sort()
    })
    
    // Methods
    const showNotification = (text, color = 'success', icon = 'mdi-check') => {
      snackbarText.value = text
      snackbarColor.value = color
      snackbarIcon.value = icon
      showSnackbar.value = true
    }
    
    const loadCategories = async () => {
      try {
        // Hent kun unike kategorier uten å laste alle produkter
        const response = await axios.get('/api/database/products', {
          params: { limit: 1000 } // Begrens antall for å få kategorier
        })
        if (response.data.success) {
          const categories = [...new Set(response.data.products
            .map(p => p.Kat)
            .filter(Boolean))]
          allCategories.value = categories
        }
      } catch (error) {
        console.error('Feil ved lasting av kategorier:', error)
        // Sett noen standard kategorier hvis det feiler
        allCategories.value = ['10', '21', '31']
      }
    }
    
    const performSearch = async () => {
      loading.value = true
      searchPerformed.value = true
      
      try {
        // Bygg query parameters
        const params = {}
        
        if (mainSearch.value) {
          params.search = mainSearch.value
        }
        
        // Legg til alle aktive filtre
        Object.keys(filters.value).forEach(key => {
          if (filters.value[key]) {
            params[key] = filters.value[key]
          }
        })
        
        const response = await axios.get('/api/products/search', { params })
        
        if (response.data.success) {
          searchResults.value = response.data.products
          showNotification(
            `Fant ${searchResults.value.length} ${searchResults.value.length === 1 ? 'produkt' : 'produkter'}`,
            'info',
            'mdi-magnify'
          )
        }
      } catch (error) {
        showNotification(
          `Søkefeil: ${error.response?.data?.message || error.message}`,
          'error',
          'mdi-alert'
        )
        searchResults.value = []
      } finally {
        loading.value = false
      }
    }
    
    const clearFilters = () => {
      mainSearch.value = ''
      filters.value = {
        søkenavn: '',
        art1: '',
        art2: '',
        art3: '',
        tar1: '',
        tar2: '',
        kat: '',
        emmaNavn: '',
        notat: ''
      }
      searchResults.value = []
      searchPerformed.value = false
      showNotification('Filtre nullstilt', 'info', 'mdi-refresh')
    }
    
    const viewDetails = (product) => {
      selectedProduct.value = product
      showDetailsDialog.value = true
    }
    
    const copyToClipboard = (product) => {
      const text = `
ID: ${product.id}
Søkenavn: ${product.Søkenavn || '-'}
Art1: ${product.Art1 || '-'}
Art2: ${product.Art2 || '-'}
Tar1: ${product.Tar1 || '-'}
Tar2: ${product.Tar2 || '-'}
HS Toll NÅ: ${product['HS Toll NÅ'] || '-'}
Kategori: ${product.Kat || '-'}
      `.trim()
      
      navigator.clipboard.writeText(text).then(() => {
        showNotification('Produktinfo kopiert til utklippstavle', 'success', 'mdi-content-copy')
      }).catch(() => {
        showNotification('Kunne ikke kopiere til utklippstavle', 'error', 'mdi-alert')
      })
    }
    
    // Load categories on mount (men IKKE produkter!)
    onMounted(() => {
      // Kun last kategorier for dropdown, ikke alle produkter
      loadCategories()
      console.log('✅ Produktsøk klar - skriv søkeord for å starte')
    })
    
    return {
      // Data
      mainSearch,
      filters,
      searchResults,
      loading,
      searchPerformed,
      filtersExpanded,
      showDetailsDialog,
      selectedProduct,
      headers,
      
      // Computed
      activeFiltersCount,
      categoryOptions,
      
      // Snackbar
      showSnackbar,
      snackbarText,
      snackbarColor,
      snackbarIcon,
      
      // Methods
      performSearch,
      clearFilters,
      viewDetails,
      copyToClipboard
    }
  }
}
</script>

<style scoped>
.v-data-table {
  border-radius: 8px;
}

.text-wrap {
  white-space: normal !important;
}
</style>