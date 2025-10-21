const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');
const ExcelJS = require('exceljs');

// Søk i HSeuno-tabellen
router.get('/search', async (req, res) => {
  try {
    const {
      text,
      norhs,
      euhs,
      chapter,
      norwdescr,
      engldescr,
      danedescr,
      gmlkortnr,
      nyttkortnr,
      kollitype,
      artdbkode,
      kommentar
    } = req.query;

    let query = 'SELECT * FROM HSeuno WHERE 1=1';
    const params = [];
    let paramCount = 1;

    // Fritekst-søk i flere felt
    if (text) {
      query += ` AND (
        NorHS LIKE @text${paramCount} OR 
        EuHS LIKE @text${paramCount} OR 
        Chapter LIKE @text${paramCount} OR 
        Norwdescr LIKE @text${paramCount} OR 
        Engldescr LIKE @text${paramCount} OR 
        Danedescr LIKE @text${paramCount} OR
        Nyttkortnr LIKE @text${paramCount} OR
        Gmlkortnr LIKE @text${paramCount} OR
        ARTDBkode LIKE @text${paramCount} OR
        Kommentar LIKE @text${paramCount}
      )`;
      params.push({ name: `text${paramCount}`, value: `%${text}%` });
      paramCount++;
    }

    // Spesifikke felt-søk
    if (norhs) {
      query += ` AND NorHS LIKE @norhs`;
      params.push({ name: 'norhs', value: `%${norhs}%` });
    }

    if (euhs) {
      query += ` AND EuHS LIKE @euhs`;
      params.push({ name: 'euhs', value: `%${euhs}%` });
    }

    if (chapter) {
      query += ` AND Chapter LIKE @chapter`;
      params.push({ name: 'chapter', value: `%${chapter}%` });
    }

    if (norwdescr) {
      query += ` AND Norwdescr LIKE @norwdescr`;
      params.push({ name: 'norwdescr', value: `%${norwdescr}%` });
    }

    if (engldescr) {
      query += ` AND Engldescr LIKE @engldescr`;
      params.push({ name: 'engldescr', value: `%${engldescr}%` });
    }

    if (danedescr) {
      query += ` AND Danedescr LIKE @danedescr`;
      params.push({ name: 'danedescr', value: `%${danedescr}%` });
    }

    if (gmlkortnr) {
      query += ` AND Gmlkortnr LIKE @gmlkortnr`;
      params.push({ name: 'gmlkortnr', value: `%${gmlkortnr}%` });
    }

    if (nyttkortnr) {
      query += ` AND Nyttkortnr LIKE @nyttkortnr`;
      params.push({ name: 'nyttkortnr', value: `%${nyttkortnr}%` });
    }

    if (kollitype) {
      query += ` AND Kollitype LIKE @kollitype`;
      params.push({ name: 'kollitype', value: `%${kollitype}%` });
    }

    if (artdbkode) {
      query += ` AND ARTDBkode LIKE @artdbkode`;
      params.push({ name: 'artdbkode', value: `%${artdbkode}%` });
    }

    if (kommentar) {
      query += ` AND Kommentar LIKE @kommentar`;
      params.push({ name: 'kommentar', value: `%${kommentar}%` });
    }

    query += ' ORDER BY NorHS, EuHS';

    const pool = await getPool();
    const request = pool.request();

    // Legg til alle parametere
    params.forEach(param => {
      request.input(param.name, param.value);
    });

    const result = await request.query(query);
    res.json(result.recordset);

  } catch (error) {
    console.error('Feil ved søk i HSeuno:', error);
    res.status(500).json({ error: error.message });
  }
});

// Hent én HS-kode
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await getPool();
    const result = await pool.request()
      .input('id', id)
      .query('SELECT * FROM HSeuno WHERE ID = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'HS-kode ikke funnet' });
    }

    res.json(result.recordset[0]);

  } catch (error) {
    console.error('Feil ved henting av HS-kode:', error);
    res.status(500).json({ error: error.message });
  }
});

