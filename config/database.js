const sql = require('mssql');

// SQL Server configuration
const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  user: process.env.DB_USER || 'blr_toll_admin',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'BLR_TOLL_DB',
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERTIFICATE === 'true',
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

console.log('📊 SQL Server config:', {
  server: dbConfig.server,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port
});

// Create connection pool
let pool;

async function initializeDatabase() {
  try {
    console.log('🔄 Kobler til SQL Server...');
    pool = new sql.ConnectionPool(dbConfig);
    
    // Connect to SQL Server
    await pool.connect();
    console.log('✅ SQL Server tilkobling vellykket!');
    
    // Test connection with a simple query
    const result = await pool.request().query('SELECT GETDATE() as CurrentTime, @@VERSION as Version');
    console.log('✅ Database test query OK:', {
      time: result.recordset[0].CurrentTime,
      version: result.recordset[0].Version.substring(0, 50) + '...'
    });
    
    return true;
  } catch (error) {
    console.error('❌ SQL Server tilkoblingsfeil:', {
      message: error.message,
      code: error.code,
      server: dbConfig.server,
      database: dbConfig.database,
      user: dbConfig.user
    });
    
    // If database doesn't exist, try to create it
    if (error.message.includes('Cannot open database')) {
      console.log('🔄 Database eksisterer ikke, prøver å opprette...');
      return await createDatabase();
    }
    
    return false;
  }
}

async function createDatabase() {
  try {
    // Connect without specifying database to create it
    const masterConfig = { ...dbConfig };
    delete masterConfig.database;
    
    const masterPool = new sql.ConnectionPool(masterConfig);
    await masterPool.connect();
    
    console.log('🔄 Oppretter database:', dbConfig.database);
    await masterPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '${dbConfig.database}')
      BEGIN
        CREATE DATABASE [${dbConfig.database}];
        PRINT 'Database ${dbConfig.database} opprettet';
      END
      ELSE
      BEGIN
        PRINT 'Database ${dbConfig.database} eksisterer allerede';
      END
    `);
    
    await masterPool.close();
    console.log('✅ Database opprettet, kobler til på nytt...');
    
    // Now connect to the created database
    return await initializeDatabase();
  } catch (error) {
    console.error('❌ Kunne ikke opprette database:', error.message);
    return false;
  }
}

// Get the connection pool
function getPool() {
  if (!pool) {
    throw new Error('Database ikke initialisert. Kall initializeDatabase() først.');
  }
  return pool;
}

// Helper function for safe queries
async function query(sqlQuery, params = {}) {
  try {
    const pool = getPool();
    const request = pool.request();
    
    // Add parameters to request
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
    
    const result = await request.query(sqlQuery);
    return { 
      success: true, 
      data: result.recordset, 
      rowsAffected: result.rowsAffected[0] || 0 
    };
  } catch (error) {
    console.error('Database query error:', {
      query: sqlQuery,
      params: params,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

// Helper function for stored procedures
async function executeStoredProcedure(procedureName, params = {}) {
  try {
    const pool = getPool();
    const request = pool.request();
    
    // Add parameters to request
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
    
    const result = await request.execute(procedureName);
    return { 
      success: true, 
      data: result.recordset, 
      rowsAffected: result.rowsAffected[0] || 0 
    };
  } catch (error) {
    console.error('Stored procedure error:', {
      procedure: procedureName,
      params: params,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

// Helper function for transactions
async function transaction(queries) {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    
    const results = [];
    for (const { query: sqlQuery, params } of queries) {
      const request = new sql.Request(transaction);
      
      // Add parameters to request
      for (const [key, value] of Object.entries(params || {})) {
        request.input(key, value);
      }
      
      const result = await request.query(sqlQuery);
      results.push({
        data: result.recordset,
        rowsAffected: result.rowsAffected[0] || 0
      });
    }
    
    await transaction.commit();
    return { success: true, results };
    
  } catch (error) {
    await transaction.rollback();
    console.error('Transaction error:', error);
    return { success: false, error: error.message };
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Lukker SQL Server tilkoblinger...');
  if (pool) {
    await pool.close();
    console.log('✅ SQL Server tilkoblinger lukket');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Lukker SQL Server tilkoblinger...');
  if (pool) {
    await pool.close();
    console.log('✅ SQL Server tilkoblinger lukket');
  }
});

// Export functions
module.exports = {
  initializeDatabase,
  getPool,
  query,
  executeStoredProcedure,
  transaction,
  sql // Export sql object for types
};