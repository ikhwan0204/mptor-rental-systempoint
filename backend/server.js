require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const motorcycleRoutes = require('./routes/motorcycles');
const rentalRoutes = require('./routes/rentals');
const pointsRoutes = require('./routes/points');
const notificationRoutes = require('./routes/notifications');

const app = express();

app.set('trust proxy', 1); // Railway (dan kebanyakan host) letak app di belakang proxy

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

const { generalLimiter } = require('./middleware/rateLimit');

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(generalLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/motorcycles', motorcycleRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => console.log(`Motor rental backend running on http://localhost:${PORT}`));

// Graceful shutdown — pastikan koneksi database ditutup betul-betul sebelum
// proses exit, elak native crash dari better-sqlite3 semasa container restart.
const db = require('./db');
function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
