const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Konfigurer multer for fil-upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Kun Excel-filer (.xlsx, .xls) er tillatt'));
    }
  }
});

// EXCEL IMPORT MED MAL - Importerer til blomster_import
router.post('/excel', authenticateToken, upload.single('file'), async (req, res) => {
  let importLogId = null;
  let importBatchId = null;
  
  try {
    console.log('📊 Excel import startet');
    console.log('Fil:', req.file?.originalname);
    console.log('Bruker:', req.user.username);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Ingen fil lastet opp'
      });
    }

    // Hent mal-informasjon fra request
    const templateId = req.body.templateId;
    const templateName = req.body.templateName;
    const supplierName = req.body.supplierName;
    const hasHeader = req.body.hasHeader === 'true';
    const columnMappings = JSON.parse(req.body.columnMappings || '[]');
    
    // Hent brukerinfo fra request (sendt fra frontend) eller fra JWT token
    const userId = req.body.userId || req.user.userId || null;
    const username = req.body.username || req.user.username || 'unknown';

    // Generer unik batch ID for denne importen
    importBatchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log('📋 Mal:', templateName);
    console.log('🏢 Leverandør:', supplierName);
    console.log('📑 Header:', hasHeader ? 'Ja' : 'Nei');
    console.log('🗂️ Kolonner:', columnMappings.length);
    console.log('🔖 Batch ID:', importBatchId);
    console.log('👤 Importert av:', username, '(ID:', userId, ')');

    // Les Excel-fil
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Les alltid som array (uten å bruke header-navn)
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, // Få data som array av arrays
      defval: null // Sett tomme celler til null
    });

    console.log('📊 Totalt rader i Excel:', rawData.length);

    // Hvis template har header, hopp over første rad
    const dataRows = hasHeader ? rawData.slice(1) : rawData;
    console.log('📊 Data-rader å prosessere:', dataRows.length);
    
    if (hasHeader) {
      console.log('📋 Header-rad (ignoreres):', rawData[0]);
    }

    // Opprett import log
    const logResult = await query(
      `INSERT INTO dbo.import_logs 
       (template_id, filename, rows_processed, status, imported_by, import_started)
       OUTPUT INSERTED.id
       VALUES (@templateId, @filename, @rowsProcessed, @status, @importedBy, GETDATE())`,
      {
        templateId: templateId || null,
        filename: req.file.originalname,
        rowsProcessed: dataRows.length,
        status: 'processing',
        importedBy: req.user.userId
      }
    );

    if (logResult.success && logResult.data.length > 0) {
      importLogId = logResult.data[0].id;
      console.log('✅ Import log opprettet:', importLogId);
    }

    // Prosesser hver rad
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      try {
        // Bygg data-objekt basert på kolonnemapping
        const importData = {
          import_log_id: importLogId,
          import_batch_id: importBatchId,
          imported_by_user_id: userId,
          imported_by_username: username,
          import_status: 'pending'
        };

        // Map Excel-kolonner til database-felt
        for (const mapping of columnMappings) {
          // Alltid bruk kolonne-indeks (A, B, C konverteres til 0, 1, 2)
          const excelColIndex = getColumnIndex(mapping.excel_column);
          let value = row[excelColIndex];
          
          // Debug logging for første rad
          if (i === 0) {
            console.log(`   📍 Mapping: ${mapping.excel_column} → index ${excelColIndex} → value "${value}" → field ${mapping.database_field}`);
          }
          
          // Sjekk om påkrevd felt mangler
          if (mapping.required && (value === null || value === undefined || value === '')) {
            throw new Error(`Påkrevd felt mangler: ${mapping.database_field} (Excel kolonne: ${mapping.excel_column})`);
          }
          
          if (value !== null && value !== undefined && value !== '') {
            // Konverter dato-felt
            if (mapping.database_field === 'Invoice_Date' && typeof value === 'string') {
              value = convertDateFormat(value);
            }
            
            importData[mapping.database_field] = value;
          }
        }

        // Debug: Log første rad for å se hva som mappes
        if (i === 0) {
          console.log('📋 Første rad mappet data:', importData);
        }

        // Sett inn i blomster_import
        await insertToBlomsterImport(importData);
        successCount++;

      } catch (error) {
        failCount++;
        errors.push({
          row: i + (hasHeader ? 2 : 1), // Excel rad-nummer
          error: error.message
        });
        console.error(`❌ Feil på rad ${i + 1}:`, error.message);
      }
    }

    // Oppdater import log
    await query(
      `UPDATE dbo.import_logs 
       SET rows_successful = @successCount,
           rows_failed = @failCount,
           status = @status,
           import_completed = GETDATE(),
           error_message = @errorMessage
       WHERE id = @importLogId`,
      {
        successCount,
        failCount,
        status: failCount === 0 ? 'completed' : (successCount > 0 ? 'partial' : 'failed'),
        errorMessage: errors.length > 0 ? JSON.stringify(errors.slice(0, 10)) : null,
        importLogId
      }
    );

    // Slett den opplastede filen
    fs.unlinkSync(req.file.path);

    console.log('✅ Import fullført');
    console.log(`   Vellykkede: ${successCount}`);
    console.log(`   Feilet: ${failCount}`);
    console.log(`   Importert til blomster_import med batch: ${importBatchId}`);

    res.json({
      success: true,
      message: 'Import fullført',
      rowsProcessed: dataRows.length,
      rowsSuccessful: successCount,
      rowsFailed: failCount,
      errors: errors.slice(0, 10), // Send kun første 10 feil
      importLogId,
      importBatchId
    });

  } catch (error) {
    console.error('❌ Excel import error:', error);

    // Oppdater import log til failed hvis den ble opprettet
    if (importLogId) {
      await query(
        `UPDATE dbo.import_logs 
         SET status = @status,
             error_message = @errorMessage,
             import_completed = GETDATE()
         WHERE id = @importLogId`,
        {
          status: 'failed',
          errorMessage: error.message,
          importLogId
        }
      );
    }

    // Slett filen hvis den eksisterer
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Import feilet',
      error: error.message
    });
  }
});

// Hjelpefunksjon: Konverter dato-format
function convertDateFormat(dateStr) {
  if (!dateStr) return null;
  
  // Håndter Excel dato-nummer (serielt tall)
  if (typeof dateStr === 'number') {
    // Excel dato som tall (dager siden 1900-01-01)
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateStr * 86400000);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }
  
  dateStr = String(dateStr).trim();
  
  // Håndter DD.MM.YYYY format (norsk)
  if (dateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
    const [day, month, year] = dateStr.split('.');
    return `${year}-${month}-${day}`; // YYYY-MM-DD
  }
  
  // Håndter DD/MM/YYYY format
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`; // YYYY-MM-DD
  }
  
  // Håndter YYYY-MM-DD (allerede riktig format)
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  // Prøv å parse med Date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  // Returner original hvis vi ikke kan konvertere
  console.warn(`⚠️ Kunne ikke konvertere dato: ${dateStr}`);
  return dateStr;
}

// Hjelpefunksjon: Konverter Excel-kolonne (A, B, C) til indeks (0, 1, 2)
function getColumnIndex(column) {
  // Hvis det allerede er et tall, returner det
  if (typeof column === 'number') {
    return column;
  }
  
  // Konverter string til string for sikkerhet
  column = String(column).trim().toUpperCase();
  
  // Sjekk om det er et tall som string
  const numericValue = parseInt(column);
  if (!isNaN(numericValue)) {
    return numericValue;
  }
  
  // Konverter bokstav til tall (A=0, B=1, C=2, etc.)
  let index = 0;
  
  for (let i = 0; i < column.length; i++) {
    const charCode = column.charCodeAt(i);
    // Sjekk at det er en bokstav (A-Z)
    if (charCode >= 65 && charCode <= 90) {
      index = index * 26 + (charCode - 64);
    } else {
      // Ugyldig tegn, returner som er
      console.warn(`⚠️ Ugyldig kolonneformat: ${column}`);
      return column;
    }
  }
  
  // Returner 0-basert indeks
  return index - 1;
}

// Hjelpefunksjon: Sett inn i blomster_import
async function insertToBlomsterImport(importData) {
  const fields = Object.keys(importData).filter(key => importData[key] !== undefined);
  const values = fields.map(field => `@${field}`).join(', ');
  const columns = fields.join(', ');
  
  const params = {};
  fields.forEach(field => {
    params[field] = importData[field];
  });

  const insertQuery = `
    INSERT INTO dbo.blomster_import (${columns}, created_at, updated_at)
    VALUES (${values}, GETDATE(), GETDATE())
  `;

  const result = await query(insertQuery, params);
  
  if (!result.success) {
    throw new Error('Database insert feilet: ' + (result.error || 'Unknown error'));
  }
}

// EKSPORTER DATA TIL EXCEL (fra blomster_import)
router.post('/export', authenticateToken, async (req, res) => {
  try {
    const { filters, source } = req.body;

    console.log('📤 Excel export startet');

    // Velg tabell basert på source
    const tableName = source === 'products' ? 'dbo.products' : 'dbo.blomster_import';
    
    // Hent data fra database basert på filtre
    let queryStr = `SELECT * FROM ${tableName} WHERE 1=1`;
    const params = {};

    // Filters for supplier_name and category removed (columns don't exist)

    if (filters?.import_batch_id) {
      queryStr += ' AND import_batch_id = @importBatchId';
      params.importBatchId = filters.import_batch_id;
    }

    queryStr += ' ORDER BY created_at DESC';

    const result = await query(queryStr, params);

    if (!result.success) {
      throw new Error('Kunne ikke hente data');
    }

    console.log('📊 Eksporterer', result.data.length, 'rader');

    // Opprett workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(result.data);

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');

    // Generer fil
    const filename = `export-${Date.now()}.xlsx`;
    const filepath = path.join(__dirname, '../uploads', filename);

    XLSX.writeFile(workbook, filepath);

    // Send fil
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      
      // Slett fil etter sending
      fs.unlinkSync(filepath);
    });

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Eksport feilet',
      error: error.message
    });
  }
});

// HENT IMPORT HISTORIKK
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        il.id,
        il.filename,
        il.rows_processed,
        il.rows_successful,
        il.rows_failed,
        il.status,
        il.import_started,
        il.import_completed,
        DATEDIFF(SECOND, il.import_started, il.import_completed) as duration_seconds,
        t.name as template_name,
        u.username as imported_by_username
      FROM dbo.import_logs il
      LEFT JOIN dbo.excel_templates t ON il.template_id = t.id
      LEFT JOIN dbo.users u ON il.imported_by = u.id
      ORDER BY il.import_started DESC
    `);

    if (result.success) {
      res.json({
        success: true,
        history: result.data
      });
    } else {
      throw new Error('Kunne ikke hente historikk');
    }

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Kunne ikke hente import-historikk',
      error: error.message
    });
  }
});

module.exports = router;