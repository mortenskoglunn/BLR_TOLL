const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { initializeDatabase, query } = require('../config/database');

async function setupDatabase() {
  console.log('🚀 Starter database setup...');
  console.log('');
  
  try {
    // Initialize database connection (will create database if it doesn't exist)
    console.log('📊 Initialiserer database tilkobling...');
    const connected = await initializeDatabase();
    
    if (!connected) {
      console.error('❌ Kunne ikke koble til database. Sjekk konfigurasjonen i .env filen.');
      process.exit(1);
    }
    
    console.log('');
    console.log('📄 Leser SQL schema fil...');
    
    // Read the schema SQL file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📦 Kjører database schema...');
    
    // Split SQL commands by GO separator and execute each batch
    const sqlBatches = schemaSql
      .split(/\r?\nGO\r?\n/)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);
    
    console.log(`📝 Fant ${sqlBatches.length} SQL kommandoer å kjøre...`);
    console.log('');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < sqlBatches.length; i++) {
      const batch = sqlBatches[i];
      
      try {
        console.log(`⏳ Kjører kommando ${i + 1}/${sqlBatches.length}...`);
        
        // Skip USE database commands as we're already connected
        if (batch.toUpperCase().includes('USE [') || batch.toUpperCase().startsWith('USE ')) {
          console.log('   ↳ Hopper over USE kommando (allerede tilkoblet database)');
          continue;
        }
        
        const result = await query(batch);
        
        if (result.success) {
          successCount++;
          if (result.data && result.data.length > 0) {
            // Log any returned data (like statistics)
            const firstRow = result.data[0];
            if (firstRow.Status || firstRow.Message) {
              console.log('   ✅', firstRow.Status || firstRow.Message);
            }
          }
        } else {
          errorCount++;
          console.error('   ❌ Feil:', result.error);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Feil i kommando ${i + 1}:`, error.message);
      }
    }
    
    console.log('');
    console.log('📊 Database setup resultat:');
    console.log(`   ✅ Vellykkede kommandoer: ${successCount}`);
    console.log(`   ❌ Feilete kommandoer: ${errorCount}`);
    console.log(`   📦 Totalt: ${successCount + errorCount}`);
    
    if (errorCount === 0) {
      console.log('');
      console.log('🎉 Database setup fullført uten feil!');
      
      // Test the setup by querying some data
      console.log('');
      console.log('🧪 Tester database setup...');
      
      const usersResult = await query('SELECT COUNT(*) as UserCount FROM dbo.users');
      const blomsterResult = await query('SELECT COUNT(*) as BlomsterCount FROM dbo.blomster');
      
      if (usersResult.success && blomsterResult.success) {
        console.log(`   👥 Brukere opprettet: ${usersResult.data[0].UserCount}`);
        console.log(`   🌸 Blomster opprettet: ${blomsterResult.data[0].BlomsterCount}`);
        
        // Test search functionality
        try {
          const searchResult = await query("EXEC dbo.SearchBlomster @SearchTerm = 'rose'");
          if (searchResult.success && searchResult.data.length > 0) {
            console.log(`   🔍 Søk test vellykket - fant ${searchResult.data.length} treff for 'rose'`);
          }
        } catch (searchError) {
          console.log('   ⚠️  Søk test hoppet over (stored procedure ikke tilgjengelig ennå)');
        }
        
        console.log('');
        console.log('✅ Database er klar til bruk!');
        console.log('');
        console.log('🔑 Test-brukere som er opprettet:');
        console.log('   Admin: admin / admin123');
        console.log('   Bruker: bruker / bruker123');
        console.log('   Viewer: viewer / viewer123');
        console.log('');
        console.log('🌐 Start serveren med: npm run dev');
        
      } else {
        console.error('❌ Database test feilet');
        errorCount++;
      }
    }
    
    if (errorCount > 0) {
      console.log('');
      console.log('⚠️  Det var noen feil under oppsettet. Sjekk loggene over.');
      console.log('💡 Tips: Kontroller at SQL Server Express kjører og at brukeren har riktige tilganger.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ Kritisk feil under database setup:', error.message);
    console.error('');
    console.error('💡 Mulige løsninger:');
    console.error('   1. Sjekk at SQL Server Express kjører');
    console.error('   2. Kontroller brukernavn og passord i .env filen');
    console.error('   3. Sjekk at brukeren har CREATE DATABASE rettigheter');
    console.error('   4. Kontroller server navn og port i .env filen');
    console.error('   5. Prøv å bruke localhost\\SQLEXPRESS som server');
    
    process.exit(1);
  }
}

// Kjør setup hvis scriptet kalles direkte
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };