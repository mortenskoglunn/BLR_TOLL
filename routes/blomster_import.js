const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// HENT ALLE IMPORTERTE PRODUKTER fra blomster_import
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📦 Henter importerte produkter fra blomster_import...');
    
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit), 10000) : 5000;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    
    // Filtre
    const filters = req.query;
    const conditions = [];
    const params = { offset, limit };
    
    // Filtre for supplier_name og category er fjernet siden kolonnene ikke finnes lenger
    
    if (filters.import_batch_id) {
      conditions.push('import_batch_id = @importBatchId');
      params.importBatchId = filters.import_batch_id;
    }
    
    if (filters.import_status) {
      conditions.push('import_status = @importStatus');
      params.importStatus = filters.import_status;
    }

    // Søk i flere felt
    if (filters.search) {
      conditions.push(`(
        Description LIKE @search 
        OR EAN LIKE @search 
        OR Tariff_Number LIKE @search
      )`);
      params.search = `%${filters.search}%`;
    }
    
    // BRUKERBASERT FILTRERING
    // Non-admin kan kun se sine egne produkter
    // Admin kan velge å se alle eller spesifikke brukere
    
    console.log('🔍 Filter debug:', {
      role: req.user.role,
      username: req.user.username,
      imported_by_user: filters.imported_by_user,
      type: typeof filters.imported_by_user
    });
    
    if (req.user.role !== 'admin') {
      // Non-admin: Kun egne produkter
      conditions.push('imported_by_username = @currentUser');
      params.currentUser = req.user.username;
      console.log('👤 Filtrerer på bruker (non-admin):', req.user.username);
    } else if (filters.imported_by_user === 'mine') {
      // Admin: Mine produkter
      conditions.push('imported_by_username = @currentUser');
      params.currentUser = req.user.username;
      console.log('👤 Admin ser egne produkter:', req.user.username);
    } else if (filters.imported_by_user && filters.imported_by_user !== 'all' && filters.imported_by_user !== 'mine') {
      // Admin: Spesifikk bruker valgt (ikke 'mine' og ikke 'all')
      conditions.push('imported_by_username = @importedByUser');
      params.importedByUser = filters.imported_by_user;
      console.log('👤 Admin filtrerer på bruker:', filters.imported_by_user);
    } else {
      console.log('👤 Admin ser alle produkter');
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    
    // Hent total count
    const countResult = await query(`
      SELECT COUNT(*) as total FROM dbo.blomster_import ${whereClause}
    `, params);
    
    // Hent data
    const result = await query(`
      SELECT 
        id,
        Invoice_Date,
        Invoice_Number,
        Currency,
        Description,
        Pot_Size,
        Number_Of_Tray,
        Amount_per_Tray,
        Price,
        EAN,
        Tariff_Number,
        Country_Of_Origin_Raw,
        Weight_per_order_line,
        Gross_Weight_per_order_line,
        import_log_id,
        import_batch_id,
        import_status,
        created_at,
        updated_at
      FROM dbo.blomster_import
      ${whereClause}
      ORDER BY created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, params);

    if (!result.success) {
      throw new Error('Kunne ikke hente produkter');
    }

    const total = countResult.data[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    console.log(`✅ ${result.data.length} av ${total} produkter hentet fra blomster_import`);

    res.json({
      success: true,
      products: result.data,
      count: result.data.length,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get blomster_import error:', error);
    res.status(500).json({
      success: false,
      message: 'Kunne ikke hente importerte produkter',
      error: error.message
    });
  }
});

// HENT ETT IMPORTERT PRODUKT
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    if (!productId || isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Ugyldig produkt ID'
      });
    }

    const result = await query(
      'SELECT * FROM dbo.blomster_import WHERE id = @productId',
      { productId }
    );

    if (!result.success || result.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produkt ikke funnet'
      });
    }

    res.json({
      success: true,
      product: result.data[0]
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Kunne ikke hente produkt',
      error: error.message
    });
  }
});

// TØM ALLE PRODUKTER (CLEAR ALL)
router.post('/clear', authenticateToken, async (req, res) => {
  try {
    const { clearAll } = req.body;

    // Bestem hvilke produkter som skal slettes
    let deleteQuery = 'DELETE FROM dbo.blomster_import';
    let countQuery = 'SELECT COUNT(*) as total FROM dbo.blomster_import';
    const params = {};
    
    // BRUKERBASERT SLETTING
    if (req.user.role !== 'admin') {
      // Non-admin: Kun egne produkter (alltid)
      deleteQuery += ' WHERE imported_by_username = @username';
      countQuery += ' WHERE imported_by_username = @username';
      params.username = req.user.username;
      console.log('👤 Non-admin sletter egne produkter:', req.user.username);
    } else if (clearAll) {
      // Admin: Slett alle produkter fra alle brukere
      console.log('👤 Admin sletter ALLE produkter (alle brukere)');
    } else {
      // Admin: Slett kun egne produkter
      deleteQuery += ' WHERE imported_by_username = @username';
      countQuery += ' WHERE imported_by_username = @username';
      params.username = req.user.username;
      console.log('👤 Admin sletter egne produkter:', req.user.username);
    }

    // Tell antall produkter før sletting
    const countResult = await query(countQuery, params);
    const totalCount = countResult.data[0]?.total || 0;

    if (totalCount === 0) {
      return res.json({
        success: true,
        message: 'Ingen produkter å slette',
        deletedCount: 0
      });
    }

    // Slett produkter
    const deleteResult = await query(deleteQuery, params);

    if (!deleteResult.success) {
      throw new Error('Kunne ikke slette produkter');
    }

    const message = clearAll && req.user.role === 'admin'
      ? `ALLE ${totalCount} produkter slettet fra alle brukere`
      : `${totalCount} av dine produkter slettet`;

    console.log(`🗑️ ${message} av ${req.user.username}`);

    res.json({
      success: true,
      message: message,
      deletedCount: totalCount
    });

  } catch (error) {
    console.error('Clear products error:', error);
    res.status(500).json({
      success: false,
      message: 'Kunne ikke tømme produkter',
      error: error.message
    });
  }
});

// SLETT ETT PRODUKT
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    if (!productId || isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Ugyldig produkt ID'
      });
    }

    // Sjekk at produkt eksisterer og hent eierinfo
    const existingResult = await query(
      'SELECT Description, EAN, imported_by_username FROM dbo.blomster_import WHERE id = @productId',
      { productId }
    );

    if (!existingResult.success || existingResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produkt ikke funnet'
      });
    }

    const product = existingResult.data[0];

    // EIERSKAP-SJEKK: Non-admin kan kun slette egne produkter
    if (req.user.role !== 'admin') {
      if (product.imported_by_username !== req.user.username) {
        return res.status(403).json({
          success: false,
          message: 'Du kan kun slette dine egne produkter'
        });
      }
    }

    // Slett produkt
    const deleteResult = await query(
      'DELETE FROM dbo.blomster_import WHERE id = @productId',
      { productId }
    );

    if (!deleteResult.success) {
      throw new Error('Kunne ikke slette produkt');
    }

    console.log(`❌ Produkt slettet fra blomster_import: ${product.Description || product.EAN} (ID: ${productId}) av ${req.user.username}`);

    res.json({
      success: true,
      message: `Produkt slettet`
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Kunne ikke slette produkt',
      error: error.message
    });
  }
});

// SLETT FLERE PRODUKTER (batch delete)
router.post('/batch-delete', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs må være en ikke-tom array'
      });
    }

    if (ids.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maksimalt 100 produkter kan slettes om gangen'
      });
    }

    // Bygg IN-clause
    const idList = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    
    if (idList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Ingen gyldige IDs funnet'
      });
    }

    const placeholders = idList.map((_, i) => `@id${i}`).join(',');
    const params = {};
    idList.forEach((id, i) => {
      params[`id${i}`] = id;
    });

    // EIERSKAP-SJEKK for non-admin
    let deleteQuery = `DELETE FROM dbo.blomster_import WHERE id IN (${placeholders})`;
    
    if (req.user.role !== 'admin') {
      // Non-admin: Kun slette egne produkter
      deleteQuery += ' AND imported_by_username = @username';
      params.username = req.user.username;
    }

    const deleteResult = await query(deleteQuery, params);

    if (!deleteResult.success) {
      throw new Error('Kunne ikke slette produkter');
    }

    const deletedCount = deleteResult.rowsAffected || idList.length;
    console.log(`❌ ${deletedCount} produkter slettet fra blomster_import av ${req.user.username}`);

    res.json({
      success: true,
      message: `${deletedCount} produkter slettet`,
      deletedCount: deletedCount
    });

  } catch (error) {
    console.error('Batch delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Kunne ikke slette produkter',
      error: error.message
    });
  }
});

// OPPDATER PRODUKT
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const updates = req.body;

    if (!productId || isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Ugyldig produkt ID'
      });
    }

    // Bygg update query dynamisk
    const updateFields = [];
    const params = { productId };

    const allowedFields = [
      'Invoice_Date', 'Invoice_Number', 'Currency', 'Description',
      'Pot_Size', 'Number_Of_Tray', 'Amount_per_Tray', 'Price',
      'EAN', 'Tariff_Number', 'Country_Of_Origin_Raw',
      'Weight_per_order_line', 'Gross_Weight_per_order_line',
      'import_log_id', 'import_batch_id', 'import_status'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = @${field}`);
        params[field] = updates[field];
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Ingen felter å oppdatere'
      });
    }

    // Legg til updated_at
    updateFields.push('updated_at = GETDATE()');

    const updateQuery = `
      UPDATE dbo.blomster_import 
      SET ${updateFields.join(', ')}
      WHERE id = @productId
    `;

    const updateResult = await query(updateQuery, params);

    if (!updateResult.success) {
      throw new Error('Kunne ikke oppdatere produkt');
    }

    console.log(`✅ Produkt oppdatert i blomster_import: ID ${productId} av ${req.user.username}`);

    res.json({
      success: true,
      message: 'Produkt oppdatert'
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Kunne ikke oppdatere produkt',
      error: error.message
    });
  }
});

