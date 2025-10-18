const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Innlogging
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Manglende data',
        message: 'Brukernavn og passord er påkrevd' 
      });
    }

    console.log(`🔐 Login forsøk for bruker: ${username}`);

    // Finn bruker i database
    const result = await query(
      'SELECT id, username, password_hash, role, full_name, email, active FROM dbo.users WHERE username = @username',
      { username }
    );

    if (!result.success || result.data.length === 0) {
      console.log(`❌ Bruker ikke funnet: ${username}`);
      return res.status(401).json({ 
        error: 'Ugyldig innlogging',
        message: 'Ugyldig brukernavn eller passord' 
      });
    }

    const user = result.data[0];

    if (!user.active) {
      console.log(`❌ Inaktiv bruker: ${username}`);
      return res.status(401).json({ 
        error: 'Konto deaktivert',
        message: 'Din konto har blitt deaktivert. Kontakt administrator.' 
      });
    }

    // Verifiser passord
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      console.log(`❌ Ugyldig passord for bruker: ${username}`);
      return res.status(401).json({ 
        error: 'Ugyldig innlogging',
        message: 'Ugyldig brukernavn eller passord' 
      });
    }

    // Oppdater last_login og login_count
    await query(
      'UPDATE dbo.users SET last_login = GETDATE(), login_count = login_count + 1 WHERE id = @userId',
      { userId: user.id }
    );

    // Opprett JWT token
    const tokenPayload = { 
      userId: user.id, 
      username: user.username, 
      role: user.role,
      fullName: user.full_name
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    console.log(`✅ Vellykket innlogging for bruker: ${username} (${user.role})`);

    res.json({
      success: true,
      message: 'Innlogging vellykket',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Intern serverfeil',
      message: 'En feil oppstod under innlogging. Prøv igjen senere.' 
    });
  }
});

// Verifiser token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: {
      id: req.user.userId,
      username: req.user.username,
      role: req.user.role,
      fullName: req.user.fullName
    }
  });
});

// Få brukerinformasjon
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, role, full_name, email, created_at, last_login, login_count FROM dbo.users WHERE id = @userId',
      { userId: req.user.userId }
    );

    if (!result.success || result.data.length === 0) {
      return res.status(404).json({ 
        error: 'Bruker ikke funnet' 
      });
    }

    res.json({ success: true, user: result.data[0] });

  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ 
      error: 'Intern serverfeil' 
    });
  }
});

// Opprett ny bruker (bare for admin)
router.post('/register', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { username, password, role = 'user', fullName, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Manglende data',
        message: 'Brukernavn og passord er påkrevd' 
      });
    }

    if (!['admin', 'user', 'viewer'].includes(role)) {
      return res.status(400).json({ 
        error: 'Ugyldig rolle',
        message: 'Rolle må være admin, user eller viewer' 
      });
    }

    // Sjekk om bruker allerede eksisterer
    const existingUserResult = await query(
      'SELECT id FROM dbo.users WHERE username = @username',
      { username }
    );

    if (existingUserResult.success && existingUserResult.data.length > 0) {
      return res.status(400).json({ 
        error: 'Bruker eksisterer',
        message: 'Brukernavn er allerede i bruk' 
      });
    }

    // Hash passord
    const hashedPassword = await bcrypt.hash(password, 12);

    // Legg til bruker i database
    const insertResult = await query(
      'INSERT INTO dbo.users (username, password_hash, role, full_name, email) OUTPUT INSERTED.id VALUES (@username, @passwordHash, @role, @fullName, @email)',
      { 
        username, 
        passwordHash: hashedPassword, 
        role, 
        fullName: fullName || null, 
        email: email || null 
      }
    );

    if (!insertResult.success) {
      throw new Error('Kunne ikke opprette bruker');
    }

    console.log(`✅ Ny bruker opprettet: ${username} (${role}) av ${req.user.username}`);

    res.json({ 
      success: true, 
      message: 'Bruker opprettet',
      userId: insertResult.data[0].id
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Intern serverfeil',
      message: 'En feil oppstod under opprettelse av bruker' 
    });
  }
});

