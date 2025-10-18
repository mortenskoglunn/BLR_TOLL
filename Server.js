const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import database
const { initializeDatabase, query } = require('./config/database');

// Import routes (legg til når filene eksisterer)
const authRoutes = require('./routes/auth');

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
    const blomsterResult = await query('SELECT COUNT(*) as BlomsterCount FROM dbo.blomster');
    
    if (result.success && blomsterResult.success) {
      res.json({ 
        message: 'Database tilkobling OK',
        users: result.data[0].UserCount,
        blomster: blomsterResult.data[0].BlomsterCount,
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

// Placeholder for other routes
const databaseRoutes = require('./routes/database');
app.use('/api/database', databaseRoutes);

const uploadRoutes = require('./routes/upload');
app.use('/api/upload', uploadRoutes);

const productsRoutes = require('./routes/products');
app.use('/api/products', productsRoutes);

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
      connected: '✅' // Vis alltid som tilkoblet for nå
    },
    endpoints: {
      health: 'GET /health',
      testDatabase: 'GET /test-db',
      auth: {
        login: 'POST /api/auth/login',
        verify: 'GET /api/auth/verify',
        register: 'POST /api/auth/register'
      },
      database: {
        search: 'GET /api/database/search?blomst=navn',
        batchSearch: 'POST /api/database/batch-search'
      },
      upload: {
        excel: 'POST /api/upload/excel',
        export: 'POST /api/upload/export'
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
      'GET /api/database',
      'GET /api/upload'
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
});

module.exports = app;