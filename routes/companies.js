const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database'); // BRUKER DIN DATABASE CONFIG
const ExcelJS = require('exceljs');

// Søk i firma
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const {
      text,
      firmanavn,
      kundenummer,
      adresse,
      poststed,
      postkode,
      land,
      autno,
      kode
    } = req.query;

    let sqlQuery = 'SELECT * FROM Firma WHERE 1=1';
    const params = [];

    // Fritekst søk
    if (text) {
      sqlQuery += ` AND (
        Firmanavn LIKE '%${text}%' OR 
        Adresse LIKE '%${text}%' OR 
        Poststed LIKE '%${text}%' OR
        Land LIKE '%${text}%' OR
        AutNo LIKE '%${text}%' OR
        CAST(Kundenummer AS VARCHAR) LIKE '%${text}%'
      )`;
    }

    // Spesifikke felt søk
    if (firmanavn) {
      sqlQuery += ` AND Firmanavn LIKE '%${firmanavn}%'`;
    }

    if (kundenummer) {
      sqlQuery += ` AND CAST(Kundenummer AS VARCHAR) LIKE '%${kundenummer}%'`;
    }

    if (adresse) {
      sqlQuery += ` AND Adresse LIKE '%${adresse}%'`;
    }

    if (poststed) {
      sqlQuery += ` AND Poststed LIKE '%${poststed}%'`;
    }

    if (postkode) {
      sqlQuery += ` AND Postkode LIKE '%${postkode}%'`;
    }

    if (land) {
      sqlQuery += ` AND Land LIKE '%${land}%'`;
    }

    if (autno) {
      sqlQuery += ` AND AutNo LIKE '%${autno}%'`;
    }

    if (kode) {
      sqlQuery += ` AND Kode LIKE '%${kode}%'`;
    }

    sqlQuery += ' ORDER BY Firmanavn ASC';

    const result = await query(sqlQuery);
    
    if (result.success) {
      res.json(result.data);
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Søkefeil:', error);
    res.status(500).json({ error: 'Feil ved søk i firma' });
  }
});

// Hent ett firma
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM Firma WHERE ID = @id', { id });
    
    if (result.success) {
      if (result.data.length === 0) {
        return res.status(404).json({ error: 'Firma ikke funnet' });
      }
      res.json(result.data[0]);
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Feil ved henting av firma:', error);
    res.status(500).json({ error: 'Feil ved henting av firma' });
  }
});

