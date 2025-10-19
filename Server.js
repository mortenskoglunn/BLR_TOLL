const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import database
const { initializeDatabase, query } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const databaseRoutes = require('./routes/database');
const uploadRoutes = require('./routes/upload');
const productsRoutes = require('./routes/products');
const blomsterImportRoutes = require('./routes/blomster_import'); // NY IMPORT

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database on startup
initializeDatabase().then(connected => {
  if (connected) {
    console.log('✅ Database initialisert ved oppstart');
  } else {
    console.log('⚠️  Database tilkobling feilet ved oppstart');
  }
});

// Basic security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));
app.use(compression());

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'For mange forespørsler fra denne IP-adressen. Prøv igjen senere.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:3000',
      'http://127.0.0.1:8080',
      process.env.FRONTEND_URL
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Ikke tillatt av CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: process.env.DB_NAME,
    version: '1.0.0'
  });
});

// Test database connection endpoint
app.get('/test-db', async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as UserCount FROM dbo.users');
    const productsResult = await query('SELECT COUNT(*) as ProductsCount FROM dbo.products');
    const blomsterImportResult = await query('SELECT COUNT(*) as BlomsterImportCount FROM dbo.blomster_import');
    
    if (result.success && productsResult.success && blomsterImportResult.success) {
      res.json({ 
        message: 'Database tilkobling OK',
        users: result.data[0].UserCount,
        products: productsResult.data[0].ProductsCount,
        blomster_import: blomsterImportResult.data[0].BlomsterImportCount,
        server: process.env.DB_SERVER,
        database: process.env.DB_NAME
      });
    } else {
      throw new Error('Database query feilet');
    }
  } catch (error) {
    res.status(500).json({ 
      error: 'Database test feilet', 
      details: error.message,
      config: {
        server: process.env.DB_SERVER,
        database: process.env.DB_NAME,
        user: process.env.DB_USER
      }
    });
  }
});

// API routes
console.log('🔗 Registrerer API routes...');
app.use('/api/auth', authRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/blomster-import', blomsterImportRoutes); // NY ROUTE
console.log('✅ API routes registrert');

// Development route
app.get('/', (req, res) => {
  res.json({
    message: 'BLR TOLL API Server er oppe og kjører! 🚀',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    database: {
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      connected: '✅'
    },
    endpoints: {
      health: 'GET /health',
      testDatabase: 'GET /test-db',
      auth: {
        login: 'POST /api/auth/login',
        verify: 'GET /api/auth/verify',
        register: 'POST /api/auth/register',
        users: 'GET /api/auth/users (admin)',
        excelTemplates: 'GET /api/auth/excel-templates'
      },
      products: {
        list: 'GET /api/products',
        search: 'GET /api/products/search',
        single: 'GET /api/products/:id',
        delete: 'DELETE /api/products/:id'
      },
      blomsterImport: {
        list: 'GET /api/blomster-import',
        single: 'GET /api/blomster-import/:id',
        delete: 'DELETE /api/blomster-import/:id',
        stats: 'GET /api/blomster-import/stats/summary'
      },
      database: {
        search: 'GET /api/database/search?blomst=navn',
        batchSearch: 'POST /api/database/batch-search',
        stats: 'GET /api/database/stats'
      },
      upload: {
        excel: 'POST /api/upload/excel',
        export: 'POST /api/upload/export',
        history: 'GET /api/upload/history'
      }
    },
    testUsers: {
      admin: { username: 'admin', password: 'admin123' },
      user: { username: 'bruker', password: 'bruker123' },
      viewer: { username: 'viewer', password: 'viewer123' }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  
  // Multer specific errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      error: 'Filen er for stor. Maksimal størrelse er 10MB.' 
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ 
      error: 'Uventet fil-upload.' 
    });
  }

  res.status(err.status || 500).json({ 
    error: 'Intern serverfeil',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Noe gikk galt',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endepunkt ikke funnet',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /test-db',
      'POST /api/auth/login',
      'GET /api/auth/verify',
      'GET /api/products',
      'GET /api/products/search',
      'GET /api/blomster-import',
      'GET /api/database/search',
      'POST /api/upload/excel'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 BLR TOLL Server kjører på port ${PORT}`);
  console.log(`📊 Miljø: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📁 Prosjektmappe: ${__dirname}`);
  console.log(`💾 Database: ${process.env.DB_NAME || 'ikke konfigurert'}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log('');
  console.log('✅ Test API-et:');
  console.log(`   - Server info: http://localhost:${PORT}`);
  console.log(`   - Database: http://localhost:${PORT}/test-db`);
  console.log(`   - Innlogging: POST http://localhost:${PORT}/api/auth/login`);
  console.log('');
  console.log('📋 Tilgjengelige routes:');
  console.log('   - /api/auth           → Autentisering');
  console.log('   - /api/products       → Products-tabellen');
  console.log('   - /api/blomster-import → Blomster_import-tabellen');
  console.log('   - /api/database       → Database-søk');
  console.log('   - /api/upload         → Excel import/export');
  console.log('');
});

module.exports = app;