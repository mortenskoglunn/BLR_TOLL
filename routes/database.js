const express = require('express');
const { query, executeStoredProcedure } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Søk etter produkt i database (oppdatert for products-tabellen)
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { blomst } = req.query;

    if (!blomst) {
      return res.status(400).json({ 
        error: 'Manglende parameter',
        message: 'blomst parameter er påkrevd' 
      });
    }

    console.log(`🔍 Søker etter produkt: "${blomst}" av bruker: ${req.user.username}`);

    // Søk i products-tabellen
    const searchResult = await query(`
      SELECT 
        id, Søkenavn, Art1, Art2, Art3, Tar1, Tar2, Tar3,
        Kat, EmmaNavn, Notat, [HS Toll NÅ] as HSTollNaa,
        CASE 
          WHEN Søkenavn = @search THEN 1
          WHEN Søkenavn LIKE @searchStart THEN 2
          WHEN Søkenavn LIKE @searchContains THEN 3
          WHEN Art1 LIKE @searchContains THEN 4
          WHEN Art2 LIKE @searchContains THEN 4
          WHEN Tar1 LIKE @searchContains THEN 5
          ELSE 6
        END as relevance_score
      FROM dbo.products 
      WHERE 
        Søkenavn LIKE @searchContains
        OR Art1 LIKE @searchContains
        OR Art2 LIKE @searchContains
        OR Art3 LIKE @searchContains
        OR Tar1 LIKE @searchContains
        OR Tar2 LIKE @searchContains
        OR EmmaNavn LIKE @searchContains
        OR Notat LIKE @searchContains
      ORDER BY relevance_score, Søkenavn
    `, {
      search: blomst,
      searchStart: blomst + '%',
      searchContains: '%' + blomst + '%'
    });

    if (!searchResult.success) {
      throw new Error('Database søk feilet: ' + searchResult.error);
    }

    if (searchResult.data.length > 0) {
      const bestMatch = searchResult.data[0];
      const alternativeMatches = searchResult.data.slice(1, 5);
      
      console.log(`✅ Fant ${searchResult.data.length} treff for "${blomst}"`);
      
      res.json({
        found: true,
        searchTerm: blomst,
        bestMatch: {
          id: bestMatch.id,
          søkenavn: bestMatch.Søkenavn,
          art1: bestMatch.Art1,
          art2: bestMatch.Art2,
          tar1: bestMatch.Tar1,
          kat: bestMatch.Kat,
          emmaNavn: bestMatch.EmmaNavn,
          hsTollNaa: bestMatch.HSTollNaa,
          relevance_score: bestMatch.relevance_score || 1
        },
        alternativeMatches: alternativeMatches.map(match => ({
          id: match.id,
          søkenavn: match.Søkenavn,
          art1: match.Art1,
          tar1: match.Tar1,
          relevance_score: match.relevance_score || 5
        })),
        totalMatches: searchResult.data.length
      });
    } else {
      console.log(`❌ Ingen treff for "${blomst}"`);
      
      // Søk etter lignende produkter
      const similarResult = await query(`
        SELECT TOP 5 Søkenavn, Art1, Tar1 
        FROM dbo.products 
        WHERE Søkenavn LIKE @fuzzy
        ORDER BY LEN(Søkenavn)
      `, {
        fuzzy: '%' + blomst.substring(0, Math.max(3, blomst.length - 2)) + '%'
      });

      res.json({
        found: false,
        searchTerm: blomst,
        suggestions: similarResult.success ? similarResult.data.map(s => s.Søkenavn) : [],
        message: `Ingen eksakt match for "${blomst}". Prøv med noen av forslagene eller legg til manuelt.`
      });
    }

  } catch (error) {
    console.error('Database search error:', error);
    res.status(500).json({ 
      error: 'Database søk feilet',
      message: 'En feil oppstod under søket. Prøv igjen senere.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Batch søk for flere produkter
router.post('/batch-search', authenticateToken, async (req, res) => {
  try {
    const { blomster } = req.body;

    if (!Array.isArray(blomster)) {
      return res.status(400).json({ 
        error: 'Ugyldig format',
        message: 'blomster må være en array av strenger' 
      });
    }

    if (blomster.length === 0) {
      return res.status(400).json({ 
        error: 'Tom array',
        message: 'blomster array kan ikke være tom' 
      });
    }

    if (blomster.length > 100) {
      return res.status(400).json({ 
        error: 'For mange elementer',
        message: 'Maksimalt 100 produkter per batch søk' 
      });
    }

    console.log(`🔍 Batch søk for ${blomster.length} produkter av bruker: ${req.user.username}`);

    const results = [];
    let foundCount = 0;

    for (const produktNavn of blomster) {
      try {
        const searchResult = await query(`
          SELECT TOP 1
            id, Søkenavn, Art1, Art2, Tar1, Tar2, Kat, [HS Toll NÅ] as HSTollNaa
          FROM dbo.products 
          WHERE 
            Søkenavn LIKE @searchContains
            OR Art1 LIKE @searchContains
            OR Art2 LIKE @searchContains
          ORDER BY 
            CASE 
              WHEN Søkenavn = @search THEN 1
              WHEN Søkenavn LIKE @searchStart THEN 2
              ELSE 3
            END
        `, {
          search: produktNavn,
          searchStart: produktNavn + '%',
          searchContains: '%' + produktNavn + '%'
        });

        if (searchResult.success && searchResult.data.length > 0) {
          const match = searchResult.data[0];
          foundCount++;
          
          results.push({
            searchTerm: produktNavn,
            found: true,
            id: match.id,
            søkenavn: match.Søkenavn,
            art1: match.Art1,
            tar1: match.Tar1,
            kat: match.Kat
          });
        } else {
          results.push({
            searchTerm: produktNavn,
            found: false,
            message: `Ingen match funnet for "${produktNavn}"`
          });
        }

      } catch (itemError) {
        console.error(`Feil ved søk etter "${produktNavn}":`, itemError.message);
        results.push({
          searchTerm: produktNavn,
          found: false,
          error: 'Søkefeil'
        });
      }
    }

    console.log(`✅ Batch søk fullført: ${foundCount}/${blomster.length} treff`);

    res.json({
      success: true,
      totalSearched: blomster.length,
      totalFound: foundCount,
      totalNotFound: blomster.length - foundCount,
      results: results
    });

  } catch (error) {
    console.error('Batch search error:', error);
    res.status(500).json({ 
      error: 'Batch søk feilet',
      message: 'En feil oppstod under batch søket',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Legg til nytt produkt (admin/user only)
router.post('/add-product', authenticateToken, requireRole('user'), async (req, res) => {
  try {
    const { 
      søkenavn, art1, art2, art3, tar1, tar2, tar3,
      gml1, gml2, gml3, emmaNavn, kat, notat
    } = req.body;

    if (!søkenavn) {
      return res.status(400).json({ 
        error: 'Manglende påkrevde felt',
        message: 'søkenavn er påkrevd' 
      });
    }

    // Sjekk om produkt allerede eksisterer
    const existingResult = await query(
      'SELECT id FROM dbo.products WHERE Søkenavn = @søkenavn',
      { søkenavn: søkenavn.trim() }
    );

    if (existingResult.success && existingResult.data.length > 0) {
      return res.status(400).json({ 
        error: 'Produkt eksisterer',
        message: `Et produkt med navn "${søkenavn}" eksisterer allerede` 
      });
    }

    // Legg til produkt
    const insertResult = await query(`
      INSERT INTO dbo.products (
        Søkenavn, Art1, Art2, Art3, Tar1, Tar2, Tar3,
        Gml1, Gml2, Gml3, EmmaNavn, Kat, Notat, created_at, updated_at
      ) 
      OUTPUT INSERTED.id
      VALUES (
        @søkenavn, @art1, @art2, @art3, @tar1, @tar2, @tar3,
        @gml1, @gml2, @gml3, @emmaNavn, @kat, @notat, GETDATE(), GETDATE()
      )
    `, {
      søkenavn: søkenavn.trim(),
      art1: art1 || null,
      art2: art2 || null,
      art3: art3 || null,
      tar1: tar1 || null,
      tar2: tar2 || null,
      tar3: tar3 || null,
      gml1: gml1 || null,
      gml2: gml2 || null,
      gml3: gml3 || null,
      emmaNavn: emmaNavn || null,
      kat: kat || null,
      notat: notat || null
    });

    if (!insertResult.success) {
      throw new Error('Kunne ikke legge til produkt i database');
    }

    const newProductId = insertResult.data[0].id;

    console.log(`✅ Nytt produkt lagt til: "${søkenavn}" (ID: ${newProductId}) av ${req.user.username}`);

    res.json({ 
      success: true, 
      message: 'Produkt lagt til',
      product: {
        id: newProductId,
        søkenavn: søkenavn.trim(),
        art1: art1 || null,
        tar1: tar1 || null,
        kat: kat || null
      }
    });

  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ 
      error: 'Kunne ikke legge til produkt',
      message: 'En feil oppstod under tillegging av produkt',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Hent alle produkter (med paginering)
router.get('/products', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = '';
    const params = { offset, limit };

    if (search) {
      whereClause = `WHERE Søkenavn LIKE @search OR Art1 LIKE @search OR Tar1 LIKE @search OR Kat LIKE @search`;
      params.search = `%${search}%`;
    }

    // Hent total antall
    const countResult = await query(`
      SELECT COUNT(*) as total FROM dbo.products ${whereClause}
    `, params);

    // Hent produkter
    const productsResult = await query(`
      SELECT 
        id, Søkenavn, Art1, Art2, Art3, Tar1, Tar2, Tar3,
        Gml1, Gml2, Gml3, EmmaNavn, Kat, Notat,
        [HS Toll NÅ] as HSTollNaa, Gml,
        created_at, updated_at
      FROM dbo.products 
      ${whereClause}
      ORDER BY Søkenavn
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, params);

    if (!productsResult.success || !countResult.success) {
      throw new Error('Database query feilet');
    }

    const total = countResult.data[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      products: productsResult.data,
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
    console.error('Get products error:', error);
    res.status(500).json({ 
      error: 'Kunne ikke hente produkter',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Statistikk for dashboard (oppdatert for products)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const statsQuery = await query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(DISTINCT Kat) as unique_categories,
        COUNT(DISTINCT Tar1) as unique_tariff_codes,
        COUNT(CASE WHEN Art1 IS NOT NULL THEN 1 END) as products_with_art1
      FROM dbo.products
    `);

    const categoryStatsQuery = await query(`
      SELECT 
        Kat, 
        COUNT(*) as count
      FROM dbo.products 
      WHERE Kat IS NOT NULL
      GROUP BY Kat
      ORDER BY count DESC
    `);

    if (!statsQuery.success || !categoryStatsQuery.success) {
      throw new Error('Statistikk query feilet');
    }

    res.json({
      success: true,
      stats: statsQuery.data[0],
      categoryStats: categoryStatsQuery.data.map(item => ({
        category: item.Kat,
        count: item.count
      }))
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      error: 'Kunne ikke hente statistikk',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;