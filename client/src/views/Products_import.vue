<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-6">
          <v-icon left color="primary">mdi-package-variant</v-icon>
          Importerte Produkter
        </h1>
      </v-col>
    </v-row>


    <!-- Statistikk kort -->
    <v-row>
      <v-col cols="12" sm="6" md="4" lg="3">
        <v-card color="primary" dark>
          <v-card-text>
            <div class="text-h4">{{ totalProducts }}</div>
            <div class="text-caption">Totalt produkter</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <!-- Filter og søk -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-filter</v-icon>
            Filtrer og søk
          </v-card-title>
          
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="search"
                  append-icon="mdi-magnify"
                  label="Søk i produkter"
                  outlined
                  dense
                  clearable
                  hint="Søk i Description, product_code, EAN..."
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6" v-if="user && user.role === 'admin'">
                <v-select
                  v-model="filterUser"
                  :items="userFilterOptions"
                  label="Filtrer på bruker"
                  outlined
                  dense
                  hint="Velg hvilke brukeres produkter du vil se"
                  persistent-hint
                  @change="loadProducts"
                ></v-select>
              </v-col>
            </v-row>
            
            <v-btn color="primary" @click="loadProducts" :loading="loading">
              <v-icon left>mdi-refresh</v-icon>
              Oppdater
            </v-btn>
            
            <v-btn color="success" class="ml-2" @click="exportProducts">
              <v-icon left>mdi-download</v-icon>
              Eksporter til Excel
            </v-btn>

            <v-btn color="error" class="ml-2" @click="showClearDialog = true" :disabled="products.length === 0">
              <v-icon left>mdi-delete-sweep</v-icon>
              Tøm tabell
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Produkttabell -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-table</v-icon>
            Produktliste
            <v-spacer></v-spacer>
            <v-chip color="info">
              {{ filteredProducts.length }} av {{ products.length }} produkter
            </v-chip>
          </v-card-title>
          
          <v-card-text>
            <v-data-table
              :headers="headers"
              :items="filteredProducts"
              :search="search"
              :loading="loading"
              class="elevation-1"
              :items-per-page="25"
              :footer-props="{
                'items-per-page-options': [10, 25, 50, 100]
              }"
              fixed-header
              height="calc(100vh - 350px)"
            >
              <!-- Invoice Date -->
              <template v-slot:item.Invoice_Date="{ item }">
                {{ formatDate(item.Invoice_Date) }}
              </template>

              <!-- Description -->
              <template v-slot:item.Description="{ item }">
                <div class="text-truncate" style="max-width: 300px;" :title="item.Description">
                  {{ item.Description || '-' }}
                </div>
              </template>

              <!-- EAN / Product Code -->
              <template v-slot:item.EAN="{ item }">
                <v-chip small color="primary" dark v-if="item.EAN">
                  {{ item.EAN }}
                </v-chip>
                <span v-else class="grey--text">-</span>
              </template>

              <!-- Price -->
              <template v-slot:item.Price="{ item }">
                <span v-if="item.Price">
                  {{ formatPrice(item.Price) }} {{ item.Currency || 'EUR' }}
                </span>
                <span v-else class="grey--text">-</span>
              </template>

              <!-- Quantity (calculated) -->
              <template v-slot:item.quantity_calc="{ item }">
                <span v-if="item.Number_Of_Tray && item.Amount_per_Tray">
                  {{ item.Number_Of_Tray * item.Amount_per_Tray }}
                </span>
                <span v-else class="grey--text">-</span>
              </template>

              <!-- Tariff Number -->
              <template v-slot:item.Tariff_Number="{ item }">
                <v-chip small color="green" dark v-if="item.Tariff_Number">
                  {{ item.Tariff_Number }}
                </v-chip>
                <span v-else class="grey--text">-</span>
              </template>

              <!-- Country of Origin -->
              <template v-slot:item.Country_Of_Origin_Raw="{ item }">
                <v-chip small outlined v-if="item.Country_Of_Origin_Raw">
                  {{ item.Country_Of_Origin_Raw }}
                </v-chip>
                <span v-else class="grey--text">-</span>
              </template>

              <!-- Created at -->
              <template v-slot:item.created_at="{ item }">
                {{ formatDate(item.created_at) }}
              </template>

              <!-- Handlinger -->
              <template v-slot:item.actions="{ item }">
                <v-btn icon small color="info" @click="viewDetails(item)">
                  <v-icon small>mdi-eye</v-icon>
                </v-btn>
                <v-btn icon small color="error" @click="deleteProduct(item)">
                  <v-icon small>mdi-delete</v-icon>
                </v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog for å bekrefte tømming av tabell -->
    <v-dialog v-model="showClearDialog" max-width="500px">
      <v-card>
        <v-card-title class="error white--text">
          <v-icon left color="white">mdi-alert</v-icon>
          Bekreft sletting
        </v-card-title>

        <v-card-text class="pt-4">
          <v-alert type="warning" outlined>
            <strong>ADVARSEL:</strong> Dette vil slette produkter fra blomster_import-tabellen.
          </v-alert>

          <!-- Admin: Velg hvilke produkter som skal slettes -->
          <div v-if="user && user.role === 'admin'" class="mt-4">
            <v-select
              v-model="clearUserFilter"
              :items="clearUserOptions"
              label="Hvilke produkter skal slettes?"
              outlined
              dense
            ></v-select>
            <p class="text-caption grey--text">
              <strong>Mine produkter:</strong> Sletter kun dine egne produkter<br>
              <strong>Alle produkter:</strong> Sletter alle produkter fra alle brukere
            </p>
          </div>

          <p class="mt-4">
            <strong>{{ products.length }}</strong> produkter vil bli slettet.
          </p>
          
          <p class="red--text">
            Denne handlingen kan ikke angres.
          </p>
        </v-card-text>

        <v-card-actions>
          <v-btn text @click="closeClearDialog">
            Avbryt
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn 
            color="error" 
            @click="clearAllProducts"
            :loading="clearingProducts"
          >
            <v-icon left>mdi-delete-sweep</v-icon>
            Tøm tabell
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Produktdetaljer dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="900px" scrollable>
      <v-card v-if="selectedProduct">
        <v-card-title class="primary white--text">
          <v-icon left color="white">mdi-information</v-icon>
          Produktdetaljer
        </v-card-title>

        <v-card-text class="pt-4">
          <v-row>
            <!-- Venstre kolonne -->
            <v-col cols="12" md="6">
              <v-list dense>
                <v-list-subheader>FAKTURA INFORMASJON</v-list-subheader>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Fakturadato</v-list-item-subtitle>
                    <v-list-item-title>{{ formatDate(selectedProduct.Invoice_Date) }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Fakturanummer</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.Invoice_Number || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Valuta</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.Currency || 'EUR' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-divider class="my-3"></v-divider>
                <v-list-subheader>PRODUKT INFORMASJON</v-list-subheader>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Beskrivelse</v-list-item-subtitle>
                    <v-list-item-title class="text-wrap">{{ selectedProduct.Description || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Produktkode</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.product_code || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>EAN</v-list-item-subtitle>
                    <v-list-item-title>
                      <v-chip small color="primary">{{ selectedProduct.EAN || '-' }}</v-chip>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Leverandør</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.supplier_name || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Kategori</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.category || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-col>

            <!-- Høyre kolonne -->
            <v-col cols="12" md="6">
              <v-list dense>
                <v-list-subheader>PRIS OG MENGDE</v-list-subheader>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Pris</v-list-item-subtitle>
                    <v-list-item-title>
                      {{ formatPrice(selectedProduct.Price) }} {{ selectedProduct.Currency || 'EUR' }}
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Pris NOK</v-list-item-subtitle>
                    <v-list-item-title>
                      {{ formatPrice(selectedProduct.price_nok) }} NOK
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Pottstørrelse</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.Pot_Size || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Antall brett</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.Number_Of_Tray || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Antall per brett</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.Amount_per_Tray || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Total mengde</v-list-item-subtitle>
                    <v-list-item-title>
                      <v-chip color="info">
                        {{ selectedProduct.quantity || (selectedProduct.Number_Of_Tray * selectedProduct.Amount_per_Tray) || '-' }}
                      </v-chip>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-divider class="my-3"></v-divider>
                <v-list-subheader>TOLL OG OPPRINNELSE</v-list-subheader>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Tariffnummer</v-list-item-subtitle>
                    <v-list-item-title>
                      <v-chip small color="green" dark>{{ selectedProduct.Tariff_Number || '-' }}</v-chip>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>HS-kode</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.hs_code || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Opprinnelsesland (rå)</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.Country_Of_Origin_Raw || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Opprinnelsesland</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.country_of_origin || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-divider class="my-3"></v-divider>
                <v-list-subheader>VEKT</v-list-subheader>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Vekt per ordrelinje</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.Weight_per_order_line || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Bruttovekt per ordrelinje</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.Gross_Weight_per_order_line || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Vekt</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.weight || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>

          <v-divider class="my-4"></v-divider>

          <v-row>
            <v-col cols="12">
              <v-list-subheader>METADATA</v-list-subheader>
              <v-simple-table dense>
                <tbody>
                  <tr>
                    <td><strong>Importert:</strong></td>
                    <td>{{ formatDate(selectedProduct.created_at) }}</td>
                  </tr>
                  <tr>
                    <td><strong>Database ID:</strong></td>
                    <td>{{ selectedProduct.id }}</td>
                  </tr>
                </tbody>
              </v-simple-table>
            </v-col>
          </v-row>
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
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'

export default {
  name: 'ProductsImportView',
  setup() {
    // Hent bruker fra localStorage
    const user = ref(null)
    try {
      const savedUser = localStorage.getItem('toll_user')
      if (savedUser) {
        user.value = JSON.parse(savedUser)
      }
    } catch (error) {
      console.error('Error parsing user:', error)
    }
    
    // State
    const products = ref([])
    const loading = ref(false)
    const search = ref('')
    // FIKSET: Admin ser alle produkter som standard, andre ser mine produkter
    const filterUser = ref(user.value?.role === 'admin' ? 'all' : 'mine')
    const clearUserFilter = ref('mine')
    const showDetailsDialog = ref(false)
    const selectedProduct = ref(null)
    const showClearDialog = ref(false)
    const clearingProducts = ref(false)
    
    // Snackbar
    const showSnackbar = ref(false)
    const snackbarText = ref('')
    const snackbarColor = ref('success')
    const snackbarIcon = ref('mdi-check')
    
    // Table headers for blomster_import table with better visibility
    const headers = [
      { 
        title: 'ID',
        key: 'id', 
        width: '80px',
        align: 'start',
        sortable: true
      },
      { 
        title: 'Fakturadato',
        key: 'Invoice_Date',
        align: 'start',
        sortable: true
      },
      { 
        title: 'Beskrivelse',
        key: 'Description',
        align: 'start',
        sortable: true
      },
      { 
        title: 'EAN',
        key: 'EAN',
        align: 'center',
        sortable: true
      },
      { 
        title: 'Leverandør',
        key: 'supplier_name',
        align: 'start',
        sortable: true
      },
      { 
        title: 'Pris',
        key: 'Price',
        align: 'end',
        sortable: true
      },
      { 
        title: 'Antall',
        key: 'quantity_calc',
        align: 'center',
        sortable: false
      },
      { 
        title: 'Tariffnr',
        key: 'Tariff_Number',
        align: 'center',
        sortable: true
      },
      { 
        title: 'Land',
        key: 'Country_Of_Origin_Raw',
        align: 'center',
        sortable: true
      },
      { 
        title: 'Kategori',
        key: 'category',
        align: 'start',
        sortable: true
      },
      { 
        title: 'Importert',
        key: 'created_at',
        align: 'start',
        sortable: true
      },
      { 
        title: 'Handlinger',
        key: 'actions', 
        sortable: false, 
        width: '120px',
        align: 'center'
      }
    ]
    
    // Computed
    const clearUserOptions = computed(() => {
      if (!user.value || user.value.role !== 'admin') {
        return [{ title: 'Mine produkter', value: 'mine' }]
      }
      return [
        { title: 'Mine produkter', value: 'mine' },
        { title: 'Alle produkter', value: 'all' }
      ]
    })
    
    const userFilterOptions = computed(() => {
      if (!user.value || user.value.role !== 'admin') {
        return []
      }
      
      return [
        { title: 'Mine produkter', value: 'mine' },
        { title: 'Alle produkter', value: 'all' },
      ]
    })
    
    const filteredProducts = computed(() => products.value)
    
    const totalProducts = computed(() => products.value.length)
    
    // Methods
    const showNotification = (text, color = 'success', icon = 'mdi-check') => {
      snackbarText.value = text
      snackbarColor.value = color
      snackbarIcon.value = icon
      showSnackbar.value = true
    }
    
    const loadProducts = async () => {
      loading.value = true
      try {
        const params = { 
          limit: 5000,
        }
        
        // FIKSET: Legg til brukerfiltrering
        if (user.value) {
          if (user.value.role === 'admin') {
            // Admin: Bruk filterUser eller default til 'all'
            const filter = filterUser.value || 'all'
            params.imported_by_user = filter
          } else {
            // Non-admin: Alltid 'mine'
            params.imported_by_user = 'mine'
          }
        }
        
        // DEBUGGING LOGS
        console.log('🔍 Loading products with params:', params)
        console.log('👤 User:', user.value)
        console.log('🔧 Filter:', filterUser.value)
        
        const response = await axios.get('/api/blomster-import', { params })
        
        console.log('📦 Response:', response.data)
        
        if (response.data.success) {
          products.value = response.data.products
          showNotification(`${products.value.length} produkter lastet fra blomster_import`, 'info', 'mdi-package')
        }
      } catch (error) {
        console.error('❌ Load products error:', error)
        showNotification(
          `Feil ved lasting av produkter: ${error.response?.data?.message || error.message}`,
          'error',
          'mdi-alert'
        )
      } finally {
        loading.value = false
      }
    }
    
    const viewDetails = (product) => {
      selectedProduct.value = product
      showDetailsDialog.value = true
    }
    
    const deleteProduct = async (product) => {
      if (!confirm(`Er du sikker på at du vil slette produkt ID ${product.id}?`)) {
        return
      }
      
      try {
        const response = await axios.delete(`/api/blomster-import/${product.id}`)
        if (response.data.success) {
          showNotification('Produkt slettet', 'success', 'mdi-delete')
          loadProducts()
        }
      } catch (error) {
        showNotification(
          `Feil ved sletting: ${error.response?.data?.message || error.message}`,
          'error',
          'mdi-alert'
        )
      }
    }

    const closeClearDialog = () => {
      showClearDialog.value = false
    }

    const clearAllProducts = async () => {
      clearingProducts.value = true
      try {
        const clearAll = user.value?.role === 'admin' && clearUserFilter.value === 'all'
        
        const response = await axios.post('/api/blomster-import/clear', {
          clearAll: clearAll
        })
        
        if (response.data.success) {
          const message = clearAll 
            ? `${response.data.deletedCount} produkter slettet fra alle brukere` 
            : `${response.data.deletedCount} av dine produkter slettet`
          
          showNotification(message, 'success', 'mdi-delete-sweep')
          products.value = []
          closeClearDialog()
          loadProducts()
        }
      } catch (error) {
        showNotification(
          `Feil ved tømming av tabell: ${error.response?.data?.message || error.message}`,
          'error',
          'mdi-alert'
        )
      } finally {
        clearingProducts.value = false
      }
    }
    
    const exportProducts = async () => {
      try {
        const response = await axios.post('/api/upload/export', {
          source: 'blomster_import',
        }, {
          responseType: 'blob'
        })
        
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `blomster_import-${Date.now()}.xlsx`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        
        showNotification('Excel-fil lastet ned', 'success', 'mdi-download')
      } catch (error) {
        showNotification(
          `Feil ved eksport: ${error.message}`,
          'error',
          'mdi-alert'
        )
      }
    }
    
    const copyToClipboard = (product) => {
      const text = `
ID: ${product.id}
Fakturadato: ${formatDate(product.Invoice_Date)}
Fakturanummer: ${product.Invoice_Number || '-'}
Beskrivelse: ${product.Description || '-'}
EAN: ${product.EAN || '-'}
Leverandør: ${product.supplier_name || '-'}
Pris: ${formatPrice(product.Price)} ${product.Currency || 'EUR'}
Tariffnummer: ${product.Tariff_Number || '-'}
Land: ${product.Country_Of_Origin_Raw || '-'}
Kategori: ${product.category || '-'}
      `.trim()
      
      navigator.clipboard.writeText(text).then(() => {
        showNotification('Produktinfo kopiert til utklippstavle', 'success', 'mdi-content-copy')
      }).catch(() => {
        showNotification('Kunne ikke kopiere til utklippstavle', 'error', 'mdi-alert')
      })
    }
    
    const formatPrice = (price) => {
      if (!price) return '-'
      return new Intl.NumberFormat('no-NO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(price)
    }
    
    const formatDate = (dateString) => {
      if (!dateString) return '-'
      return new Date(dateString).toLocaleString('no-NO')
    }
    
    // Watch filterUser for debugging
    watch(filterUser, (newVal, oldVal) => {
      console.log('🔄 Filter changed:', { old: oldVal, new: newVal })
    })
    
    // Load products on mount
    onMounted(() => {
      loadProducts()
    })
    
    return {
      // Data
      products,
      loading,
      search,
      filterUser,
      clearUserFilter,
      user,
      showDetailsDialog,
      selectedProduct,
      showClearDialog,
      clearingProducts,
      headers,
      
      // Computed
      clearUserOptions,
      userFilterOptions,
      filteredProducts,
      totalProducts,
      
      // Snackbar
      showSnackbar,
      snackbarText,
      snackbarColor,
      snackbarIcon,
      
      // Methods
      loadProducts,
      viewDetails,
      deleteProduct,
      closeClearDialog,
      clearAllProducts,
      exportProducts,
      copyToClipboard,
      formatPrice,
      formatDate
    }
  }
}
</script>

<style scoped>
.v-data-table {
  border-radius: 8px;
}

/* Sørg for at headers er synlige og tydelige - Vuetify 3 syntax */
:deep(.v-data-table-header) th {
  font-weight: 700 !important;
  font-size: 0.9rem !important;
  background-color: #f5f5f5 !important;
  border-bottom: 2px solid #e0e0e0 !important;
  color: #1976D2 !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

:deep(.v-data-table__th) {
  font-weight: 700 !important;
  font-size: 0.9rem !important;
  background-color: #f5f5f5 !important;
  border-bottom: 2px solid #e0e0e0 !important;
  color: #1976D2 !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

:deep(thead) {
  background-color: #f5f5f5 !important;
}

:deep(th.text-start),
:deep(th.text-center),
:deep(th.text-end) {
  font-weight: 700 !important;
}

.text-wrap {
  white-space: normal !important;
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>