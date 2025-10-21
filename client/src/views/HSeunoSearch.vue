<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            <span class="text-h5">
              <v-icon left>mdi-barcode</v-icon>
              HS-kode søk (EU/Norge)
            </span>
            <v-btn
              color="success"
              @click="openAddDialog"
              prepend-icon="mdi-plus"
            >
              Legg til HS-kode
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
                  @keyup.enter="searchHSeuno"
                  hint="Søk i HS-koder, beskrivelser, kapittel"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-btn
                  color="primary"
                  @click="searchHSeuno"
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
                        v-model="search.norhs"
                        label="Norsk HS-kode"
                        clearable
                        hint="f.eks. 1012100"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.euhs"
                        label="EU HS-kode"
                        clearable
                        hint="f.eks. 101210000"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.chapter"
                        label="Kapittel"
                        clearable
                        hint="f.eks. 1012"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.norwdescr"
                        label="Norsk beskrivelse"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.engldescr"
                        label="Engelsk beskrivelse"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.danedescr"
                        label="Dansk beskrivelse"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model="search.gmlkortnr"
                        label="Gammelt kortnr"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model="search.nyttkortnr"
                        label="Nytt kortnr"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model="search.kollitype"
                        label="Kollitype"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.artdbkode"
                        label="ARTDB kode"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="search.kommentar"
                        label="Kommentar"
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
                        @click="searchHSeuno"
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
              <template v-slot:item.NorHS="{ item }">
                <span class="font-weight-bold">{{ item.NorHS }}</span>
              </template>
              <template v-slot:item.EuHS="{ item }">
                <span class="font-weight-bold">{{ item.EuHS }}</span>
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
                  @click="editHSeuno(item)"
                  color="primary"
                  class="mr-1"
                />
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  @click="deleteHSeuno(item)"
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
          Ingen HS-koder funnet som matcher søket ditt.
        </v-alert>
      </v-col>
    </v-row>

    <!-- Detaljer Dialog -->
    <v-dialog v-model="detailsDialog" max-width="1000px">
      <v-card>
        <v-card-title class="bg-info">
          <span class="text-h5 text-white">HS-kode detaljer</span>
        </v-card-title>
        <v-card-text v-if="selectedHSeuno" class="mt-4">
          <v-row dense>
            <v-col cols="12" md="3">
              <div class="text-subtitle-2 text-grey">ID</div>
              <div class="text-body-1">{{ selectedHSeuno.ID || '-' }}</div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-subtitle-2 text-grey">Norsk HS</div>
              <div class="text-body-1 font-weight-bold">{{ selectedHSeuno.NorHS || '-' }}</div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-subtitle-2 text-grey">EU HS</div>
              <div class="text-body-1 font-weight-bold">{{ selectedHSeuno.EuHS || '-' }}</div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-subtitle-2 text-grey">Kapittel</div>
              <div class="text-body-1">{{ selectedHSeuno.Chapter || '-' }}</div>
            </v-col>
            <v-col cols="12"><v-divider class="my-2"></v-divider></v-col>
            
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">Norsk beskrivelse</div>
              <div class="text-body-1">{{ selectedHSeuno.Norwdescr || '-' }}</div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">Engelsk beskrivelse</div>
              <div class="text-body-1">{{ selectedHSeuno.Engldescr || '-' }}</div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">Dansk beskrivelse</div>
              <div class="text-body-1">{{ selectedHSeuno.Danedescr || '-' }}</div>
            </v-col>
            <v-col cols="12"><v-divider class="my-2"></v-divider></v-col>
            
            <v-col cols="12" md="3">
              <div class="text-subtitle-2 text-grey">Gammelt kortnr</div>
              <div class="text-body-1">{{ selectedHSeuno.Gmlkortnr || '-' }}</div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-subtitle-2 text-grey">Nytt kortnr</div>
              <div class="text-body-1">{{ selectedHSeuno.Nyttkortnr || '-' }}</div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-subtitle-2 text-grey">Kollitype</div>
              <div class="text-body-1">{{ selectedHSeuno.Kollitype || '-' }}</div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-subtitle-2 text-grey">Kollimengde</div>
              <div class="text-body-1">{{ selectedHSeuno.Kollimengde || '-' }}</div>
            </v-col>
            <v-col cols="12"><v-divider class="my-2"></v-divider></v-col>
            
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">Skrivkode</div>
              <div class="text-body-1">{{ selectedHSeuno.Skrivkode || '-' }}</div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">ARTDB kode</div>
              <div class="text-body-1">{{ selectedHSeuno.ARTDBkode || '-' }}</div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">Temp NOHS</div>
              <div class="text-body-1">{{ selectedHSeuno.TempNOHS || '-' }}</div>
            </v-col>
            <v-col cols="12"><v-divider class="my-2"></v-divider></v-col>
            
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">FRITXTKODE1</div>
              <div class="text-body-1">{{ selectedHSeuno.FRITXTKODE1 || '-' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">FRITXTDESC1</div>
              <div class="text-body-1">{{ selectedHSeuno.FRITXTDESC1 || '-' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">FRITXTKODE2</div>
              <div class="text-body-1">{{ selectedHSeuno.FRITXTKODE2 || '-' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">FRITXTDESC2</div>
              <div class="text-body-1">{{ selectedHSeuno.FRITXTDESC2 || '-' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">FRITXTKODE3</div>
              <div class="text-body-1">{{ selectedHSeuno.FRITXTKODE3 || '-' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">FRITXTDESC3</div>
              <div class="text-body-1">{{ selectedHSeuno.FRITXTDESC3 || '-' }}</div>
            </v-col>
            <v-col cols="12"><v-divider class="my-2"></v-divider></v-col>
            
            <v-col cols="12" md="3">
              <div class="text-subtitle-2 text-grey">Toll</div>
              <div class="text-body-1">{{ selectedHSeuno.Toll || '-' }}</div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-subtitle-2 text-grey">EU Toll</div>
              <div class="text-body-1">{{ selectedHSeuno.EUToll || '-' }}</div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-subtitle-2 text-grey">Row Toll</div>
              <div class="text-body-1">{{ selectedHSeuno.RowToll || '-' }}</div>
            </v-col>
            <v-col cols="12" md="3">
              <div class="text-subtitle-2 text-grey">GSP</div>
              <div class="text-body-1">{{ selectedHSeuno.GSP || '-' }}</div>
            </v-col>
            <v-col cols="12"><v-divider class="my-2"></v-divider></v-col>
            
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">Rundskriv</div>
              <div class="text-body-1">{{ selectedHSeuno.Rundskriv || '-' }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 text-grey">Kolonne1</div>
              <div class="text-body-1">{{ selectedHSeuno.Kolonne1 || '-' }}</div>
            </v-col>
            
            <v-col cols="12" v-if="selectedHSeuno.Kommentar">
              <div class="text-subtitle-2 text-grey">Kommentar</div>
              <div class="text-body-1">{{ selectedHSeuno.Kommentar }}</div>
            </v-col>
            <v-col cols="12"><v-divider class="my-2"></v-divider></v-col>
            
            <v-col cols="12">
              <div class="text-subtitle-2 text-grey">Importert dato</div>
              <div class="text-body-1">{{ formatDate(selectedHSeuno.ImportertDato) }}</div>
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
    <v-dialog v-model="editDialog" max-width="1200px" scrollable>
      <v-card>
        <v-card-title class="bg-primary">
          <span class="text-h5 text-white">
            {{ editMode ? 'Rediger HS-kode' : 'Legg til ny HS-kode' }}
          </span>
        </v-card-title>
        <v-card-text class="mt-4" style="max-height: 600px;">
          <v-row>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editedHSeuno.NorHS"
                label="Norsk HS-kode *"
                :rules="[rules.required]"
                required
                hint="f.eks. 1012100"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editedHSeuno.EuHS"
                label="EU HS-kode *"
                :rules="[rules.required]"
                required
                hint="f.eks. 101210000"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editedHSeuno.Chapter"
                label="Kapittel *"
                :rules="[rules.required]"
                required
                hint="f.eks. 1012"
              />
            </v-col>
            
            <v-col cols="12"><v-divider class="my-2"></v-divider></v-col>
            
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editedHSeuno.Norwdescr"
                label="Norsk beskrivelse"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editedHSeuno.Engldescr"
                label="Engelsk beskrivelse"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editedHSeuno.Danedescr"
                label="Dansk beskrivelse"
              />
            </v-col>
            
            <v-col cols="12"><v-divider class="my-2"></v-divider></v-col>
            
            <v-col cols="12" md="3">
              <v-text-field
                v-model="editedHSeuno.Gmlkortnr"
                label="Gammelt kortnr"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model="editedHSeuno.Nyttkortnr"
                label="Nytt kortnr"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model="editedHSeuno.Kollitype"
                label="Kollitype"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model.number="editedHSeuno.Kollimengde"
                label="Kollimengde"
                type="number"
              />
            </v-col>
            
            <v-col cols="12"><v-divider class="my-2"></v-divider></v-col>
            
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editedHSeuno.Skrivkode"
                label="Skrivkode"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editedHSeuno.ARTDBkode"
                label="ARTDB kode"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editedHSeuno.TempNOHS"
                label="Temp NOHS"
              />
            </v-col>
            
            <v-col cols="12"><v-divider class="my-2"></v-divider></v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedHSeuno.FRITXTKODE1"
                label="FRITXTKODE1"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedHSeuno.FRITXTDESC1"
                label="FRITXTDESC1"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedHSeuno.FRITXTKODE2"
                label="FRITXTKODE2"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedHSeuno.FRITXTDESC2"
                label="FRITXTDESC2"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedHSeuno.FRITXTKODE3"
                label="FRITXTKODE3"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedHSeuno.FRITXTDESC3"
                label="FRITXTDESC3"
              />
            </v-col>
            
            <v-col cols="12"><v-divider class="my-2"></v-divider></v-col>
            
            <v-col cols="12" md="3">
              <v-text-field
                v-model="editedHSeuno.Toll"
                label="Toll"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model="editedHSeuno.EUToll"
                label="EU Toll"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model="editedHSeuno.RowToll"
                label="Row Toll"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model="editedHSeuno.GSP"
                label="GSP"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedHSeuno.Rundskriv"
                label="Rundskriv"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedHSeuno.Kolonne1"
                label="Kolonne1"
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="editedHSeuno.Kommentar"
                label="Kommentar"
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
            @click="saveHSeuno"
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
          Er du sikker på at du vil slette HS-kode <strong>{{ selectedHSeuno?.NorHS }}</strong> / <strong>{{ selectedHSeuno?.EuHS }}</strong>?
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
  name: 'HSeunoSearch',
  setup() {
    const loading = ref(false)
    const saving = ref(false)
    const deleting = ref(false)
    const searchPerformed = ref(false)
    const results = ref([])
    const detailsDialog = ref(false)
    const editDialog = ref(false)
    const deleteDialog = ref(false)
    const selectedHSeuno = ref(null)
    const editMode = ref(false)

    const search = reactive({
      text: '',
      norhs: '',
      euhs: '',
      chapter: '',
      norwdescr: '',
      engldescr: '',
      danedescr: '',
      gmlkortnr: '',
      nyttkortnr: '',
      kollitype: '',
      artdbkode: '',
      kommentar: ''
    })

    const snackbar = reactive({
      show: false,
      text: '',
      color: 'success'
    })

    const editedHSeuno = reactive({
      ID: null,
      NorHS: '',
      EuHS: '',
      Chapter: '',
      Norwdescr: '',
      Danedescr: '',
      Engldescr: '',
      Gmlkortnr: '',
      Nyttkortnr: '',
      Kollitype: '',
      Kollimengde: null,
      Skrivkode: '',
      FRITXTKODE1: '',
      FRITXTDESC1: '',
      FRITXTKODE2: '',
      FRITXTDESC2: '',
      FRITXTKODE3: '',
      FRITXTDESC3: '',
      Rundskriv: '',
      Toll: '',
      TempNOHS: '',
      ARTDBkode: '',
      Kolonne1: '',
      EUToll: '',
      RowToll: '',
      GSP: '',
      Kommentar: ''
    })

    const rules = {
      required: value => !!value || 'Dette feltet er påkrevd'
    }

    const headers = [
      { title: 'ID', key: 'ID', sortable: true },
      { title: 'Norsk HS', key: 'NorHS', sortable: true },
      { title: 'EU HS', key: 'EuHS', sortable: true },
      { title: 'Kapittel', key: 'Chapter', sortable: true },
      { title: 'Norsk beskr.', key: 'Norwdescr', sortable: true },
      { title: 'Engelsk beskr.', key: 'Engldescr', sortable: true },
      { title: 'Nytt kortnr', key: 'Nyttkortnr', sortable: true },
      { title: 'Handlinger', key: 'actions', sortable: false, align: 'center' }
    ]

    const searchHSeuno = async () => {
      loading.value = true
      searchPerformed.value = true
      
      try {
        const params = {}
        
        if (search.text) params.text = search.text
        if (search.norhs) params.norhs = search.norhs
        if (search.euhs) params.euhs = search.euhs
        if (search.chapter) params.chapter = search.chapter
        if (search.norwdescr) params.norwdescr = search.norwdescr
        if (search.engldescr) params.engldescr = search.engldescr
        if (search.danedescr) params.danedescr = search.danedescr
        if (search.gmlkortnr) params.gmlkortnr = search.gmlkortnr
        if (search.nyttkortnr) params.nyttkortnr = search.nyttkortnr
        if (search.kollitype) params.kollitype = search.kollitype
        if (search.artdbkode) params.artdbkode = search.artdbkode
        if (search.kommentar) params.kommentar = search.kommentar

        const response = await axios.get('/api/hseuno/search', { params })
        results.value = response.data
        
        if (results.value.length === 0) {
          showMessage('Ingen HS-koder funnet', 'info')
        } else {
          showMessage(`Fant ${results.value.length} HS-koder`, 'success')
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
      search.norhs = ''
      search.euhs = ''
      search.chapter = ''
      search.norwdescr = ''
      search.engldescr = ''
      search.danedescr = ''
      search.gmlkortnr = ''
      search.nyttkortnr = ''
      search.kollitype = ''
      search.artdbkode = ''
      search.kommentar = ''
      results.value = []
      searchPerformed.value = false
    }

    const viewDetails = (hseuno) => {
      selectedHSeuno.value = hseuno
      detailsDialog.value = true
    }

    const openAddDialog = () => {
      editMode.value = false
      resetEditedHSeuno()
      editDialog.value = true
    }

    const editHSeuno = (hseuno) => {
      editMode.value = true
      Object.assign(editedHSeuno, hseuno)
      editDialog.value = true
    }

    const closeEditDialog = () => {
      editDialog.value = false
      resetEditedHSeuno()
    }

    const resetEditedHSeuno = () => {
      editedHSeuno.ID = null
      editedHSeuno.NorHS = ''
      editedHSeuno.EuHS = ''
      editedHSeuno.Chapter = ''
      editedHSeuno.Norwdescr = ''
      editedHSeuno.Danedescr = ''
      editedHSeuno.Engldescr = ''
      editedHSeuno.Gmlkortnr = ''
      editedHSeuno.Nyttkortnr = ''
      editedHSeuno.Kollitype = ''
      editedHSeuno.Kollimengde = null
      editedHSeuno.Skrivkode = ''
      editedHSeuno.FRITXTKODE1 = ''
      editedHSeuno.FRITXTDESC1 = ''
      editedHSeuno.FRITXTKODE2 = ''
      editedHSeuno.FRITXTDESC2 = ''
      editedHSeuno.FRITXTKODE3 = ''
      editedHSeuno.FRITXTDESC3 = ''
      editedHSeuno.Rundskriv = ''
      editedHSeuno.Toll = ''
      editedHSeuno.TempNOHS = ''
      editedHSeuno.ARTDBkode = ''
      editedHSeuno.Kolonne1 = ''
      editedHSeuno.EUToll = ''
      editedHSeuno.RowToll = ''
      editedHSeuno.GSP = ''
      editedHSeuno.Kommentar = ''
    }

    const saveHSeuno = async () => {
      if (!editedHSeuno.NorHS || editedHSeuno.NorHS.trim() === '') {
        showMessage('Norsk HS-kode er påkrevd', 'error')
        return
      }
      if (!editedHSeuno.EuHS || editedHSeuno.EuHS.trim() === '') {
        showMessage('EU HS-kode er påkrevd', 'error')
        return
      }
      if (!editedHSeuno.Chapter || editedHSeuno.Chapter.trim() === '') {
        showMessage('Kapittel er påkrevd', 'error')
        return
      }

      saving.value = true
      
      try {
        if (editMode.value) {
          await axios.put(`/api/hseuno/${editedHSeuno.ID}`, editedHSeuno)
          showMessage('HS-kode oppdatert', 'success')
        } else {
          await axios.post('/api/hseuno', editedHSeuno)
          showMessage('HS-kode lagt til', 'success')
        }
        
        closeEditDialog()
        if (results.value.length > 0 || searchPerformed.value) {
          searchHSeuno()
        }
      } catch (error) {
        console.error('Lagringsfeil:', error)
        showMessage('Feil ved lagring: ' + (error.response?.data?.error || error.message), 'error')
      } finally {
        saving.value = false
      }
    }

    const deleteHSeuno = (hseuno) => {
      selectedHSeuno.value = hseuno
      deleteDialog.value = true
    }

    const confirmDelete = async () => {
      deleting.value = true
      
      try {
        await axios.delete(`/api/hseuno/${selectedHSeuno.value.ID}`)
        showMessage('HS-kode slettet', 'success')
        deleteDialog.value = false
        searchHSeuno()
      } catch (error) {
        console.error('Slettingsfeil:', error)
        showMessage('Feil ved sletting: ' + (error.response?.data?.error || error.message), 'error')
      } finally {
        deleting.value = false
      }
    }

    const exportToExcel = async () => {
      try {
        const response = await axios.post('/api/hseuno/export', 
          { hseuno: results.value },
          { responseType: 'blob' }
        )
        
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `hseuno_${new Date().toISOString().split('T')[0]}.xlsx`)
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
      selectedHSeuno,
      editMode,
      search,
      editedHSeuno,
      snackbar,
      headers,
      rules,
      searchHSeuno,
      resetSearch,
      viewDetails,
      openAddDialog,
      editHSeuno,
      closeEditDialog,
      saveHSeuno,
      deleteHSeuno,
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