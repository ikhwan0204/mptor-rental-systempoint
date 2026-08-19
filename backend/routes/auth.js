const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../utils/mailer');

const { authLimiter } = require('../middleware/rateLimit');
const { verifyTurnstileToken } = require('../utils/turnstile');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.use(authLimiter);

router.post('/register', async (req, res) => {
  const { name, email, password, student_id, turnstile_token } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }

  const isHuman = await verifyTurnstileToken(turnstile_token, req.ip);
  if (!isHuman) {
    return res.status(400).json({ error: 'Pengesahan "bukan robot" gagal. Sila cuba lagi.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  const hashed = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (name, email, password, student_id, role) VALUES (?, ?, ?, ?, ?)')
    .run(name, email, hashed, student_id || null, 'student');

  const user = db.prepare('SELECT id, name, email, student_id, role, points FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  delete user.password;
  res.json({ token, user });
});

// Request a password reset email
router.post('/forgot-password', async (req, res) => {
  const { email, turnstile_token } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  const isHuman = await verifyTurnstileToken(turnstile_token, req.ip);
  if (!isHuman) {
    return res.status(400).json({ error: 'Pengesahan "bukan robot" gagal. Sila cuba lagi.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  // Always respond the same way whether or not the email exists, so we don't
  // leak which emails are registered.
  const genericResponse = { message: 'Kalau email ni wujud dalam sistem, link reset password dah dihantar.' };

  if (!user) return res.json(genericResponse);

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(token, expires, user.id);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;

  // Always log the link to the server console as a dev-friendly fallback —
  // useful if outbound email is blocked (common on campus/office WiFi) or
  // Ethereal's account API is unreachable.
  console.log(`\n[Password Reset] ${user.email} -> ${resetLink}\n`);

  try {
    const { previewUrl } = await sendPasswordResetEmail(user.email, resetLink);
    res.json({ ...genericResponse, previewUrl: previewUrl || undefined });
  } catch (err) {
    console.error('Failed to send reset email (link was logged above, use it directly for testing):', err.message);
    // Don't fail the request just because email delivery failed — the token
    // is already saved, so the flow still works via the console-logged link.
    res.json(genericResponse);
  }
});

// Complete a password reset using the emailed token
router.post('/reset-password', (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) {
    return res.status(400).json({ error: 'token and new_password are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Password baru mesti sekurang-kurangnya 6 aksara' });
  }

  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
    return res.status(400).json({ error: 'Link reset password tidak sah atau dah luput. Sila minta link baru.' });
  }

  const hashed = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(hashed, user.id);

  res.json({ success: true, message: 'Password berjaya ditukar. Sila login dengan password baru.' });
});

// Sign in / sign up with Google (frontend sends the Google ID token)
router.post('/google', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ error: 'id_token is required' });
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'Google login belum dikonfigurasi kat server (GOOGLE_CLIENT_ID missing).' });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    return res.status(401).json({ error: 'Google token tidak sah' });
  }

  const { sub: googleId, email, name } = payload;

  let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);

  if (!user) {
    // No account linked to this Google ID yet — check if an account with the
    // same email already exists (e.g. they registered manually before).
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (user) {
      // Link Google to the existing account
      db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(googleId, user.id);
    } else {
      // Brand new account — password field is required by the schema, so we
      // store a random unusable hash; they can always use "Forgot Password"
      // later to set a real one if they ever want to log in without Google.
      const randomPassword = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 10);
      const info = db.prepare(`
        INSERT INTO users (name, email, password, role, google_id) VALUES (?, ?, ?, 'student', ?)
      `).run(name || email, email, randomPassword, googleId);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    }
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  delete user.password;
  res.json({ token, user });
});
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, student_id, role, points, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Update my own profile (name, student_id)
router.put('/me', requireAuth, (req, res) => {
  const { name, student_id } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  db.prepare('UPDATE users SET name = ?, student_id = ? WHERE id = ?').run(name, student_id || null, req.user.id);
  const user = db.prepare('SELECT id, name, email, student_id, role, points, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// Change my own password
router.put('/me/password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Password baru mesti sekurang-kurangnya 6 aksara' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password)) {
    return res.status(401).json({ error: 'Password semasa salah' });
  }
  const hashed = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
  res.json({ success: true });
});

module.exports = router;
