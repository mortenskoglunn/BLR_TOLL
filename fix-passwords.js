const bcrypt = require('bcryptjs');
require('dotenv').config();

const { initializeDatabase, query } = require('./config/database');

async function fixPasswords() {
  console.log('🔧 Fikser brukerpassord...');
  
  try {
    // Initialize database
    const connected = await initializeDatabase();
    if (!connected) {
      console.error('❌ Kunne ikke koble til database');
      return;
    }

    // Liste over brukere som skal oppdateres
    const usersToFix = [
      { username: 'admin', password: 'admin123' },
      { username: 'bruker', password: 'bruker123' },
      { username: 'viewer', password: 'viewer123' }
    ];

    console.log('');
    console.log('📋 Sjekker eksisterende brukere...');
    
    // Først, sjekk hvilke brukere som eksisterer
    const existingUsersResult = await query('SELECT id, username FROM dbo.users');
    
    if (!existingUsersResult.success) {
      throw new Error('Kunne ikke hente brukere fra database');
    }

    console.log(`   ✅ Fant ${existingUsersResult.data.length} brukere i database:`);
    existingUsersResult.data.forEach(user => {
      console.log(`   - ${user.username} (ID: ${user.id})`);
    });

    console.log('');
    console.log('🔐 Oppdaterer passord...');

    for (const user of usersToFix) {
      try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(user.password, 12);
        
        // Check if user exists and update password
        const updateResult = await query(
          'UPDATE dbo.users SET password_hash = @passwordHash WHERE username = @username',
          { 
            username: user.username, 
            passwordHash: hashedPassword 
          }
        );

        if (updateResult.success && updateResult.rowsAffected > 0) {
          console.log(`   ✅ ${user.username}: Passord oppdatert`);
          
          // Test the password
          const testResult = await query(
            'SELECT password_hash FROM dbo.users WHERE username = @username',
            { username: user.username }
          );
          
          if (testResult.success && testResult.data.length > 0) {
            const isValid = await bcrypt.compare(user.password, testResult.data[0].password_hash);
            if (isValid) {
              console.log(`   🧪 ${user.username}: Passord test OK`);
            } else {
              console.log(`   ❌ ${user.username}: Passord test FEILET`);
            }
          }
        } else {
          console.log(`   ⚠️  ${user.username}: Bruker ikke funnet eller ikke oppdatert`);
        }
      } catch (error) {
        console.error(`   ❌ ${user.username}: Feil - ${error.message}`);
      }
    }

    console.log('');
    console.log('📊 Sjekker alle brukere etter oppdatering...');
    
    const finalResult = await query(`
      SELECT username, role, full_name, active, created_at, last_login 
      FROM dbo.users 
      ORDER BY username
    `);

    if (finalResult.success) {
      finalResult.data.forEach(user => {
        console.log(`   👤 ${user.username} (${user.role}) - ${user.active ? 'Aktiv' : 'Inaktiv'}`);
      });
    }

    console.log('');
    console.log('✅ Passord-oppdatering fullført!');
    console.log('');
    console.log('🧪 Test innlogging nå med:');
    console.log('curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\\"username\\":\\"admin\\",\\"password\\":\\"admin123\\"}"');

  } catch (error) {
    console.error('❌ Kritisk feil:', error.message);
  }
}

// Kjør fix hvis scriptet kalles direkte
if (require.main === module) {
  fixPasswords().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Script feil:', error);
    process.exit(1);
  });
}

module.exports = { fixPasswords };