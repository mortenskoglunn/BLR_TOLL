<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-6">
          <v-icon left color="primary">mdi-package-variant</v-icon>
          Importerte Produkter (blomster_import)
        </h1>
      </v-col>
    </v-row>

    <!-- Statistikk kort -->
    <v-row>
      <v-col cols="12" md="3">
        <v-card color="primary" dark>
          <v-card-text>
            <div class="text-h4">{{ totalProducts }}</div>
            <div class="text-caption">Totalt produkter</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="success" dark>
          <v-card-text>
            <div class="text-h4">{{ uniqueSuppliers }}</div>
            <div class="text-caption">Leverandører</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="info" dark>
          <v-card-text>
            <div class="text-h4">{{ uniqueCategories }}</div>
            <div class="text-caption">Kategorier</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="warning" dark>
          <v-card-text>
            <div class="text-h4">{{ recentImports }}</div>
            <div class="text-caption">Siste 24t</div>
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
              <v-col cols="12" md="4">
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
              
              <v-col cols="12" md="4">
                <v-select
                  v-model="filterSupplier"
                  :items="supplierOptions"
                  label="Leverandør"
                  outlined
                  dense
                  clearable
                ></v-select>
              </v-col>
              
              <v-col cols="12" md="4">
                <v-select
                  v-model="filterCategory"
                  :items="categoryOptions"
                  label="Kategori"
                  outlined
                  dense
                  clearable
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

    <!-- Produktdetaljer dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="900px" scrollable>
      <v-card v-if="selectedProduct">
        <v-card-title class="primary white--text">
          <v-icon left color="white">mdi-package-variant</v-icon>
          Produktdetaljer - ID: {{ selectedProduct.id }}
        </v-card-title>

        <v-card-text class="pt-4" style="max-height: 70vh;">
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
                    <v-list-item-title>{{ selectedProduct.Currency || '-' }}</v-list-item-title>
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
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

export default {
  name: 'ProductsImportView',
  setup() {
    // State
    const products = ref([])
    const loading = ref(false)
    const search = ref('')
    const filterSupplier = ref(null)
    const filterCategory = ref(null)
    const showDetailsDialog = ref(false)
    const selectedProduct = ref(null)
    
    // Snackbar
    const showSnackbar = ref(false)
    const snackbarText = ref('')
    const snackbarColor = ref('success')
    const snackbarIcon = ref('mdi-check')
    
    // Table headers for blomster_import table
    const headers = [
      { text: 'ID', value: 'id', width: '80px' },
      { text: 'Fakturadato', value: 'Invoice_Date' },
      { text: 'Beskrivelse', value: 'Description' },
      { text: 'EAN', value: 'EAN' },
      { text: 'Leverandør', value: 'supplier_name' },
      { text: 'Pris', value: 'Price' },
      { text: 'Antall', value: 'quantity_calc' },
      { text: 'Tariffnr', value: 'Tariff_Number' },
      { text: 'Land', value: 'Country_Of_Origin_Raw' },
      { text: 'Kategori', value: 'category' },
      { text: 'Importert', value: 'created_at' },
      { text: 'Handlinger', value: 'actions', sortable: false, width: '120px' }
    ]
    
    // Computed
    const filteredProducts = computed(() => {
      let filtered = products.value
      
      if (filterSupplier.value) {
        filtered = filtered.filter(p => p.supplier_name === filterSupplier.value)
      }
      
      if (filterCategory.value) {
        filtered = filtered.filter(p => p.category === filterCategory.value)
      }
      
      return filtered
    })
    
    const supplierOptions = computed(() => {
      const suppliers = [...new Set(products.value.map(p => p.supplier_name).filter(Boolean))]
      return suppliers.sort()
    })
    
    const categoryOptions = computed(() => {
      const categories = [...new Set(products.value.map(p => p.category).filter(Boolean))]
      return categories.sort()
    })
    
    const totalProducts = computed(() => products.value.length)
    
    const uniqueSuppliers = computed(() => supplierOptions.value.length)
    
    const uniqueCategories = computed(() => categoryOptions.value.length)
    
    const recentImports = computed(() => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      return products.value.filter(p => new Date(p.created_at) > yesterday).length
    })
    
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
        // Henter fra blomster_import via ny endpoint
        const response = await axios.get('/api/blomster-import', {
          params: { 
            limit: 5000,
            supplier_name: filterSupplier.value,
            category: filterCategory.value
          }
        })
        
        if (response.data.success) {
          products.value = response.data.products
          showNotification(`${products.value.length} produkter lastet fra blomster_import`, 'info', 'mdi-package')
        }
      } catch (error) {
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
        // Bruk blomster-import endpoint
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
    
    const exportProducts = async () => {
      try {
        const response = await axios.post('/api/upload/export', {
          source: 'blomster_import',
          filters: {
            supplier_name: filterSupplier.value,
            category: filterCategory.value
          }
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
    
    // Load products on mount
    onMounted(() => {
      loadProducts()
    })
    
    return {
      // Data
      products,
      loading,
      search,
      filterSupplier,
      filterCategory,
      showDetailsDialog,
      selectedProduct,
      headers,
      
      // Computed
      filteredProducts,
      supplierOptions,
      categoryOptions,
      totalProducts,
      uniqueSuppliers,
      uniqueCategories,
      recentImports,
      
      // Snackbar
      showSnackbar,
      snackbarText,
      snackbarColor,
      snackbarIcon,
      
      // Methods
      loadProducts,
      viewDetails,
      deleteProduct,
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

.text-wrap {
  white-space: normal !important;
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>