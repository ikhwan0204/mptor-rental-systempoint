const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// My notifications (latest first)
router.get('/', requireAuth, (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 30
  `).all(req.user.id);
  const unreadCount = db.prepare(`
    SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0
  `).get(req.user.id).c;
  res.json({ notifications, unreadCount });
});

// Mark one as read
router.put('/:id/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// Mark all as read
router.put('/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(req.user.id);
  res.json({ success: true });
});

module.exports = router;
