const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Points rule: 1 point per RM1 spent, floored. +5 bonus points if returned on/before due time.
const POINTS_PER_RM = 1;
const ON_TIME_BONUS = 5;

// Create a rental (student rents a motorcycle)
router.post('/', requireAuth, (req, res) => {
  const { motorcycle_id, hours } = req.body;
  if (!motorcycle_id || !hours || hours <= 0) {
    return res.status(400).json({ error: 'motorcycle_id and a positive hours value are required' });
  }

  const motorcycle = db.prepare('SELECT * FROM motorcycles WHERE id = ?').get(motorcycle_id);
  if (!motorcycle) return res.status(404).json({ error: 'Motorcycle not found' });
  if (motorcycle.status !== 'available') {
    return res.status(409).json({ error: 'Motorcycle is not available right now' });
  }

  const total_price = Math.round(motorcycle.rate_per_hour * hours * 100) / 100;

  const insert = db.prepare(`
    INSERT INTO rentals (user_id, motorcycle_id, hours_booked, total_price, status, due_at)
    VALUES (?, ?, ?, ?, 'active', datetime('now', '+' || ? || ' hours'))
  `);
  const info = insert.run(req.user.id, motorcycle_id, hours, total_price, hours);

  db.prepare('UPDATE motorcycles SET status = ? WHERE id = ?').run('rented', motorcycle_id);

  const rental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(rental);
});

// Return a rental -> award points
router.put('/:id/return', requireAuth, (req, res) => {
  const rental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(req.params.id);
  if (!rental) return res.status(404).json({ error: 'Rental not found' });
  if (rental.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not your rental' });
  }
  if (rental.status !== 'active') {
    return res.status(409).json({ error: 'Rental is not active' });
  }

  const now = new Date();
  const due = new Date(rental.due_at + 'Z');
  const onTime = now <= due;

  const basePoints = Math.floor(rental.total_price * POINTS_PER_RM);
  const bonus = onTime ? ON_TIME_BONUS : 0;
  const pointsEarned = basePoints + bonus;

  const tx = db.transaction(() => {
    db.prepare(`UPDATE rentals SET status = 'returned', returned_at = datetime('now'), points_earned = ? WHERE id = ?`)
      .run(pointsEarned, rental.id);

    db.prepare('UPDATE motorcycles SET status = ? WHERE id = ?').run('available', rental.motorcycle_id);

    db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(pointsEarned, rental.user_id);

    db.prepare(`
      INSERT INTO points_history (user_id, rental_id, points_change, reason)
      VALUES (?, ?, ?, ?)
    `).run(
      rental.user_id,
      rental.id,
      pointsEarned,
      onTime ? `Rental completed on time (+${basePoints} base, +${bonus} bonus)` : `Rental completed (+${basePoints} base)`
    );
  });
  tx();

  const updated = db.prepare('SELECT * FROM rentals WHERE id = ?').get(rental.id);
  res.json(updated);
});

// Current user's rentals
router.get('/mine', requireAuth, (req, res) => {
  const rentals = db.prepare(`
    SELECT r.*, m.model, m.plate_number
    FROM rentals r JOIN motorcycles m ON m.id = r.motorcycle_id
    WHERE r.user_id = ?
    ORDER BY r.id DESC
  `).all(req.user.id);
  res.json(rentals);
});

// Admin - all rentals
router.get('/', requireAuth, requireAdmin, (req, res) => {
  const rentals = db.prepare(`
    SELECT r.*, m.model, m.plate_number, u.name as user_name, u.email as user_email
    FROM rentals r
    JOIN motorcycles m ON m.id = r.motorcycle_id
    JOIN users u ON u.id = r.user_id
    ORDER BY r.id DESC
  `).all();
  res.json(rentals);
});

module.exports = router;