// Opprett nytt firma
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      Linjenr,
      Firmanavn,
      Adresse,
      Postkode,
      Poststed,
      Land,
      AutNo,
      Priskode,
      Kundenummer,
      Valutakode,
      Merknad,
      Incoterm,
      Incosted,
      Kode
    } = req.body;

    // Validering
    if (!Firmanavn) {
      return res.status(400).json({ error: 'Firmanavn er påkrevd' });
    }

    const sqlQuery = `
      INSERT INTO Firma (
        Linjenr, Firmanavn, Adresse, Postkode, Poststed, Land,
        AutNo, Priskode, Kundenummer, Valutakode, Merknad,
        Incoterm, Incosted, Kode, ImportertDato
      )
      VALUES (
        ${Linjenr || 'NULL'}, 
        '${Firmanavn.replace(/'/g, "''")}',
        ${Adresse ? `'${Adresse.replace(/'/g, "''")}'` : 'NULL'},
        ${Postkode ? `'${Postkode.replace(/'/g, "''")}'` : 'NULL'},
        ${Poststed ? `'${Poststed.replace(/'/g, "''")}'` : 'NULL'},
        ${Land ? `'${Land.replace(/'/g, "''")}'` : 'NULL'},
        ${AutNo ? `'${AutNo.replace(/'/g, "''")}'` : 'NULL'},
        ${Priskode || 'NULL'},
        ${Kundenummer || 'NULL'},
        ${Valutakode ? `'${Valutakode.replace(/'/g, "''")}'` : 'NULL'},
        ${Merknad ? `'${Merknad.replace(/'/g, "''")}'` : 'NULL'},
        ${Incoterm ? `'${Incoterm.replace(/'/g, "''")}'` : 'NULL'},
        ${Incosted ? `'${Incosted.replace(/'/g, "''")}'` : 'NULL'},
        ${Kode ? `'${Kode.replace(/'/g, "''")}'` : 'NULL'},
        GETDATE()
      );
      SELECT * FROM Firma WHERE ID = SCOPE_IDENTITY();
    `;

    const result = await query(sqlQuery);
    
    if (result.success) {
      res.status(201).json(result.data[0]);
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Feil ved opprettelse av firma:', error);
    res.status(500).json({ error: 'Feil ved opprettelse av firma' });
  }
});

// Oppdater firma
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      Linjenr,
      Firmanavn,
      Adresse,
      Postkode,
      Poststed,
      Land,
      AutNo,
      Priskode,
      Kundenummer,
      Valutakode,
      Merknad,
      Incoterm,
      Incosted,
      Kode
    } = req.body;

    // Validering
    if (!Firmanavn) {
      return res.status(400).json({ error: 'Firmanavn er påkrevd' });
    }

    const sqlQuery = `
      UPDATE Firma
      SET 
        Linjenr = ${Linjenr || 'NULL'},
        Firmanavn = '${Firmanavn.replace(/'/g, "''")}',
        Adresse = ${Adresse ? `'${Adresse.replace(/'/g, "''")}'` : 'NULL'},
        Postkode = ${Postkode ? `'${Postkode.replace(/'/g, "''")}'` : 'NULL'},
        Poststed = ${Poststed ? `'${Poststed.replace(/'/g, "''")}'` : 'NULL'},
        Land = ${Land ? `'${Land.replace(/'/g, "''")}'` : 'NULL'},
        AutNo = ${AutNo ? `'${AutNo.replace(/'/g, "''")}'` : 'NULL'},
        Priskode = ${Priskode || 'NULL'},
        Kundenummer = ${Kundenummer || 'NULL'},
        Valutakode = ${Valutakode ? `'${Valutakode.replace(/'/g, "''")}'` : 'NULL'},
        Merknad = ${Merknad ? `'${Merknad.replace(/'/g, "''")}'` : 'NULL'},
        Incoterm = ${Incoterm ? `'${Incoterm.replace(/'/g, "''")}'` : 'NULL'},
        Incosted = ${Incosted ? `'${Incosted.replace(/'/g, "''")}'` : 'NULL'},
        Kode = ${Kode ? `'${Kode.replace(/'/g, "''")}'` : 'NULL'}
      WHERE ID = ${id};
      SELECT * FROM Firma WHERE ID = ${id};
    `;

    const result = await query(sqlQuery);
    
    if (result.success) {
      if (result.data.length === 0) {
        return res.status(404).json({ error: 'Firma ikke funnet' });
      }
      res.json(result.data[0]);
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Feil ved oppdatering av firma:', error);
    res.status(500).json({ error: 'Feil ved oppdatering av firma' });
  }
});

// Slett firma
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const sqlQuery = `DELETE FROM Firma WHERE ID = ${id}`;
    const result = await query(sqlQuery);

    if (result.success) {
      res.json({ message: 'Firma slettet', id });
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Feil ved sletting av firma:', error);
    res.status(500).json({ error: 'Feil ved sletting av firma' });
  }
});

// Eksporter firma til Excel
router.post('/export', authenticateToken, async (req, res) => {
  try {
    const { companies } = req.body;

    if (!companies || companies.length === 0) {
      return res.status(400).json({ error: 'Ingen firma å eksportere' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Firma');

    // Definer kolonner basert på faktiske felt i Firma-tabellen
    worksheet.columns = [
      { header: 'ID', key: 'ID', width: 10 },
      { header: 'Linjenr', key: 'Linjenr', width: 10 },
      { header: 'Firmanavn', key: 'Firmanavn', width: 35 },
      { header: 'Adresse', key: 'Adresse', width: 30 },
      { header: 'Postkode', key: 'Postkode', width: 12 },
      { header: 'Poststed', key: 'Poststed', width: 25 },
      { header: 'Land', key: 'Land', width: 12 },
      { header: 'AutNo', key: 'AutNo', width: 25 },
      { header: 'Priskode', key: 'Priskode', width: 12 },
      { header: 'Kundenummer', key: 'Kundenummer', width: 15 },
      { header: 'Valutakode', key: 'Valutakode', width: 12 },
      { header: 'Merknad', key: 'Merknad', width: 30 },
      { header: 'Incoterm', key: 'Incoterm', width: 12 },
      { header: 'Incosted', key: 'Incosted', width: 20 },
      { header: 'Kode', key: 'Kode', width: 10 },
      { header: 'ImportertDato', key: 'ImportertDato', width: 20 }
    ];

    // Legg til data
    companies.forEach(company => {
      worksheet.addRow({
        ...company,
        ImportertDato: company.ImportertDato ? new Date(company.ImportertDato).toLocaleString('no-NO') : ''
      });
    });

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Generer buffer
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=firma_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);

  } catch (error) {
    console.error('Eksportfeil:', error);
    res.status(500).json({ error: 'Feil ved eksport til Excel' });
  }
});

// Hent statistikk
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total_companies,
        COUNT(DISTINCT Land) as unique_countries,
        COUNT(DISTINCT Poststed) as unique_cities,
        COUNT(DISTINCT Valutakode) as unique_currencies,
        COUNT(CASE WHEN Kode = 'EU' THEN 1 END) as eu_companies,
        COUNT(CASE WHEN Kode = 'NO' THEN 1 END) as no_companies
      FROM Firma
    `);

    if (result.success) {
      res.json(result.data[0]);
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Feil ved henting av statistikk:', error);
    res.status(500).json({ error: 'Feil ved henting av statistikk' });
  }
});

// Hent unike verdier for filtre
router.get('/filters/unique-values', authenticateToken, async (req, res) => {
  try {
    const countriesResult = await query('SELECT DISTINCT Land FROM Firma WHERE Land IS NOT NULL ORDER BY Land');
    const citiesResult = await query('SELECT DISTINCT Poststed FROM Firma WHERE Poststed IS NOT NULL ORDER BY Poststed');
    const codesResult = await query('SELECT DISTINCT Kode FROM Firma WHERE Kode IS NOT NULL ORDER BY Kode');
    const currenciesResult = await query('SELECT DISTINCT Valutakode FROM Firma WHERE Valutakode IS NOT NULL ORDER BY Valutakode');

    if (countriesResult.success && citiesResult.success && codesResult.success && currenciesResult.success) {
      res.json({
        countries: countriesResult.data.map(r => r.Land),
        cities: citiesResult.data.map(r => r.Poststed),
        codes: codesResult.data.map(r => r.Kode),
        currencies: currenciesResult.data.map(r => r.Valutakode)
      });
    } else {
      throw new Error('Feil ved henting av filterverdier');
    }

  } catch (error) {
    console.error('Feil ved henting av filterverdier:', error);
    res.status(500).json({ error: 'Feil ved henting av filterverdier' });
  }
});

module.exports = router;