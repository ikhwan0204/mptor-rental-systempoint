const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// My points balance + history
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, points FROM users WHERE id = ?').get(req.user.id);
  const history = db.prepare(`
    SELECT * FROM points_history WHERE user_id = ? ORDER BY id DESC
  `).all(req.user.id);
  res.json({ balance: user.points, history });
});

// Leaderboard - top point earners (fun/gamification)
router.get('/leaderboard', requireAuth, (req, res) => {
  const top = db.prepare(`
    SELECT name, points FROM users WHERE role = 'student' ORDER BY points DESC LIMIT 10
  `).all();
  res.json(top);
});

// Rewards catalog
router.get('/rewards', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM rewards ORDER BY points_cost ASC').all());
});

// Redeem a reward
router.post('/redeem/:rewardId', requireAuth, (req, res) => {
  const reward = db.prepare('SELECT * FROM rewards WHERE id = ?').get(req.params.rewardId);
  if (!reward) return res.status(404).json({ error: 'Reward not found' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (user.points < reward.points_cost) {
    return res.status(400).json({ error: 'Not enough points' });
  }

  const code = crypto.randomBytes(4).toString('hex').toUpperCase();

  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(reward.points_cost, user.id);
    db.prepare(`
      INSERT INTO points_history (user_id, points_change, reason) VALUES (?, ?, ?)
    `).run(user.id, -reward.points_cost, `Redeemed: ${reward.name}`);
    db.prepare(`
      INSERT INTO redemptions (user_id, reward_id, code) VALUES (?, ?, ?)
    `).run(user.id, reward.id, code);
  });
  tx();

  res.status(201).json({ code, reward: reward.name });
});

module.exports = router;
