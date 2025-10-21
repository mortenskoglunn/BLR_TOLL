const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database'); // BRUKER DIN DATABASE CONFIG
const ExcelJS = require('exceljs');

// Søk i frihandel
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const {
      text,
      land,
      landskode,
      valuta,
      valutakode,
      frihandel,
      tilhorighet,
      t1,
      t2,
      mrntype
    } = req.query;

    let sqlQuery = 'SELECT * FROM Frihandel WHERE 1=1';

    // Fritekst søk
    if (text) {
      sqlQuery += ` AND (
        Land LIKE '%${text}%' OR 
        Landskode LIKE '%${text}%' OR 
        Valuta LIKE '%${text}%' OR
        Valutakode LIKE '%${text}%' OR
        Frihandel LIKE '%${text}%' OR
        Tilhorighet LIKE '%${text}%'
      )`;
    }

    // Spesifikke felt søk
    if (land) {
      sqlQuery += ` AND Land LIKE '%${land}%'`;
    }

    if (landskode) {
      sqlQuery += ` AND Landskode LIKE '%${landskode}%'`;
    }

    if (valuta) {
      sqlQuery += ` AND Valuta LIKE '%${valuta}%'`;
    }

    if (valutakode) {
      sqlQuery += ` AND Valutakode LIKE '%${valutakode}%'`;
    }

    if (frihandel) {
      sqlQuery += ` AND Frihandel LIKE '%${frihandel}%'`;
    }

    if (tilhorighet) {
      sqlQuery += ` AND Tilhorighet LIKE '%${tilhorighet}%'`;
    }

    if (t1) {
      sqlQuery += ` AND T1 = '${t1}'`;
    }

    if (t2) {
      sqlQuery += ` AND T2 = '${t2}'`;
    }

    if (mrntype) {
      sqlQuery += ` AND MRNtype = '${mrntype}'`;
    }

    sqlQuery += ' ORDER BY Landskode ASC';

    const result = await query(sqlQuery);
    
    if (result.success) {
      res.json(result.data);
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Søkefeil:', error);
    res.status(500).json({ error: 'Feil ved søk i frihandel' });
  }
});

// Hent ett land
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM Frihandel WHERE ID = @id', { id });
    
    if (result.success) {
      if (result.data.length === 0) {
        return res.status(404).json({ error: 'Land ikke funnet' });
      }
      res.json(result.data[0]);
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Feil ved henting av land:', error);
    res.status(500).json({ error: 'Feil ved henting av land' });
  }
});

