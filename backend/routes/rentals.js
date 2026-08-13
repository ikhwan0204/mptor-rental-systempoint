const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { calculatePrice, EXTEND_MINUTES } = require('../utils/pricing');

const router = express.Router();

const POINTS_PER_RM = 1;
const ON_TIME_BONUS = 5;

function notify(userId, rentalId, message) {
  db.prepare('INSERT INTO notifications (user_id, rental_id, message) VALUES (?, ?, ?)').run(userId, rentalId, message);
}

function hasOverlap(motorcycleId, startAt, endAt, excludeRentalId = null) {
  const rows = db.prepare(`
    SELECT id FROM rentals
    WHERE motorcycle_id = ?
      AND status IN ('pending', 'approved')
      AND start_at < ?
      AND ? < end_at
      ${excludeRentalId ? 'AND id != ?' : ''}
  `).all(...(excludeRentalId ? [motorcycleId, endAt, startAt, excludeRentalId] : [motorcycleId, endAt, startAt]));
  return rows.length > 0;
}

// Create a booking request (pending until admin approves).
// Student picks start_at and end_at directly; price is derived from the
// motorcycle's rate_per_hour and is NOT shown to the student until approved.
router.post('/', requireAuth, (req, res) => {
  const { motorcycle_id, start_at, end_at } = req.body;
  if (!motorcycle_id || !start_at || !end_at) {
    return res.status(400).json({ error: 'motorcycle_id, start_at and end_at are required' });
  }

  const motorcycle = db.prepare('SELECT * FROM motorcycles WHERE id = ?').get(motorcycle_id);
  if (!motorcycle) return res.status(404).json({ error: 'Motorcycle not found' });
  if (motorcycle.status === 'maintenance') {
    return res.status(409).json({ error: 'Motorcycle is under maintenance' });
  }

  const start = new Date(start_at);
  const end = new Date(end_at);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid start_at or end_at datetime' });
  }
  if (end <= start) {
    return res.status(400).json({ error: 'Masa habis kena lepas masa mula' });
  }

  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

  if (hasOverlap(motorcycle_id, start.toISOString(), end.toISOString())) {
    return res.status(409).json({ error: 'Slot ni dah ditempah orang lain, sila pilih masa lain.' });
  }

  const total_price = calculatePrice(motorcycle.rate_per_hour, durationMinutes);

  const info = db.prepare(`
    INSERT INTO rentals (user_id, motorcycle_id, start_at, duration_minutes, end_at, total_price, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(req.user.id, motorcycle_id, start.toISOString(), durationMinutes, end.toISOString(), total_price);

  const rental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(info.lastInsertRowid);

  // Notify all admins of new booking request
  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
  const requester = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
  admins.forEach((a) => {
    notify(a.id, rental.id, `Tempahan baru: ${requester.name} nak sewa ${motorcycle.model} (${start.toLocaleString('ms-MY')} - ${end.toLocaleString('ms-MY')})`);
  });

  res.status(201).json(rental);
});

// Admin - approve a pending booking
router.put('/:id/approve', requireAuth, requireAdmin, (req, res) => {
  const rental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(req.params.id);
  if (!rental) return res.status(404).json({ error: 'Rental not found' });
  if (rental.status !== 'pending') return res.status(409).json({ error: 'Rental is not pending' });

  if (hasOverlap(rental.motorcycle_id, rental.start_at, rental.end_at, rental.id)) {
    return res.status(409).json({ error: 'Slot ni dah bertindih dengan tempahan lain yang diluluskan' });
  }

  db.prepare(`UPDATE rentals SET status = 'approved', decided_at = datetime('now') WHERE id = ?`).run(rental.id);

  const motorcycle = db.prepare('SELECT * FROM motorcycles WHERE id = ?').get(rental.motorcycle_id);
  notify(
    rental.user_id,
    rental.id,
    `Tempahan ${motorcycle.model} anda telah DILULUSKAN ✅ — Harga: RM${rental.total_price.toFixed(2)}`
  );

  res.json(db.prepare('SELECT * FROM rentals WHERE id = ?').get(rental.id));
});

// Admin - reject a pending booking
router.put('/:id/reject', requireAuth, requireAdmin, (req, res) => {
  const rental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(req.params.id);
  if (!rental) return res.status(404).json({ error: 'Rental not found' });
  if (rental.status !== 'pending') return res.status(409).json({ error: 'Rental is not pending' });

  db.prepare(`UPDATE rentals SET status = 'rejected', decided_at = datetime('now') WHERE id = ?`).run(rental.id);

  const motorcycle = db.prepare('SELECT * FROM motorcycles WHERE id = ?').get(rental.motorcycle_id);
  notify(rental.user_id, rental.id, `Maaf, tempahan ${motorcycle.model} anda DITOLAK ❌`);

  res.json(db.prepare('SELECT * FROM rentals WHERE id = ?').get(rental.id));
});

// Extend an approved rental by 30 minutes; price recalculated from motorcycle rate
router.put('/:id/extend', requireAuth, (req, res) => {
  const rental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(req.params.id);
  if (!rental) return res.status(404).json({ error: 'Rental not found' });
  if (rental.user_id !== req.user.id) return res.status(403).json({ error: 'Not your rental' });
  if (rental.status !== 'approved') return res.status(409).json({ error: 'Only approved rentals can be extended' });

  const motorcycle = db.prepare('SELECT * FROM motorcycles WHERE id = ?').get(rental.motorcycle_id);
  const newEnd = new Date(new Date(rental.end_at).getTime() + EXTEND_MINUTES * 60000);

  if (hasOverlap(rental.motorcycle_id, rental.end_at, newEnd.toISOString(), rental.id)) {
    return res.status(409).json({ error: 'Tak boleh extend, ada tempahan lain lepas ni.' });
  }

  const newDuration = rental.duration_minutes + EXTEND_MINUTES;
  const newPrice = calculatePrice(motorcycle.rate_per_hour, newDuration);

  db.prepare(`
    UPDATE rentals SET duration_minutes = ?, end_at = ?, total_price = ? WHERE id = ?
  `).run(newDuration, newEnd.toISOString(), newPrice, rental.id);

  res.json(db.prepare('SELECT * FROM rentals WHERE id = ?').get(rental.id));
});

// Return a rental -> award points
router.put('/:id/return', requireAuth, (req, res) => {
  const rental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(req.params.id);
  if (!rental) return res.status(404).json({ error: 'Rental not found' });
  if (rental.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not your rental' });
  }
  if (rental.status !== 'approved') {
    return res.status(409).json({ error: 'Only approved rentals can be returned' });
  }

  const now = new Date();
  const due = new Date(rental.end_at);
  const onTime = now <= due;

  const basePoints = Math.floor(rental.total_price * POINTS_PER_RM);
  const bonus = onTime ? ON_TIME_BONUS : 0;
  const pointsEarned = basePoints + bonus;

  const tx = db.transaction(() => {
    db.prepare(`UPDATE rentals SET status = 'returned', returned_at = datetime('now'), points_earned = ? WHERE id = ?`)
      .run(pointsEarned, rental.id);

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

// Current user's rentals/bookings
router.get('/mine', requireAuth, (req, res) => {
  const rentals = db.prepare(`
    SELECT r.*, m.model, m.plate_number
    FROM rentals r JOIN motorcycles m ON m.id = r.motorcycle_id
    WHERE r.user_id = ?
    ORDER BY r.id DESC
  `).all(req.user.id);
  res.json(rentals);
});

// Admin - all rentals/bookings
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