// Opprett ny HS-kode
router.post('/', async (req, res) => {
  try {
    const {
      NorHS,
      EuHS,
      Chapter,
      Norwdescr,
      Danedescr,
      Engldescr,
      Gmlkortnr,
      Nyttkortnr,
      Kollitype,
      Kollimengde,
      Skrivkode,
      FRITXTKODE1,
      FRITXTDESC1,
      FRITXTKODE2,
      FRITXTDESC2,
      FRITXTKODE3,
      FRITXTDESC3,
      Rundskriv,
      Toll,
      TempNOHS,
      ARTDBkode,
      Kolonne1,
      EUToll,
      RowToll,
      GSP,
      Kommentar
    } = req.body;

    // Valider påkrevde felt
    if (!NorHS || !EuHS || !Chapter) {
      return res.status(400).json({ 
        error: 'NorHS, EuHS og Chapter er påkrevde felt' 
      });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('NorHS', NorHS)
      .input('EuHS', EuHS)
      .input('Chapter', Chapter)
      .input('Norwdescr', Norwdescr || null)
      .input('Danedescr', Danedescr || null)
      .input('Engldescr', Engldescr || null)
      .input('Gmlkortnr', Gmlkortnr || null)
      .input('Nyttkortnr', Nyttkortnr || null)
      .input('Kollitype', Kollitype || null)
      .input('Kollimengde', Kollimengde || null)
      .input('Skrivkode', Skrivkode || null)
      .input('FRITXTKODE1', FRITXTKODE1 || null)
      .input('FRITXTDESC1', FRITXTDESC1 || null)
      .input('FRITXTKODE2', FRITXTKODE2 || null)
      .input('FRITXTDESC2', FRITXTDESC2 || null)
      .input('FRITXTKODE3', FRITXTKODE3 || null)
      .input('FRITXTDESC3', FRITXTDESC3 || null)
      .input('Rundskriv', Rundskriv || null)
      .input('Toll', Toll || null)
      .input('TempNOHS', TempNOHS || null)
      .input('ARTDBkode', ARTDBkode || null)
      .input('Kolonne1', Kolonne1 || null)
      .input('EUToll', EUToll || null)
      .input('RowToll', RowToll || null)
      .input('GSP', GSP || null)
      .input('Kommentar', Kommentar || null)
      .query(`
        INSERT INTO HSeuno (
          NorHS, EuHS, Chapter, Norwdescr, Danedescr, Engldescr,
          Gmlkortnr, Nyttkortnr, Kollitype, Kollimengde, Skrivkode,
          FRITXTKODE1, FRITXTDESC1, FRITXTKODE2, FRITXTDESC2,
          FRITXTKODE3, FRITXTDESC3, Rundskriv, Toll, TempNOHS,
          ARTDBkode, Kolonne1, EUToll, RowToll, GSP, Kommentar,
          ImportertDato
        )
        VALUES (
          @NorHS, @EuHS, @Chapter, @Norwdescr, @Danedescr, @Engldescr,
          @Gmlkortnr, @Nyttkortnr, @Kollitype, @Kollimengde, @Skrivkode,
          @FRITXTKODE1, @FRITXTDESC1, @FRITXTKODE2, @FRITXTDESC2,
          @FRITXTKODE3, @FRITXTDESC3, @Rundskriv, @Toll, @TempNOHS,
          @ARTDBkode, @Kolonne1, @EUToll, @RowToll, @GSP, @Kommentar,
          GETDATE()
        );
        SELECT SCOPE_IDENTITY() AS ID;
      `);

    res.status(201).json({ 
      message: 'HS-kode opprettet',
      id: result.recordset[0].ID 
    });

  } catch (error) {
    console.error('Feil ved opprettelse av HS-kode:', error);
    res.status(500).json({ error: error.message });
  }
});

// Oppdater HS-kode
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      NorHS,
      EuHS,
      Chapter,
      Norwdescr,
      Danedescr,
      Engldescr,
      Gmlkortnr,
      Nyttkortnr,
      Kollitype,
      Kollimengde,
      Skrivkode,
      FRITXTKODE1,
      FRITXTDESC1,
      FRITXTKODE2,
      FRITXTDESC2,
      FRITXTKODE3,
      FRITXTDESC3,
      Rundskriv,
      Toll,
      TempNOHS,
      ARTDBkode,
      Kolonne1,
      EUToll,
      RowToll,
      GSP,
      Kommentar
    } = req.body;

    // Valider påkrevde felt
    if (!NorHS || !EuHS || !Chapter) {
      return res.status(400).json({ 
        error: 'NorHS, EuHS og Chapter er påkrevde felt' 
      });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('id', id)
      .input('NorHS', NorHS)
      .input('EuHS', EuHS)
      .input('Chapter', Chapter)
      .input('Norwdescr', Norwdescr || null)
      .input('Danedescr', Danedescr || null)
      .input('Engldescr', Engldescr || null)
      .input('Gmlkortnr', Gmlkortnr || null)
      .input('Nyttkortnr', Nyttkortnr || null)
      .input('Kollitype', Kollitype || null)
      .input('Kollimengde', Kollimengde || null)
      .input('Skrivkode', Skrivkode || null)
      .input('FRITXTKODE1', FRITXTKODE1 || null)
      .input('FRITXTDESC1', FRITXTDESC1 || null)
      .input('FRITXTKODE2', FRITXTKODE2 || null)
      .input('FRITXTDESC2', FRITXTDESC2 || null)
      .input('FRITXTKODE3', FRITXTKODE3 || null)
      .input('FRITXTDESC3', FRITXTDESC3 || null)
      .input('Rundskriv', Rundskriv || null)
      .input('Toll', Toll || null)
      .input('TempNOHS', TempNOHS || null)
      .input('ARTDBkode', ARTDBkode || null)
      .input('Kolonne1', Kolonne1 || null)
      .input('EUToll', EUToll || null)
      .input('RowToll', RowToll || null)
      .input('GSP', GSP || null)
      .input('Kommentar', Kommentar || null)
      .query(`
        UPDATE HSeuno SET
          NorHS = @NorHS,
          EuHS = @EuHS,
          Chapter = @Chapter,
          Norwdescr = @Norwdescr,
          Danedescr = @Danedescr,
          Engldescr = @Engldescr,
          Gmlkortnr = @Gmlkortnr,
          Nyttkortnr = @Nyttkortnr,
          Kollitype = @Kollitype,
          Kollimengde = @Kollimengde,
          Skrivkode = @Skrivkode,
          FRITXTKODE1 = @FRITXTKODE1,
          FRITXTDESC1 = @FRITXTDESC1,
          FRITXTKODE2 = @FRITXTKODE2,
          FRITXTDESC2 = @FRITXTDESC2,
          FRITXTKODE3 = @FRITXTKODE3,
          FRITXTDESC3 = @FRITXTDESC3,
          Rundskriv = @Rundskriv,
          Toll = @Toll,
          TempNOHS = @TempNOHS,
          ARTDBkode = @ARTDBkode,
          Kolonne1 = @Kolonne1,
          EUToll = @EUToll,
          RowToll = @RowToll,
          GSP = @GSP,
          Kommentar = @Kommentar
        WHERE ID = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'HS-kode ikke funnet' });
    }

    res.json({ message: 'HS-kode oppdatert' });

  } catch (error) {
    console.error('Feil ved oppdatering av HS-kode:', error);
    res.status(500).json({ error: error.message });
  }
});

// Slett HS-kode
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await getPool();
    const result = await pool.request()
      .input('id', id)
      .query('DELETE FROM HSeuno WHERE ID = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'HS-kode ikke funnet' });
    }

    res.json({ message: 'HS-kode slettet' });

  } catch (error) {
    console.error('Feil ved sletting av HS-kode:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eksporter til Excel
router.post('/export', async (req, res) => {
  try {
    const { hseuno } = req.body;

    if (!hseuno || hseuno.length === 0) {
      return res.status(400).json({ error: 'Ingen data å eksportere' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('HS-koder');

    // Definer kolonner
    worksheet.columns = [
      { header: 'ID', key: 'ID', width: 10 },
      { header: 'Norsk HS', key: 'NorHS', width: 15 },
      { header: 'EU HS', key: 'EuHS', width: 15 },
      { header: 'Kapittel', key: 'Chapter', width: 12 },
      { header: 'Norsk beskrivelse', key: 'Norwdescr', width: 30 },
      { header: 'Engelsk beskrivelse', key: 'Engldescr', width: 30 },
      { header: 'Dansk beskrivelse', key: 'Danedescr', width: 30 },
      { header: 'Gammelt kortnr', key: 'Gmlkortnr', width: 15 },
      { header: 'Nytt kortnr', key: 'Nyttkortnr', width: 15 },
      { header: 'Kollitype', key: 'Kollitype', width: 12 },
      { header: 'Kollimengde', key: 'Kollimengde', width: 12 },
      { header: 'Skrivkode', key: 'Skrivkode', width: 12 },
      { header: 'FRITXTKODE1', key: 'FRITXTKODE1', width: 15 },
      { header: 'FRITXTDESC1', key: 'FRITXTDESC1', width: 25 },
      { header: 'FRITXTKODE2', key: 'FRITXTKODE2', width: 15 },
      { header: 'FRITXTDESC2', key: 'FRITXTDESC2', width: 25 },
      { header: 'FRITXTKODE3', key: 'FRITXTKODE3', width: 15 },
      { header: 'FRITXTDESC3', key: 'FRITXTDESC3', width: 25 },
      { header: 'Rundskriv', key: 'Rundskriv', width: 15 },
      { header: 'Toll', key: 'Toll', width: 12 },
      { header: 'Temp NOHS', key: 'TempNOHS', width: 15 },
      { header: 'ARTDB kode', key: 'ARTDBkode', width: 12 },
      { header: 'Kolonne1', key: 'Kolonne1', width: 12 },
      { header: 'EU Toll', key: 'EUToll', width: 12 },
      { header: 'Row Toll', key: 'RowToll', width: 12 },
      { header: 'GSP', key: 'GSP', width: 12 },
      { header: 'Kommentar', key: 'Kommentar', width: 30 },
      { header: 'Importert dato', key: 'ImportertDato', width: 20 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Legg til data
    hseuno.forEach(item => {
      worksheet.addRow({
        ID: item.ID,
        NorHS: item.NorHS,
        EuHS: item.EuHS,
        Chapter: item.Chapter,
        Norwdescr: item.Norwdescr,
        Engldescr: item.Engldescr,
        Danedescr: item.Danedescr,
        Gmlkortnr: item.Gmlkortnr,
        Nyttkortnr: item.Nyttkortnr,
        Kollitype: item.Kollitype,
        Kollimengde: item.Kollimengde,
        Skrivkode: item.Skrivkode,
        FRITXTKODE1: item.FRITXTKODE1,
        FRITXTDESC1: item.FRITXTDESC1,
        FRITXTKODE2: item.FRITXTKODE2,
        FRITXTDESC2: item.FRITXTDESC2,
        FRITXTKODE3: item.FRITXTKODE3,
        FRITXTDESC3: item.FRITXTDESC3,
        Rundskriv: item.Rundskriv,
        Toll: item.Toll,
        TempNOHS: item.TempNOHS,
        ARTDBkode: item.ARTDBkode,
        Kolonne1: item.Kolonne1,
        EUToll: item.EUToll,
        RowToll: item.RowToll,
        GSP: item.GSP,
        Kommentar: item.Kommentar,
        ImportertDato: item.ImportertDato ? new Date(item.ImportertDato).toLocaleString('no-NO') : ''
      });
    });

    // Auto-filter på header row
    worksheet.autoFilter = {
      from: 'A1',
      to: 'AB1'
    };

    // Generer Excel-fil
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=hseuno_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Feil ved eksport av HS-koder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Statistikk
router.get('/stats/summary', async (req, res) => {
  try {
    const pool = await getPool();
    
    const totalResult = await pool.request()
      .query('SELECT COUNT(*) as total FROM HSeuno');
    
    const chaptersResult = await pool.request()
      .query('SELECT COUNT(DISTINCT Chapter) as chapters FROM HSeuno');
    
    const recentResult = await pool.request()
      .query(`
        SELECT COUNT(*) as recent 
        FROM HSeuno 
        WHERE ImportertDato >= DATEADD(day, -7, GETDATE())
      `);

    res.json({
      total: totalResult.recordset[0].total,
      chapters: chaptersResult.recordset[0].chapters,
      recent: recentResult.recordset[0].recent
    });

  } catch (error) {
    console.error('Feil ved henting av statistikk:', error);
    res.status(500).json({ error: error.message });
  }
});

// Hent unike verdier for filtre
router.get('/filters/unique-values', async (req, res) => {
  try {
    const { field } = req.query;

    if (!field) {
      return res.status(400).json({ error: 'Field parameter er påkrevd' });
    }

    const validFields = [
      'Chapter', 'Kollitype', 'Nyttkortnr', 'Gmlkortnr'
    ];

    if (!validFields.includes(field)) {
      return res.status(400).json({ error: 'Ugyldig felt' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT DISTINCT ${field} as value 
        FROM HSeuno 
        WHERE ${field} IS NOT NULL 
        ORDER BY ${field}
      `);

    res.json(result.recordset.map(r => r.value));

  } catch (error) {
    console.error('Feil ved henting av unike verdier:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;