// Opprett nytt land
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      Landskode,
      Land,
      Valuta,
      Valutakode,
      Frihandel,
      T1,
      T2,
      MRNtype,
      Merkand,
      Tilhorighet
    } = req.body;

    // Validering
    if (!Landskode) {
      return res.status(400).json({ error: 'Landskode er påkrevd' });
    }

    if (!Land) {
      return res.status(400).json({ error: 'Land er påkrevd' });
    }

    const sqlQuery = `
      INSERT INTO Frihandel (
        Landskode, Land, Valuta, Valutakode, Frihandel,
        T1, T2, MRNtype, Merkand, Tilhorighet, ImportertDato
      )
      VALUES (
        '${Landskode.replace(/'/g, "''")}',
        '${Land.replace(/'/g, "''")}',
        ${Valuta ? `'${Valuta.replace(/'/g, "''")}'` : 'NULL'},
        ${Valutakode ? `'${Valutakode.replace(/'/g, "''")}'` : 'NULL'},
        ${Frihandel ? `'${Frihandel.replace(/'/g, "''")}'` : 'NULL'},
        ${T1 ? `'${T1.replace(/'/g, "''")}'` : 'NULL'},
        ${T2 ? `'${T2.replace(/'/g, "''")}'` : 'NULL'},
        ${MRNtype ? `'${MRNtype.replace(/'/g, "''")}'` : 'NULL'},
        ${Merkand ? `'${Merkand.replace(/'/g, "''")}'` : 'NULL'},
        ${Tilhorighet ? `'${Tilhorighet.replace(/'/g, "''")}'` : 'NULL'},
        GETDATE()
      );
      SELECT * FROM Frihandel WHERE ID = SCOPE_IDENTITY();
    `;

    const result = await query(sqlQuery);
    
    if (result.success) {
      res.status(201).json(result.data[0]);
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Feil ved opprettelse av land:', error);
    res.status(500).json({ error: 'Feil ved opprettelse av land' });
  }
});

// Oppdater land
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      Landskode,
      Land,
      Valuta,
      Valutakode,
      Frihandel,
      T1,
      T2,
      MRNtype,
      Merkand,
      Tilhorighet
    } = req.body;

    // Validering
    if (!Landskode) {
      return res.status(400).json({ error: 'Landskode er påkrevd' });
    }

    if (!Land) {
      return res.status(400).json({ error: 'Land er påkrevd' });
    }

    const sqlQuery = `
      UPDATE Frihandel
      SET 
        Landskode = '${Landskode.replace(/'/g, "''")}',
        Land = '${Land.replace(/'/g, "''")}',
        Valuta = ${Valuta ? `'${Valuta.replace(/'/g, "''")}'` : 'NULL'},
        Valutakode = ${Valutakode ? `'${Valutakode.replace(/'/g, "''")}'` : 'NULL'},
        Frihandel = ${Frihandel ? `'${Frihandel.replace(/'/g, "''")}'` : 'NULL'},
        T1 = ${T1 ? `'${T1.replace(/'/g, "''")}'` : 'NULL'},
        T2 = ${T2 ? `'${T2.replace(/'/g, "''")}'` : 'NULL'},
        MRNtype = ${MRNtype ? `'${MRNtype.replace(/'/g, "''")}'` : 'NULL'},
        Merkand = ${Merkand ? `'${Merkand.replace(/'/g, "''")}'` : 'NULL'},
        Tilhorighet = ${Tilhorighet ? `'${Tilhorighet.replace(/'/g, "''")}'` : 'NULL'}
      WHERE ID = ${id};
      SELECT * FROM Frihandel WHERE ID = ${id};
    `;

    const result = await query(sqlQuery);
    
    if (result.success) {
      if (result.data.length === 0) {
        return res.status(404).json({ error: 'Land ikke funnet' });
      }
      res.json(result.data[0]);
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Feil ved oppdatering av land:', error);
    res.status(500).json({ error: 'Feil ved oppdatering av land' });
  }
});

// Slett land
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const sqlQuery = `DELETE FROM Frihandel WHERE ID = ${id}`;
    const result = await query(sqlQuery);

    if (result.success) {
      res.json({ message: 'Land slettet', id });
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Feil ved sletting av land:', error);
    res.status(500).json({ error: 'Feil ved sletting av land' });
  }
});

// Eksporter frihandel til Excel
router.post('/export', authenticateToken, async (req, res) => {
  try {
    const { frihandel } = req.body;

    if (!frihandel || frihandel.length === 0) {
      return res.status(400).json({ error: 'Ingen land å eksportere' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Frihandel');

    // Definer kolonner basert på faktiske felt i Frihandel-tabellen
    worksheet.columns = [
      { header: 'ID', key: 'ID', width: 10 },
      { header: 'Landskode', key: 'Landskode', width: 12 },
      { header: 'Land', key: 'Land', width: 35 },
      { header: 'Valuta', key: 'Valuta', width: 25 },
      { header: 'Valutakode', key: 'Valutakode', width: 12 },
      { header: 'Frihandelsavtale', key: 'Frihandel', width: 20 },
      { header: 'T1', key: 'T1', width: 8 },
      { header: 'T2', key: 'T2', width: 8 },
      { header: 'MRN Type', key: 'MRNtype', width: 10 },
      { header: 'Merknad', key: 'Merkand', width: 30 },
      { header: 'Tilhørighet', key: 'Tilhorighet', width: 15 },
      { header: 'Importert Dato', key: 'ImportertDato', width: 20 }
    ];

    // Legg til data
    frihandel.forEach(item => {
      worksheet.addRow({
        ...item,
        ImportertDato: item.ImportertDato ? new Date(item.ImportertDato).toLocaleString('no-NO') : ''
      });
    });

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Fargekoding for T1 og T2 kolonner
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Skip header
        // T1 kolonne (G)
        const t1Cell = row.getCell(7);
        if (t1Cell.value === 'J') {
          t1Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } }; // Grønn
        } else if (t1Cell.value === 'P') {
          t1Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFA500' } }; // Oransje
        } else if (t1Cell.value === 'G') {
          t1Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF87CEEB' } }; // Blå
        }

        // T2 kolonne (H)
        const t2Cell = row.getCell(8);
        if (t2Cell.value === 'J') {
          t2Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } }; // Grønn
        } else if (t2Cell.value === 'B') {
          t2Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } }; // Rød
        }
      }
    });

    // Generer buffer
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=frihandel_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        COUNT(*) as total_countries,
        COUNT(DISTINCT Valutakode) as unique_currencies,
        COUNT(DISTINCT Frihandel) as unique_agreements,
        COUNT(DISTINCT Tilhorighet) as unique_affiliations,
        COUNT(CASE WHEN Tilhorighet = 'EU' THEN 1 END) as eu_countries,
        COUNT(CASE WHEN Tilhorighet = 'FHA' THEN 1 END) as fha_countries,
        COUNT(CASE WHEN T1 = 'J' THEN 1 END) as t1_j_count,
        COUNT(CASE WHEN T2 = 'J' THEN 1 END) as t2_j_count,
        COUNT(CASE WHEN MRNtype = 'T1' THEN 1 END) as mrn_t1_count,
        COUNT(CASE WHEN MRNtype = 'T2' THEN 1 END) as mrn_t2_count
      FROM Frihandel
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
    const valutaResult = await query('SELECT DISTINCT Valutakode FROM Frihandel WHERE Valutakode IS NOT NULL ORDER BY Valutakode');
    const frihandelResult = await query('SELECT DISTINCT Frihandel FROM Frihandel WHERE Frihandel IS NOT NULL ORDER BY Frihandel');
    const tilhorighetResult = await query('SELECT DISTINCT Tilhorighet FROM Frihandel WHERE Tilhorighet IS NOT NULL ORDER BY Tilhorighet');
    const t1Result = await query('SELECT DISTINCT T1 FROM Frihandel WHERE T1 IS NOT NULL ORDER BY T1');
    const t2Result = await query('SELECT DISTINCT T2 FROM Frihandel WHERE T2 IS NOT NULL ORDER BY T2');
    const mrntypeResult = await query('SELECT DISTINCT MRNtype FROM Frihandel WHERE MRNtype IS NOT NULL ORDER BY MRNtype');

    if (valutaResult.success && frihandelResult.success && tilhorighetResult.success && 
        t1Result.success && t2Result.success && mrntypeResult.success) {
      res.json({
        currencies: valutaResult.data.map(r => r.Valutakode),
        agreements: frihandelResult.data.map(r => r.Frihandel),
        affiliations: tilhorighetResult.data.map(r => r.Tilhorighet),
        t1_statuses: t1Result.data.map(r => r.T1),
        t2_statuses: t2Result.data.map(r => r.T2),
        mrn_types: mrntypeResult.data.map(r => r.MRNtype)
      });
    } else {
      throw new Error('Feil ved henting av filterverdier');
    }

  } catch (error) {
    console.error('Feil ved henting av filterverdier:', error);
    res.status(500).json({ error: 'Feil ved henting av filterverdier' });
  }
});

// Søk land basert på landskode (for hurtigoppslag)
router.get('/lookup/:landskode', authenticateToken, async (req, res) => {
  try {
    const { landskode } = req.params;

    const result = await query('SELECT * FROM Frihandel WHERE Landskode = @landskode', { landskode });
    
    if (result.success) {
      if (result.data.length === 0) {
        return res.status(404).json({ error: 'Land ikke funnet' });
      }
      res.json(result.data[0]);
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Feil ved oppslag av land:', error);
    res.status(500).json({ error: 'Feil ved oppslag av land' });
  }
});

module.exports = router;