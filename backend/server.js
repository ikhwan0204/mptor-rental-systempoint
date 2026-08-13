require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const motorcycleRoutes = require('./routes/motorcycles');
const rentalRoutes = require('./routes/rentals');
const pointsRoutes = require('./routes/points');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/motorcycles', motorcycleRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/points', pointsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Motor rental backend running on http://localhost:${PORT}`));
