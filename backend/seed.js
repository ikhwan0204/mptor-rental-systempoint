const bcrypt = require('bcryptjs');
const db = require('./db');

// Create default admin if not exists
const adminEmail = 'admin@university.edu';
const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!existingAdmin) {
  const hashed = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
    .run('Admin', adminEmail, hashed, 'admin');
  console.log(`Admin created -> email: ${adminEmail}, password: admin123`);
} else {
  console.log('Admin already exists.');
}

// Sample motorcycles
const count = db.prepare('SELECT COUNT(*) as c FROM motorcycles').get().c;
if (count === 0) {
  const insert = db.prepare('INSERT INTO motorcycles (model, plate_number, rate_per_hour) VALUES (?, ?, ?)');
  insert.run('Yamaha Y15ZR', 'PJU 1234', 5);
  insert.run('Honda EX5', 'PJU 5678', 3.5);
  insert.run('Modenas Kriss', 'PJU 9012', 3);
  console.log('Sample motorcycles added.');
} else {
  console.log('Motorcycles already exist.');
}

console.log('Seeding complete.');
