const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'motor_rental.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  student_id TEXT,
  role TEXT NOT NULL DEFAULT 'student', -- student | admin
  points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS motorcycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model TEXT NOT NULL,
  plate_number TEXT UNIQUE NOT NULL,
  rate_per_hour REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- available | rented | maintenance
  image_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rentals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  motorcycle_id INTEGER NOT NULL REFERENCES motorcycles(id),
  hours_booked REAL NOT NULL,
  total_price REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active | returned | cancelled
  points_earned INTEGER DEFAULT 0,
  started_at TEXT DEFAULT (datetime('now')),
  due_at TEXT,
  returned_at TEXT
);

CREATE TABLE IF NOT EXISTS points_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  rental_id INTEGER REFERENCES rentals(id),
  points_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  points_cost INTEGER NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS redemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  reward_id INTEGER NOT NULL REFERENCES rewards(id),
  code TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// Seed default rewards if empty
const rewardCount = db.prepare('SELECT COUNT(*) as c FROM rewards').get().c;
if (rewardCount === 0) {
  const insert = db.prepare('INSERT INTO rewards (name, points_cost, description) VALUES (?, ?, ?)');
  insert.run('RM5 Rental Voucher', 100, 'RM5 off your next rental');
  insert.run('RM12 Rental Voucher', 250, 'RM12 off your next rental');
  insert.run('1 Free Rental Hour', 400, 'One free hour added to any rental');
}

module.exports = db;
