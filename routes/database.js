const express = require('express');
const { query, executeStoredProcedure } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Søk etter blomst i database
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { blomst } = req.query;

    if (!blomst) {
      return res.status(400).json({ 
        error: 'Manglende parameter',
        message: 'blomst parameter er påkrevd' 
      });
    }

    console.log(`🔍 Søker etter blomst: "${blomst}" av bruker: ${req.user.username}`);

    // Prøv først stored procedure hvis den eksisterer
    let searchResult = await executeStoredProcedure('dbo.SearchBlomster', { SearchTerm: blomst });
    
    // Hvis stored procedure ikke fungerer, bruk vanlig SQL
    if (!searchResult.success) {
      console.log('Stored procedure ikke tilgjengelig, bruker vanlig SQL søk...');
      
      searchResult = await query(`
        SELECT 
          id, navn, vekt, klassifisering, beskrivelse, synonymer, opprinnelse, 
          pris_per_kg, kvalitetsgrad, sesong, leverandor,
          CASE 
            WHEN navn = @blomst THEN 1
            WHEN navn LIKE @blomstStart THEN 2
            WHEN navn LIKE @blomstContains THEN 3
            WHEN synonymer LIKE @blomstContains THEN 4
            ELSE 5
          END as relevance_score
        FROM dbo.blomster 
        WHERE 
          navn LIKE @blomstContains
          OR synonymer LIKE @blomstContains
          OR beskrivelse LIKE @blomstContains
        ORDER BY relevance_score, navn
      `, {
        blomst: blomst,
        blomstStart: blomst + '%',
        blomstContains: '%' + blomst + '%'
      });
    }

    if (!searchResult.success) {
      throw new Error('Database søk feilet: ' + searchResult.error);
    }

    if (searchResult.data.length > 0) {
      const bestMatch = searchResult.data[0];
      const alternativeMatches = searchResult.data.slice(1, 5); // Top 4 alternative matches
      
      console.log(`✅ Fant ${searchResult.data.length} treff for "${blomst}"`);
      
      res.json({
        found: true,
        searchTerm: blomst,
        bestMatch: {
          id: bestMatch.id,
          navn: bestMatch.navn,
          vekt: parseFloat(bestMatch.vekt),
          klassifisering: bestMatch.klassifisering,
          beskrivelse: bestMatch.beskrivelse,
          synonymer: bestMatch.synonymer,
          opprinnelse: bestMatch.opprinnelse,
          pris_per_kg: bestMatch.pris_per_kg ? parseFloat(bestMatch.pris_per_kg) : null,
          kvalitetsgrad: bestMatch.kvalitetsgrad,
          sesong: bestMatch.sesong,
          leverandor: bestMatch.leverandor,
          relevance_score: bestMatch.relevance_score || 1
        },
        alternativeMatches: alternativeMatches.map(match => ({
          id: match.id,
          navn: match.navn,
          vekt: parseFloat(match.vekt),
          klassifisering: match.klassifisering,
          relevance_score: match.relevance_score || 5
        })),
        totalMatches: searchResult.data.length
      });
    } else {
      console.log(`❌ Ingen treff for "${blomst}"`);
      
      // Søk etter lignende blomster (fuzzy matching)
      const similarResult = await query(`
        SELECT TOP 5 navn, vekt, klassifisering 
        FROM dbo.blomster 
        WHERE navn LIKE @fuzzy
        ORDER BY LEN(navn)
      `, {
        fuzzy: '%' + blomst.substring(0, Math.max(3, blomst.length - 2)) + '%'
      });

      res.json({
        found: false,
        searchTerm: blomst,
        suggestions: similarResult.success ? similarResult.data.map(s => s.navn) : [],
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

// Batch søk for flere blomster
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
        message: 'Maksimalt 100 blomster per batch søk' 
      });
    }

    console.log(`🔍 Batch søk for ${blomster.length} blomster av bruker: ${req.user.username}`);

    const results = [];
    let foundCount = 0;

    for (const blomstNavn of blomster) {
      try {
        // Enkelt søk per blomst (kan optimaliseres senere med JOIN)
        const searchResult = await query(`
          SELECT TOP 1
            id, navn, vekt, klassifisering, beskrivelse, synonymer, 
            opprinnelse, pris_per_kg, kvalitetsgrad
          FROM dbo.blomster 
          WHERE 
            navn LIKE @blomstContains
            OR synonymer LIKE @blomstContains
          ORDER BY 
            CASE 
              WHEN navn = @blomst THEN 1
              WHEN navn LIKE @blomstStart THEN 2
              ELSE 3
            END
        `, {
          blomst: blomstNavn,
          blomstStart: blomstNavn + '%',
          blomstContains: '%' + blomstNavn + '%'
        });

        if (searchResult.success && searchResult.data.length > 0) {
          const match = searchResult.data[0];
          foundCount++;
          
          results.push({
            searchTerm: blomstNavn,
            found: true,
            id: match.id,
            navn: match.navn,
            vekt: parseFloat(match.vekt),
            klassifisering: match.klassifisering,
            beskrivelse: match.beskrivelse,
            pris_per_kg: match.pris_per_kg ? parseFloat(match.pris_per_kg) : null,
            kvalitetsgrad: match.kvalitetsgrad
          });
        } else {
          results.push({
            searchTerm: blomstNavn,
            found: false,
            message: `Ingen match funnet for "${blomstNavn}"`
          });
        }

      } catch (itemError) {
        console.error(`Feil ved søk etter "${blomstNavn}":`, itemError.message);
        results.push({
          searchTerm: blomstNavn,
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

// Legg til ny blomst (admin/user only)
router.post('/add-blomst', authenticateToken, requireRole('user'), async (req, res) => {
  try {
    const { 
      navn, vekt, klassifisering, beskrivelse, synonymer, 
      opprinnelse, sesong, pris_per_kg, leverandor, kvalitetsgrad 
    } = req.body;

    if (!navn || !vekt || !klassifisering) {
      return res.status(400).json({ 
        error: 'Manglende påkrevde felt',
        message: 'navn, vekt og klassifisering er påkrevd' 
      });
    }

    // Valider vekt
    const vektNumber = parseFloat(vekt);
    if (isNaN(vektNumber) || vektNumber <= 0) {
      return res.status(400).json({ 
        error: 'Ugyldig vekt',
        message: 'Vekt må være et positivt tall' 
      });
    }

    // Valider kvalitetsgrad hvis oppgitt
    if (kvalitetsgrad && !['A', 'B', 'C', 'D'].includes(kvalitetsgrad)) {
      return res.status(400).json({ 
        error: 'Ugyldig kvalitetsgrad',
        message: 'Kvalitetsgrad må være A, B, C eller D' 
      });
    }

    // Sjekk om blomst allerede eksisterer
    const existingResult = await query(
      'SELECT id FROM dbo.blomster WHERE navn = @navn',
      { navn: navn.trim() }
    );

    if (existingResult.success && existingResult.data.length > 0) {
      return res.status(400).json({ 
        error: 'Blomst eksisterer',
        message: `En blomst med navn "${navn}" eksisterer allerede` 
      });
    }

    // Legg til blomst
    const insertResult = await query(`
      INSERT INTO dbo.blomster (
        navn, vekt, klassifisering, beskrivelse, synonymer, 
        opprinnelse, sesong, pris_per_kg, leverandor, kvalitetsgrad, created_by
      ) 
      OUTPUT INSERTED.id
      VALUES (
        @navn, @vekt, @klassifisering, @beskrivelse, @synonymer,
        @opprinnelse, @sesong, @pris_per_kg, @leverandor, @kvalitetsgrad, @created_by
      )
    `, {
      navn: navn.trim(),
      vekt: vektNumber,
      klassifisering: klassifisering.trim(),
      beskrivelse: beskrivelse || null,
      synonymer: synonymer || null,
      opprinnelse: opprinnelse || null,
      sesong: sesong || null,
      pris_per_kg: pris_per_kg ? parseFloat(pris_per_kg) : null,
      leverandor: leverandor || null,
      kvalitetsgrad: kvalitetsgrad || 'B',
      created_by: req.user.userId
    });

    if (!insertResult.success) {
      throw new Error('Kunne ikke legge til blomst i database');
    }

    const newBlomstId = insertResult.data[0].id;

    console.log(`✅ Ny blomst lagt til: "${navn}" (ID: ${newBlomstId}) av ${req.user.username}`);

    res.json({ 
      success: true, 
      message: 'Blomst lagt til',
      blomst: {
        id: newBlomstId,
        navn: navn.trim(),
        vekt: vektNumber,
        klassifisering: klassifisering.trim(),
        kvalitetsgrad: kvalitetsgrad || 'B'
      }
    });

  } catch (error) {
    console.error('Add blomst error:', error);
    res.status(500).json({ 
      error: 'Kunne ikke legge til blomst',
      message: 'En feil oppstod under tillegging av blomst',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Hent alle blomster (med paginering)
router.get('/blomster', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = '';
    const params = { offset, limit };

    if (search) {
      whereClause = `WHERE navn LIKE @search OR synonymer LIKE @search OR klassifisering LIKE @search`;
      params.search = `%${search}%`;
    }

    // Hent total antall (for paginering)
    const countResult = await query(`
      SELECT COUNT(*) as total FROM dbo.blomster ${whereClause}
    `, params);

    // Hent blomster
    const blomsterResult = await query(`
      SELECT 
        id, navn, vekt, klassifisering, beskrivelse, synonymer,
        opprinnelse, sesong, pris_per_kg, leverandor, kvalitetsgrad,
        created_at, updated_at
      FROM dbo.blomster 
      ${whereClause}
      ORDER BY navn
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, params);

    if (!blomsterResult.success || !countResult.success) {
      throw new Error('Database query feilet');
    }

    const total = countResult.data[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      blomster: blomsterResult.data.map(blomst => ({
        ...blomst,
        vekt: parseFloat(blomst.vekt),
        pris_per_kg: blomst.pris_per_kg ? parseFloat(blomst.pris_per_kg) : null
      })),
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
    console.error('Get blomster error:', error);
    res.status(500).json({ 
      error: 'Kunne ikke hente blomster',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Statistikk for dashboard
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const statsQuery = await query(`
      SELECT 
        COUNT(*) as total_blomster,
        COUNT(DISTINCT klassifisering) as unique_classifications,
        COUNT(DISTINCT kvalitetsgrad) as unique_grades,
        AVG(CAST(vekt as FLOAT)) as average_weight,
        MIN(CAST(vekt as FLOAT)) as min_weight,
        MAX(CAST(vekt as FLOAT)) as max_weight
      FROM dbo.blomster
    `);

    const gradeStatsQuery = await query(`
      SELECT 
        kvalitetsgrad, 
        COUNT(*) as count,
        AVG(CAST(vekt as FLOAT)) as avg_weight
      FROM dbo.blomster 
      GROUP BY kvalitetsgrad
      ORDER BY kvalitetsgrad
    `);

    if (!statsQuery.success || !gradeStatsQuery.success) {
      throw new Error('Statistikk query feilet');
    }

    res.json({
      success: true,
      stats: {
        ...statsQuery.data[0],
        average_weight: parseFloat(statsQuery.data[0].average_weight?.toFixed(3) || 0),
        min_weight: parseFloat(statsQuery.data[0].min_weight || 0),
        max_weight: parseFloat(statsQuery.data[0].max_weight || 0)
      },
      gradeStats: gradeStatsQuery.data.map(item => ({
        grade: item.kvalitetsgrad,
        count: item.count,
        averageWeight: parseFloat(item.avg_weight?.toFixed(3) || 0)
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