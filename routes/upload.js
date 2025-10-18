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

// EXCEL IMPORT MED MAL
router.post('/excel', authenticateToken, upload.single('file'), async (req, res) => {
  let importLogId = null;
  
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

    console.log('📋 Mal:', templateName);
    console.log('🏢 Leverandør:', supplierName);
    console.log('📑 Header:', hasHeader ? 'Ja' : 'Nei');
    console.log('🗂️ Kolonner:', columnMappings.length);

    // Les Excel-fil
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Konverter til JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, // Få data som array av arrays
      defval: null // Sett tomme celler til null
    });

    console.log('📊 Totalt rader i Excel:', rawData.length);

    // Fjern header-rad hvis spesifisert i mal
    const dataRows = hasHeader ? rawData.slice(1) : rawData;
    console.log('📊 Data-rader å prosessere:', dataRows.length);

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
        // Bygg produkt-objekt basert på kolonnemapping
        const productData = {
          supplier_name: supplierName,
          import_log_id: importLogId
        };

        // Map Excel-kolonner til database-felt
        for (const mapping of columnMappings) {
          const excelColIndex = getColumnIndex(mapping.excel_column);
          const value = row[excelColIndex];
          
          // Sjekk om påkrevd felt mangler
          if (mapping.required && !value) {
            throw new Error(`Påkrevd felt mangler: ${mapping.database_field}`);
          }
          
          if (value !== null && value !== undefined) {
            productData[mapping.database_field] = value;
          }
        }

        // Sett inn produkt i database
        await insertProduct(productData);
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

    res.json({
      success: true,
      message: 'Import fullført',
      rowsProcessed: dataRows.length,
      rowsSuccessful: successCount,
      rowsFailed: failCount,
      errors: errors.slice(0, 10), // Send kun første 10 feil
      importLogId
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

// Hjelpefunksjon: Konverter Excel-kolonne (A, B, C) til indeks (0, 1, 2)
function getColumnIndex(column) {
  if (typeof column === 'number') {
    return column;
  }
  
  // Konverter bokstav til tall (A=0, B=1, etc.)
  let index = 0;
  column = column.toUpperCase();
  
  for (let i = 0; i < column.length; i++) {
    index = index * 26 + (column.charCodeAt(i) - 64);
  }
  
  return index - 1; // 0-basert indeks
}

// Hjelpefunksjon: Sett inn produkt i database
async function insertProduct(productData) {
  const fields = Object.keys(productData).filter(key => productData[key] !== undefined);
  const values = fields.map(field => `@${field}`).join(', ');
  const columns = fields.join(', ');
  
  const params = {};
  fields.forEach(field => {
    params[field] = productData[field];
  });

  const insertQuery = `
    INSERT INTO dbo.products (${columns}, created_at, updated_at)
    VALUES (${values}, GETDATE(), GETDATE())
  `;

  const result = await query(insertQuery, params);
  
  if (!result.success) {
    throw new Error('Database insert feilet');
  }
}

// EKSPORTER DATA TIL EXCEL
router.post('/export', authenticateToken, async (req, res) => {
  try {
    const { filters, columns } = req.body;

    console.log('📤 Excel export startet');

    // Hent data fra database basert på filtre
    let queryStr = 'SELECT * FROM dbo.products WHERE 1=1';
    const params = {};

    if (filters?.supplier_name) {
      queryStr += ' AND supplier_name = @supplierName';
      params.supplierName = filters.supplier_name;
    }

    if (filters?.category) {
      queryStr += ' AND category = @category';
      params.category = filters.category;
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