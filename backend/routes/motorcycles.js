const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Compute live status: maintenance stays as-is; otherwise check if an approved
// booking currently covers "now" -> rented; else available.
function withLiveStatus(motorcycle) {
  if (motorcycle.status === 'maintenance') return motorcycle;
  const nowIso = new Date().toISOString();
  const activeNow = db.prepare(`
    SELECT id FROM rentals
    WHERE motorcycle_id = ? AND status = 'approved' AND start_at <= ? AND ? < end_at
  `).get(motorcycle.id, nowIso, nowIso);
  return { ...motorcycle, status: activeNow ? 'rented' : 'available' };
}

router.get('/', requireAuth, (req, res) => {
  const motorcycles = db.prepare('SELECT * FROM motorcycles ORDER BY id DESC').all();
  res.json(motorcycles.map(withLiveStatus));
});

// Weekly schedule for one motorcycle - shows booked slots for the next 7 days
// so students can see at a glance which times are free. No personal info of
// other students is exposed, just the time ranges that are taken.
router.get('/:id/availability', requireAuth, (req, res) => {
  const motorcycle = db.prepare('SELECT * FROM motorcycles WHERE id = ?').get(req.params.id);
  if (!motorcycle) return res.status(404).json({ error: 'Motorcycle not found' });

  const now = new Date();
  const until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const bookings = db.prepare(`
    SELECT start_at, end_at, status FROM rentals
    WHERE motorcycle_id = ? AND status IN ('pending', 'approved') AND end_at >= ? AND start_at <= ?
    ORDER BY start_at ASC
  `).all(req.params.id, now.toISOString(), until.toISOString());

  res.json({ motorcycle: withLiveStatus(motorcycle), bookings, rangeStart: now.toISOString(), rangeEnd: until.toISOString() });
});

router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { model, plate_number, rate_per_hour, image_url } = req.body;
  if (!model || !plate_number || !rate_per_hour) {
    return res.status(400).json({ error: 'model, plate_number and rate_per_hour are required' });
  }
  const info = db
    .prepare('INSERT INTO motorcycles (model, plate_number, rate_per_hour, image_url) VALUES (?, ?, ?, ?)')
    .run(model, plate_number, rate_per_hour, image_url || null);
  res.status(201).json(db.prepare('SELECT * FROM motorcycles WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const { model, plate_number, rate_per_hour, status, image_url } = req.body;
  const existing = db.prepare('SELECT * FROM motorcycles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Motorcycle not found' });

  db.prepare(
    `UPDATE motorcycles SET model = ?, plate_number = ?, rate_per_hour = ?, status = ?, image_url = ? WHERE id = ?`
  ).run(
    model ?? existing.model,
    plate_number ?? existing.plate_number,
    rate_per_hour ?? existing.rate_per_hour,
    status ?? existing.status,
    image_url ?? existing.image_url,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM motorcycles WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM motorcycles WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