// Liste alle brukere (admin only)
router.get('/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT id, username, role, full_name, email, created_at, last_login, login_count, active 
      FROM dbo.users 
      ORDER BY created_at DESC
    `);

    if (!result.success) {
      throw new Error('Kunne ikke hente brukerliste');
    }

    res.json({ success: true, users: result.data });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      error: 'Intern serverfeil' 
    });
  }
});

// Oppdater bruker (admin only)
router.put('/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { fullName, email, role, active, newPassword } = req.body;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ 
        error: 'Ugyldig bruker ID' 
      });
    }

    // Sjekk at bruker eksisterer
    const existingUserResult = await query(
      'SELECT id, username FROM dbo.users WHERE id = @userId',
      { userId }
    );

    if (!existingUserResult.success || existingUserResult.data.length === 0) {
      return res.status(404).json({ 
        error: 'Bruker ikke funnet' 
      });
    }

    const existingUser = existingUserResult.data[0];
    let updateQuery = '';
    let updateParams = { userId };

    // Bygg oppdateringsspørring dynamisk
    const updateFields = [];
    
    if (fullName !== undefined) {
      updateFields.push('full_name = @fullName');
      updateParams.fullName = fullName;
    }
    
    if (email !== undefined) {
      updateFields.push('email = @email');
      updateParams.email = email;
    }
    
    if (role !== undefined && ['admin', 'user', 'viewer'].includes(role)) {
      updateFields.push('role = @role');
      updateParams.role = role;
    }
    
    if (active !== undefined) {
      updateFields.push('active = @active');
      updateParams.active = active;
    }
    
    if (newPassword && newPassword.length >= 6) {
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      updateFields.push('password_hash = @passwordHash');
      updateParams.passwordHash = hashedPassword;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ 
        error: 'Ingen endringer spesifisert' 
      });
    }

    updateQuery = `UPDATE dbo.users SET ${updateFields.join(', ')} WHERE id = @userId`;
    
    const updateResult = await query(updateQuery, updateParams);

    if (!updateResult.success) {
      throw new Error('Kunne ikke oppdatere bruker');
    }

    console.log(`✅ Bruker oppdatert: ${existingUser.username} av ${req.user.username}`);

    res.json({ 
      success: true, 
      message: 'Bruker oppdatert' 
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      error: 'Intern serverfeil',
      message: 'En feil oppstod under oppdatering av bruker' 
    });
  }
});

// Endre eget passord
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Manglende data',
        message: 'Nåværende passord og nytt passord er påkrevd' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Svakt passord',
        message: 'Nytt passord må være minst 6 tegn langt' 
      });
    }

    // Hent nåværende passord hash
    const userResult = await query(
      'SELECT password_hash FROM dbo.users WHERE id = @userId',
      { userId: req.user.userId }
    );

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(404).json({ error: 'Bruker ikke funnet' });
    }

    // Verifiser nåværende passord
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userResult.data[0].password_hash);
    
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ 
        error: 'Ugyldig passord',
        message: 'Nåværende passord er feil' 
      });
    }

    // Hash nytt passord
    const newHashedPassword = await bcrypt.hash(newPassword, 12);

    // Oppdater passord
    const updateResult = await query(
      'UPDATE dbo.users SET password_hash = @newPasswordHash WHERE id = @userId',
      { userId: req.user.userId, newPasswordHash: newHashedPassword }
    );

    if (!updateResult.success) {
      throw new Error('Kunne ikke oppdatere passord');
    }

    console.log(`✅ Passord endret for bruker: ${req.user.username}`);

    res.json({ 
      success: true, 
      message: 'Passord oppdatert' 
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      error: 'Intern serverfeil' 
    });
  }
});

// Slett bruker (admin only)
router.delete('/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ 
        error: 'Ugyldig bruker ID' 
      });
    }

    // Sjekk at admin ikke sletter seg selv
    if (req.user.userId == userId) {
      return res.status(400).json({
        error: 'Ikke tillatt',
        message: 'Du kan ikke slette din egen konto'
      });
    }

    // Sjekk at bruker eksisterer
    const existingUserResult = await query(
      'SELECT id, username FROM dbo.users WHERE id = @userId',
      { userId }
    );

    if (!existingUserResult.success || existingUserResult.data.length === 0) {
      return res.status(404).json({ 
        error: 'Bruker ikke funnet' 
      });
    }

    const existingUser = existingUserResult.data[0];

    // Slett bruker
    const deleteResult = await query(
      'DELETE FROM dbo.users WHERE id = @userId',
      { userId }
    );

    if (!deleteResult.success) {
      throw new Error('Kunne ikke slette bruker');
    }

    console.log(`❌ Bruker slettet: ${existingUser.username} av ${req.user.username}`);

    res.json({
      success: true,
      message: `Bruker "${existingUser.username}" er slettet`
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      error: 'Intern serverfeil',
      message: 'En feil oppstod under sletting av bruker' 
    });
  }
});

// ============================================================================
// EXCEL TEMPLATES ROUTES
// ============================================================================

// HENT ALLE EXCEL MALER
router.get('/excel-templates', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, name, supplier_name, description, has_header, 
             column_mappings, active, created_at, updated_at 
      FROM dbo.excel_templates 
      ORDER BY created_at DESC
    `);

    if (!result.success) {
      throw new Error('Kunne ikke hente maler');
    }

    res.json({ success: true, templates: result.data });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ 
      error: 'Intern serverfeil',
      message: 'Kunne ikke hente maler'
    });
  }
});

