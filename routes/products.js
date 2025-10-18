const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// HENT ALLE PRODUKTER (kun når eksplisitt forespurt, ikke for søk)
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📦 Henter alle produkter (full liste)...');
    
    // Hvis dette kalles fra søkeside, begrens resultat
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    
    let limitClause = '';
    if (limit) {
      limitClause = `TOP ${limit}`;
    }
    
    const result = await query(`
      SELECT ${limitClause}
        id,
        Søkenavn,
        Art1,
        Art2,
        Art3,
        Gml1,
        Gml2,
        Gml3,
        Tar1,
        Tar2,
        Tar3,
        EmmaNavn,
        Kat,
        Notat,
        [Ant tegn Art1,2,3] as AntTegn,
        Gml,
        [HS Toll NÅ] as HSTollNaa,
        import_log_id,
        created_at,
        updated_at
      FROM dbo.products
      ORDER BY id ASC
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

// AVANSERT SØK I PRODUKTER (NY - for ProductSearch.vue)
router.get('/search', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Søker i produkter...', req.query);
    
    const { 
      search,      // Hovedsøk (søker i flere felt)
      søkenavn,    // Spesifikt søk i Søkenavn
      art1,
      art2,
      art3,
      tar1,
      tar2,
      kat,
      emmaNavn,
      notat
    } = req.query;

    // Bygg WHERE-klausul dynamisk
    const conditions = [];
    const params = {};

    // Hovedsøk - søker i flere felt samtidig
    if (search) {
      conditions.push(`(
        Søkenavn LIKE @search 
        OR Art1 LIKE @search 
        OR Art2 LIKE @search 
        OR Art3 LIKE @search 
        OR Tar1 LIKE @search 
        OR Tar2 LIKE @search
        OR Tar3 LIKE @search
        OR EmmaNavn LIKE @search
        OR Notat LIKE @search
      )`);
      params.search = `%${search}%`;
    }

    // Spesifikke felt-søk
    if (søkenavn) {
      conditions.push('Søkenavn LIKE @søkenavn');
      params.søkenavn = `%${søkenavn}%`;
    }

    if (art1) {
      conditions.push('Art1 LIKE @art1');
      params.art1 = `%${art1}%`;
    }

    if (art2) {
      conditions.push('Art2 LIKE @art2');
      params.art2 = `%${art2}%`;
    }

    if (art3) {
      conditions.push('Art3 LIKE @art3');
      params.art3 = `%${art3}%`;
    }

    if (tar1) {
      conditions.push('Tar1 LIKE @tar1');
      params.tar1 = `%${tar1}%`;
    }

    if (tar2) {
      conditions.push('Tar2 LIKE @tar2');
      params.tar2 = `%${tar2}%`;
    }

    if (kat) {
      conditions.push('Kat = @kat');
      params.kat = kat;
    }

    if (emmaNavn) {
      conditions.push('EmmaNavn LIKE @emmaNavn');
      params.emmaNavn = `%${emmaNavn}%`;
    }

    if (notat) {
      conditions.push('Notat LIKE @notat');
      params.notat = `%${notat}%`;
    }

    // Hvis ingen søkekriterier, returner tom liste
    if (conditions.length === 0) {
      return res.json({
        success: true,
        products: [],
        count: 0,
        message: 'Vennligst angi søkekriterier'
      });
    }

    // Bygg komplett query
    const whereClause = conditions.join(' AND ');
    const searchQuery = `
      SELECT 
        id,
        Søkenavn,
        Art1,
        Art2,
        Art3,
        Gml1,
        Gml2,
        Gml3,
        Tar1,
        Tar2,
        Tar3,
        EmmaNavn,
        Kat,
        Notat,
        [Ant tegn Art1,2,3] as AntTegn,
        Gml,
        [HS Toll NÅ] as [HS Toll NÅ],
        import_log_id,
        created_at,
        updated_at
      FROM dbo.products
      WHERE ${whereClause}
      ORDER BY Søkenavn ASC
    `;

    console.log('SQL Query:', searchQuery);
    console.log('Parameters:', params);

    const result = await query(searchQuery, params);

    if (!result.success) {
      throw new Error('Søk feilet');
    }

    console.log(`✅ Søk fullført: ${result.data.length} resultater`);

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
      'SELECT Søkenavn FROM dbo.products WHERE id = @productId',
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

    console.log(`❌ Produkt slettet: ${product.Søkenavn} av ${req.user.username}`);

    res.json({
      success: true,
      message: `Produkt "${product.Søkenavn}" er slettet`
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
      'Søkenavn', 'Art1', 'Art2', 'Art3',
      'Gml1', 'Gml2', 'Gml3',
      'Tar1', 'Tar2', 'Tar3',
      'EmmaNavn', 'Kat', 'Notat'
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

module.exports = router;