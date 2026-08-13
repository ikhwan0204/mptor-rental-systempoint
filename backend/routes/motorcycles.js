const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public (logged-in) - list motorcycles
router.get('/', requireAuth, (req, res) => {
  const motorcycles = db.prepare('SELECT * FROM motorcycles ORDER BY id DESC').all();
  res.json(motorcycles);
});

// Admin - add motorcycle
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

// Admin - update motorcycle
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

// Admin - delete motorcycle
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM motorcycles WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