// OPPRETT NY EXCEL MAL
router.post('/excel-templates', authenticateToken, async (req, res) => {
  try {
    const { name, supplier_name, description, has_header, column_mappings, active } = req.body;

    if (!name || !supplier_name) {
      return res.status(400).json({ 
        error: 'Manglende data',
        message: 'Navn og leverandør er påkrevd' 
      });
    }

    const insertResult = await query(
      `INSERT INTO dbo.excel_templates 
       (name, supplier_name, description, has_header, column_mappings, active, created_by) 
       OUTPUT INSERTED.id 
       VALUES (@name, @supplierName, @description, @hasHeader, @columnMappings, @active, @createdBy)`,
      { 
        name, 
        supplierName: supplier_name,
        description: description || null,
        hasHeader: has_header,
        columnMappings: column_mappings,
        active: active !== false,
        createdBy: req.user.userId
      }
    );

    if (!insertResult.success) {
      throw new Error('Kunne ikke opprette mal');
    }

    console.log(`✅ Excel mal opprettet: ${name} av ${req.user.username}`);

    res.json({ 
      success: true, 
      message: 'Mal opprettet',
      templateId: insertResult.data[0].id
    });

  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ 
      error: 'Intern serverfeil',
      message: 'En feil oppstod under opprettelse av mal' 
    });
  }
});

// OPPDATER EXCEL MAL
router.put('/excel-templates/:id', authenticateToken, async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const { name, supplier_name, description, has_header, column_mappings, active } = req.body;

    if (!templateId || isNaN(templateId)) {
      return res.status(400).json({ 
        error: 'Ugyldig mal ID' 
      });
    }

    const updateResult = await query(
      `UPDATE dbo.excel_templates 
       SET name = @name, supplier_name = @supplierName, description = @description, 
           has_header = @hasHeader, column_mappings = @columnMappings, 
           active = @active, updated_at = GETDATE()
       WHERE id = @templateId`,
      { 
        name, 
        supplierName: supplier_name,
        description: description || null,
        hasHeader: has_header,
        columnMappings: column_mappings,
        active,
        templateId
      }
    );

    if (!updateResult.success) {
      throw new Error('Kunne ikke oppdatere mal');
    }

    console.log(`✅ Excel mal oppdatert: ${name} av ${req.user.username}`);

    res.json({ 
      success: true, 
      message: 'Mal oppdatert' 
    });

  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ 
      error: 'Intern serverfeil',
      message: 'En feil oppstod under oppdatering av mal' 
    });
  }
});

// SLETT EXCEL MAL
router.delete('/excel-templates/:id', authenticateToken, async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);

    if (!templateId || isNaN(templateId)) {
      return res.status(400).json({ 
        error: 'Ugyldig mal ID' 
      });
    }

    // Sjekk at mal eksisterer
    const existingResult = await query(
      'SELECT name FROM dbo.excel_templates WHERE id = @templateId',
      { templateId }
    );

    if (!existingResult.success || existingResult.data.length === 0) {
      return res.status(404).json({ 
        error: 'Mal ikke funnet' 
      });
    }

    const templateName = existingResult.data[0].name;

    // Slett mal
    const deleteResult = await query(
      'DELETE FROM dbo.excel_templates WHERE id = @templateId',
      { templateId }
    );

    if (!deleteResult.success) {
      throw new Error('Kunne ikke slette mal');
    }

    console.log(`❌ Excel mal slettet: ${templateName} av ${req.user.username}`);

    res.json({
      success: true,
      message: `Mal "${templateName}" er slettet`
    });

  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ 
      error: 'Intern serverfeil',
      message: 'En feil oppstod under sletting av mal' 
    });
  }
});

module.exports = router;