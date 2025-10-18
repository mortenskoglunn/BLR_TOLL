<template>
  <v-container>
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
              <!-- Produktkode -->
              <template v-slot:item.product_code="{ item }">
                <v-chip small color="primary" dark>
                  {{ item.product_code }}
                </v-chip>
              </template>

              <!-- Pris -->
              <template v-slot:item.price="{ item }">
                <span v-if="item.price">
                  {{ formatPrice(item.price) }} {{ item.currency || 'NOK' }}
                </span>
                <span v-else class="grey--text">-</span>
              </template>

              <!-- Antall -->
              <template v-slot:item.quantity="{ item }">
                <span v-if="item.quantity">
                  {{ item.quantity }} {{ item.unit || 'stk' }}
                </span>
                <span v-else class="grey--text">-</span>
              </template>

              <!-- Importert dato -->
              <template v-slot:item.created_at="{ item }">
                {{ formatDate(item.created_at) }}
              </template>

              <!-- Handlinger -->
              <template v-slot:item.actions="{ item }">
                <v-btn icon small color="info" @click="viewDetails(item)">
                  <v-icon small>mdi-eye</v-icon>
                </v-btn>
                <v-btn icon small color="primary" @click="editProduct(item)">
                  <v-icon small>mdi-pencil</v-icon>
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
    <v-dialog v-model="showDetailsDialog" max-width="800px">
      <v-card v-if="selectedProduct">
        <v-card-title>
          <v-icon left color="primary">mdi-package-variant</v-icon>
          Produktdetaljer
        </v-card-title>

        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-list dense>
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Produktkode</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.product_code || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
                
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Produktnavn</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.product_name || '-' }}</v-list-item-title>
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

            <v-col cols="12" md="6">
              <v-list dense>
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Pris</v-list-item-subtitle>
                    <v-list-item-title>
                      {{ formatPrice(selectedProduct.price) }} {{ selectedProduct.currency || 'NOK' }}
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
                
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-subtitle>Antall</v-list-item-subtitle>
                    <v-list-item-title>
                      {{ selectedProduct.quantity }} {{ selectedProduct.unit || 'stk' }}
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
                    <v-list-item-subtitle>Opprinnelsesland</v-list-item-subtitle>
                    <v-list-item-title>{{ selectedProduct.country_of_origin || '-' }}</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>

          <v-divider class="my-4"></v-divider>

          <div v-if="selectedProduct.description">
            <strong>Beskrivelse:</strong>
            <p class="mt-2">{{ selectedProduct.description }}</p>
          </div>

          <div v-if="selectedProduct.specifications" class="mt-4">
            <strong>Spesifikasjoner:</strong>
            <p class="mt-2">{{ selectedProduct.specifications }}</p>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="showDetailsDialog = false">
            Lukk
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
  name: 'ProductsView',
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
    
    // Table headers
    const headers = [
      { text: 'Produktkode', value: 'product_code' },
      { text: 'Produktnavn', value: 'product_name' },
      { text: 'Leverandør', value: 'supplier_name' },
      { text: 'Pris', value: 'price' },
      { text: 'Antall', value: 'quantity' },
      { text: 'Kategori', value: 'category' },
      { text: 'HS-kode', value: 'hs_code' },
      { text: 'Importert', value: 'created_at' },
      { text: 'Handlinger', value: 'actions', sortable: false }
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
        const response = await axios.get('/api/products')
        if (response.data.success) {
          products.value = response.data.products
          showNotification(`${products.value.length} produkter lastet`, 'info', 'mdi-package')
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
    
    const editProduct = (product) => {
      showNotification('Redigering kommer snart', 'info', 'mdi-information')
    }
    
    const deleteProduct = async (product) => {
      if (!confirm(`Er du sikker på at du vil slette "${product.product_name}"?`)) {
        return
      }
      
      try {
        const response = await axios.delete(`/api/products/${product.id}`)
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
        link.setAttribute('download', `produkter-${Date.now()}.xlsx`)
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
      editProduct,
      deleteProduct,
      exportProducts,
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
</style>