// STATISTIKK for blomster_import
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const daysBack = parseInt(req.query.days) || 30;
    
    const statsQuery = await query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(DISTINCT import_batch_id) as unique_batches,
        COUNT(DISTINCT Tariff_Number) as unique_tariff_numbers,
        AVG(CASE WHEN Price IS NOT NULL THEN CAST(Price AS FLOAT) ELSE NULL END) as average_price,
        MIN(created_at) as first_import,
        MAX(created_at) as last_import
      FROM dbo.blomster_import
      WHERE created_at >= DATEADD(day, -@daysBack, GETDATE())
    `, { daysBack });

    // Statistikk per leverandør og kategori er fjernet siden kolonnene ikke finnes lenger

    if (!statsQuery.success) {
      throw new Error('Statistikk query feilet');
    }

    res.json({
      success: true,
      period: `Last ${daysBack} days`,
      stats: statsQuery.data[0]
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Kunne ikke hente statistikk',
      error: error.message
    });
  }
});

// HENT UNIKE VERDIER (for filtre i frontend)
router.get('/filters/unique-values', authenticateToken, async (req, res) => {
  try {
    const field = req.query.field;
    
    if (!field) {
      return res.status(400).json({
        success: false,
        message: 'field parameter er påkrevd'
      });
    }

    const allowedFields = [
      'Currency', 'Country_Of_Origin_Raw', 
      'import_batch_id', 'import_status'
    ];

    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: `Ugyldig felt. Tillatte felt: ${allowedFields.join(', ')}`
      });
    }

    const result = await query(`
      SELECT DISTINCT ${field} as value
      FROM dbo.blomster_import
      WHERE ${field} IS NOT NULL
      ORDER BY ${field}
    `);

    if (!result.success) {
      throw new Error('Kunne ikke hente unike verdier');
    }

    res.json({
      success: true,
      field: field,
      values: result.data.map(row => row.value)
    });

  } catch (error) {
    console.error('Get unique values error:', error);
    res.status(500).json({
      success: false,
      message: 'Kunne ikke hente unike verdier',
      error: error.message
    });
  }
});

module.exports = router;