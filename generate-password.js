const bcrypt = require('bcryptjs');

// Passord du vil lage hash for
const password = 'Admin123!';

// Generer hash med samme salt rounds som systemet bruker (12)
bcrypt.hash(password, 12, (err, hash) => {
  if (err) {
    console.error('❌ Feil ved generering av hash:', err);
    return;
  }
  
  console.log('');
  console.log('========================================');
  console.log('PASSWORD HASH GENERERT');
  console.log('========================================');
  console.log('Passord:', password);
  console.log('');
  console.log('Hash:');
  console.log(hash);
  console.log('');
  console.log('========================================');
  console.log('SQL KOMMANDO:');
  console.log('========================================');
  console.log('');
  console.log(`USE BLR_TOLL_DB;`);
  console.log(`UPDATE dbo.users`);
  console.log(`SET password_hash = '${hash}'`);
  console.log(`WHERE username = 'admin';`);
  console.log('');
  console.log('========================================');
  console.log('');
  
  // Test hashen umiddelbart
  bcrypt.compare(password, hash, (err, result) => {
    if (err) {
      console.error('❌ Feil ved testing:', err);
      return;
    }
    if (result) {
      console.log('✅ Hash verifisert - fungerer korrekt!');
    } else {
      console.log('❌ Hash-verifisering feilet!');
    }
    console.log('');
  });
});

// Generer også noen alternative passord
const alternativePasswords = ['admin123', 'Admin2024!', 'password'];

console.log('Genererer alternative passord-hasher...\n');

alternativePasswords.forEach((pwd, index) => {
  setTimeout(() => {
    bcrypt.hash(pwd, 12, (err, hash) => {
      if (!err) {
        console.log(`\nAlternativ ${index + 1}: "${pwd}"`);
        console.log(`Hash: ${hash}`);
      }
    });
  }, (index + 1) * 100);
});