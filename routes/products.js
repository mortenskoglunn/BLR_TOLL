const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// HENT ALLE PRODUKTER
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📦 Henter produkter...');
    
    const result = await query(`
      SELECT 
        id,
        product_code,
        product_name,
        supplier_name,
        supplier_part_number,
        price,
        currency,
        quantity,
        unit,
        category,
        subcategory,
        description,
        specifications,
        manufacturer,
        weight,
        dimensions,
        hs_code,
        country_of_origin,
        warranty_period,
        delivery_time,
        minimum_order_quantity,
        notes,
        import_log_id,
        created_at,
        updated_at
      FROM dbo.products
      ORDER BY created_at DESC
    `);

    if (!result.success) {
      throw new Error('Kunne ikke hente produkter');
    }

    console.log(`✅ ${result.data.length} produkter hentet`);

    res.json({
      success: true,
      products: result.data,
      count: result.data.length
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Kunne ikke hente produkter',
      error: error.message
    });
  }
});

// HENT ETT PRODUKT
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
      'SELECT * FROM dbo.products WHERE id = @productId',
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

// SLETT PRODUKT
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    if (!productId || isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Ugyldig produkt ID'
      });
    }

    // Sjekk at produkt eksisterer
    const existingResult = await query(
      'SELECT product_code, product_name FROM dbo.products WHERE id = @productId',
      { productId }
    );

    if (!existingResult.success || existingResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produkt ikke funnet'
      });
    }

    const product = existingResult.data[0];

    // Slett produkt
    const deleteResult = await query(
      'DELETE FROM dbo.products WHERE id = @productId',
      { productId }
    );

    if (!deleteResult.success) {
      throw new Error('Kunne ikke slette produkt');
    }

    console.log(`❌ Produkt slettet: ${product.product_code} av ${req.user.username}`);

    res.json({
      success: true,
      message: `Produkt "${product.product_name}" er slettet`
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
      'product_code', 'product_name', 'supplier_name', 'supplier_part_number',
      'price', 'currency', 'quantity', 'unit', 'category', 'subcategory',
      'description', 'specifications', 'manufacturer', 'weight', 'dimensions',
      'hs_code', 'country_of_origin', 'warranty_period', 'delivery_time',
      'minimum_order_quantity', 'notes'
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
      UPDATE dbo.products 
      SET ${updateFields.join(', ')}
      WHERE id = @productId
    `;

    const updateResult = await query(updateQuery, params);

    if (!updateResult.success) {
      throw new Error('Kunne ikke oppdatere produkt');
    }

    console.log(`✅ Produkt oppdatert: ID ${productId} av ${req.user.username}`);

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

// SØK I PRODUKTER
router.get('/search/:query', authenticateToken, async (req, res) => {
  try {
    const searchQuery = req.params.query;

    const result = await query(`
      SELECT * FROM dbo.products
      WHERE 
        product_code LIKE @search
        OR product_name LIKE @search
        OR supplier_name LIKE @search
        OR category LIKE @search
        OR hs_code LIKE @search
      ORDER BY created_at DESC
    `, {
      search: `%${searchQuery}%`
    });

    if (!result.success) {
      throw new Error('Søk feilet');
    }

    res.json({
      success: true,
      products: result.data,
      count: result.data.length
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Søk feilet',
      error: error.message
    });
  }
});

module.exports = router;