# BLR TOLL System

Et komplett web-basert system for import og håndtering av blomster-produktdata med integrert toll-informasjon.

## 📋 Oversikt

BLR TOLL er en Vue.js-applikasjon designet for Business Logistics Rasmussen (BLR) som lar brukere:
- Importere Excel-filer med produktdata fra ulike leverandører
- Søke i produktdatabase med avanserte filtre
- Administrere import-maler for forskjellige leverandørformater
- Administrere brukere og tilgangskontroll
- Se statistikk og produktoversikt

## 🏗️ Teknologi Stack

### Frontend
- **Vue 3** (Composition API)
- **Vuetify 3** - Material Design komponentbibliotek
- **Vue Router** - Routing
- **Axios** - HTTP-klient

### Backend (separat repository)
- **Node.js** med Express
- **SQL Server** - Database
- **JWT** - Autentisering

## 🚀 Kom i gang

### Forutsetninger
```bash
Node.js v16 eller nyere
npm eller yarn
```

### Installasjon

1. **Klon repositoryet**
```bash
git clone https://github.com/mortenskoglunn/BLR_TOLL.git
cd BLR_TOLL
```

2. **Installer avhengigheter**
```bash
npm install
```

3. **Konfigurer miljøvariabler**

Opprett `.env` fil i rot-mappen:
```env
VUE_APP_API_URL=http://localhost:5000
```

4. **Start utviklingsserver**
```bash
npm run serve
```

Applikasjonen kjører nå på `http://localhost:8080`

## 📁 Prosjektstruktur

```
BLR_TOLL/
├── src/
│   ├── components/
│   │   └── LoginForm.vue          # Innloggingsskjema
│   ├── views/
│   │   ├── Home.vue               # Hjemmeside (innlogging)
│   │   ├── Dashboard.vue          # Dashboard med statistikk
│   │   ├── ProductSearch.vue      # Produktsøk
│   │   ├── ExcelImport.vue        # Excel fil-import
│   │   ├── ExcelTemplates.vue     # Mal-administrasjon
│   │   ├── Products.vue           # Produktliste
│   │   ├── Products_import.vue    # Importerte produkter (blomster_import)
│   │   ├── AdminUsers.vue         # Brukeradministrasjon
│   │   └── TestView.vue           # API-test side
│   ├── router/
│   │   └── index.js               # Vue Router konfigurasjon
│   ├── App.vue                    # Hoved-app komponent
│   └── main.js                    # Applikasjonens inngang
├── public/
├── package.json
└── README.md
```

## 🔐 Brukerroller

Systemet har tre brukerroller:

- **Admin** - Full tilgang til alle funksjoner inkludert brukeradministrasjon og mulighet til å tømme produkttabeller
- **User** - Standard bruker med tilgang til import og søk
- **Viewer** - Kun lesetilgang til produktdata

## 🎯 Hovedfunksjoner

### 1. Dashboard
- Oversikt over totalt produkter
- Antall kategorier og tariffnummer
- Hurtiglenker til ofte brukte funksjoner
- Systemstatistikk

### 2. Produktsøk
**Grunnleggende søk:**
- Fritekst-søk i produktnavn, artikkel og tariffnummer

**Avansert søk med filtre:**
- Søkenavn
- Art1, Art2, Art3 (artikkel/varenummer)
- Tar1, Tar2 (tariffnummer)
- Kategori (Kat)
- Emma-navn
- Notat

**Visning:**
- Tabellvisning med alle relevante felt
- Detaljvisning med fullstendig produktinformasjon
- Kopiering av produktdata til utklippstavle

### 3. Importerte Produkter (Products_import.vue)
Visning og administrasjon av produkter fra `blomster_import` tabellen:

**Statistikk:**
- Totalt antall produkter
- Antall leverandører
- Antall kategorier
- Import siste 24 timer

**Filter og søk:**
- Fritekst-søk i alle felter
- Filtrer på leverandør
- Filtrer på kategori

**Funksjoner:**
- Vis produktdetaljer
- Slett enkeltprodukter
- Eksporter til Excel
- **Tøm tabell** (kun admin) - sletter alle produkter fra blomster_import

**Produkttabell:**
- Sortérbar kolonneoversikt
- 10/25/50/100 produkter per side
- Fast header ved scrolling
- Responsive kolonner med alignment

### 4. Excel Import

**Trinn 1: Velg Import-mal**
- Liste over aktive import-maler
- Søk i maler etter navn eller leverandør
- Viser kolonneantall og header-konfigurasjon

**Trinn 2: Last opp Excel-fil**
- Støtte for .xlsx og .xls formater
- Automatisk kolonne-mapping basert på valgt mal
- Header-deteksjon (første rad kan skippes)

**Import-resultat:**
- Antall rader behandlet
- Vellykkede importer
- Feilede importer med detaljer

### 5. Excel Maler

Administrasjon av import-maler for ulike leverandører:

**Mal-konfigurasjon:**
- Mal navn (f.eks. "Nederlandse Bloemen BV - Standard")
- Leverandørnavn
- Beskrivelse
- Header-innstilling (med/uten header-rad)
- Status (aktiv/inaktiv)

**Kolonnemapping:**
Koble Excel-kolonner til database-felt i `blomster_import` tabellen:

| Excel Kolonne | Database Felt | Påkrevd |
|---------------|---------------|---------|
| A eller "Invoice_Date" | Invoice_Date | ✓ |
| B eller "Description" | Description | ✓ |
| C eller "EAN" | product_code | ✗ |
| ... | ... | ... |

**Tilgjengelige database-felt:**
- `Invoice_Date`, `Invoice_Number`, `Currency`
- `Description`, `Pot_Size`, `Number_Of_Tray`, `Amount_per_Tray`
- `Price`, `EAN`, `Tariff_Number`
- `Country_Of_Origin_Raw`, `Weight_per_order_line`, `Gross_Weight_per_order_line`
- `product_code`, `product_name`, `supplier_name`
- `price_nok`, `quantity`, `unit`
- `category`, `hs_code`, `country_of_origin`, `weight`

### 6. Brukeradministrasjon (kun Admin)

**Bruker-funksjoner:**
- Opprett nye brukere
- Rediger eksisterende brukere
- Endre brukerroller
- Aktiver/deaktiver brukere
- Slett brukere
- Se innloggingsstatistikk

**Brukerfelt:**
- Brukernavn (unikt, 3+ tegn)
- Fullt navn
- E-post
- Rolle (admin/user/viewer)
- Passord (6+ tegn)
- Status (aktiv/inaktiv)

**Sikkerhet:**
- Brukere kan ikke deaktivere eller slette seg selv
- Sletting krever bekreftelse ("SLETT")
- Passordendring ved redigering

### 7. Produktliste
- Fullstendig produktoversikt
- Filtrering på leverandør og kategori
- Eksport til Excel
- Produktdetaljer med all informasjon
- Redigering og sletting

### 8. Test API
Testside for utvikling og feilsøking:
- Database-forbindelsestest
- Blomst-søk test
- Bruker-info test
- Database-statistikk

## 🔧 Konfigurasjon

### Axios Interceptors

**Request Interceptor:**
```javascript
// Legger til JWT token i alle requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('toll_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

**Response Interceptor:**
```javascript
// Håndterer utløpte tokens
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect til login
      localStorage.removeItem('toll_token')
      localStorage.removeItem('toll_user')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)
```

### Vuetify Theme

```javascript
theme: {
  defaultTheme: 'light',
  themes: {
    light: {
      colors: {
        primary: '#1976D2',    // Blå
        secondary: '#424242',   // Mørk grå
        accent: '#82B1FF',      // Lys blå
        error: '#FF5252',       // Rød
        info: '#2196F3',        // Info blå
        success: '#4CAF50',     // Grønn
        warning: '#FF9800'      // Oransje
      }
    }
  }
}
```

## 📊 Database Skjema

### blomster_import tabell
Hovedtabell for importerte produkter:

```sql
- id (int, primary key)
- Invoice_Date (datetime)
- Invoice_Number (varchar)
- Currency (varchar)
- Description (varchar)
- Pot_Size (varchar)
- Number_Of_Tray (int)
- Amount_per_Tray (int)
- Price (decimal)
- EAN (varchar)
- Tariff_Number (varchar)
- Country_Of_Origin_Raw (varchar)
- Weight_per_order_line (decimal)
- Gross_Weight_per_order_line (decimal)
- product_code (varchar)
- product_name (varchar)
- supplier_name (varchar)
- price_nok (decimal)
- quantity (int)
- unit (varchar)
- category (varchar)
- hs_code (varchar)
- country_of_origin (varchar)
- weight (decimal)
- created_at (datetime)
```

### users tabell
```sql
- id (int, primary key)
- username (varchar, unique)
- password_hash (varchar)
- full_name (varchar)
- email (varchar)
- role (varchar: admin/user/viewer)
- active (bit)
- login_count (int)
- last_login (datetime)
- created_at (datetime)
```

### excel_templates tabell
```sql
- id (int, primary key)
- name (varchar)
- supplier_name (varchar)
- description (text)
- has_header (bit)
- column_mappings (text/json)
- active (bit)
- created_at (datetime)
- updated_at (datetime)
```

## 🔒 Sikkerhet

- JWT token-basert autentisering
- Rollbasert tilgangskontroll (RBAC)
- Token utløper automatisk ved inaktivitet
- Passord hashet på server-side
- HTTPS anbefalt i produksjon

## 🌐 API Endpoints (Backend)

### Autentisering
- `POST /api/auth/login` - Innlogging
- `POST /api/auth/register` - Registrer bruker
- `GET /api/auth/me` - Hent brukerinfo
- `GET /api/auth/users` - Liste brukere (admin)
- `PUT /api/auth/users/:id` - Oppdater bruker (admin)
- `DELETE /api/auth/users/:id` - Slett bruker (admin)

### Excel Maler
- `GET /api/auth/excel-templates` - Hent alle maler
- `POST /api/auth/excel-templates` - Opprett mal
- `PUT /api/auth/excel-templates/:id` - Oppdater mal
- `DELETE /api/auth/excel-templates/:id` - Slett mal

### Excel Import
- `POST /api/upload/excel` - Last opp og importer Excel
- `POST /api/upload/export` - Eksporter produkter til Excel

### Produkter (blomster_import)
- `GET /api/blomster-import` - Hent alle produkter
- `GET /api/blomster-import/:id` - Hent ett produkt
- `POST /api/blomster-import/clear` - Tøm alle produkter (admin only)
- `POST /api/blomster-import/batch-delete` - Slett flere produkter
- `PUT /api/blomster-import/:id` - Oppdater produkt
- `DELETE /api/blomster-import/:id` - Slett produkt
- `GET /api/blomster-import/stats/summary` - Hent statistikk
- `GET /api/blomster-import/filters/unique-values` - Hent unike verdier for filtre

### Database
- `GET /api/database/stats` - Hent statistikk
- `GET /api/database/search` - Søk i database
- `GET /api/database/products` - Hent produkter
- `DELETE /api/products/:id` - Slett produkt
- `GET /health` - Health check

## 🚢 Deployment

### Produksjonsbygg
```bash
npm run build
```

Dette genererer optimaliserte filer i `dist/` mappen.

### Miljøvariabler for produksjon
```env
VUE_APP_API_URL=https://api.blr-toll.no
NODE_ENV=production
```

## 📝 Utviklingsnotater

### Kodestil
- Vue 3 Composition API
- ESLint konfigurasjon
- Norske labels og meldinger
- Engelske variabelnavn og kode

### Navngivningskonvensjoner
- Komponenter: PascalCase (f.eks. `ProductSearch.vue`)
- Variabler: camelCase (f.eks. `searchResults`)
- Database-felt: snake_case eller PascalCase avhengig av kilde

### Vuetify 3 Spesifikke Notater

**VIKTIG: Vuetify 3 bruker nye property-navn i v-data-table:**

❌ **Vuetify 2 (gammelt):**
```javascript
const headers = [
  { text: 'ID', value: 'id' }
]
```

✅ **Vuetify 3 (nytt):**
```javascript
const headers = [
  { title: 'ID', key: 'id' }
]
```

**Endringer fra Vuetify 2 til 3:**
- `text` → `title` (for kolonneoverskrift)
- `value` → `key` (for data-binding)

**CSS Deep Selector:**
```css
/* Gammelt (Vuetify 2) */
.v-data-table >>> .v-data-table-header th { }

/* Nytt (Vuetify 3) */
:deep(.v-data-table-header) th { }
:deep(.v-data-table__th) { }
```

**Fixed Header i Data Table:**
```vue
<v-data-table
  fixed-header
  height="600px"
  :headers="headers"
  :items="items"
/>
```

## 🐛 Feilsøking

### Vanlige problemer

**Problem: "Network Error" ved API-kall**
- Sjekk at backend kjører på korrekt port
- Verifiser `VUE_APP_API_URL` i `.env`
- Sjekk CORS-innstillinger på backend

**Problem: "Unauthorized" feil**
- Token kan ha utløpt
- Logg ut og inn igjen
- Sjekk at token lagres i localStorage

**Problem: Excel import feiler**
- Verifiser at kolonne-mapping er korrekt
- Sjekk at påkrevde felt er mappet
- Se etter feilmeldinger i import-resultatet

**Problem: Kolonneoverskrifter vises ikke i v-data-table**
- Sjekk at du bruker `title` og `key` (ikke `text` og `value`)
- Verifiser at Vuetify 3 er installert korrekt
- Bruk `:deep()` selector i CSS for å style headers

**Problem: "Kun administratorer kan tømme hele tabellen"**
- Funksjonen krever admin-rolle
- Sjekk brukerens rolle i systemet
- Kun admin-brukere kan bruke "Tøm tabell"-funksjonen

## 📞 Support

For spørsmål eller problemer, kontakt:
- Utvikler: [Utvikler Navn]
- E-post: support@blr-toll.no

## 📄 Lisens

Proprietær - Business Logistics Rasmussen (BLR)

---

**Versjon:** 1.0.0  
**Sist oppdatert:** Oktober 2025