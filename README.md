# 🏍️ Motor Rental System — Universiti Loyalty Points

Sistem sewa motosikal untuk universiti, lengkap dengan sistem **loyalty points**:
setiap kali pelajar sewa & pulangkan motor, mereka dapat point yang boleh ditukar
dengan reward (baucar diskaun, jam percuma, dll).

## Ciri-ciri

- **Auth**: Register & login (pelajar / admin), guna JWT
- **Sewa motor**: Pelajar boleh sewa motosikal yang available, ikut jam
- **Points**: Auto dapat point bila pulangkan motor
  - 1 point per RM1 dibelanja
  - +5 point bonus kalau pulangkan on-time
- **Rewards**: Tukar point dengan baucar / jam percuma, dapat kod redemption
- **Leaderboard**: Papan pendahulu top point earners (gamification)
- **Admin panel**: Urus senarai motosikal (tambah/padam/maintenance), tengok semua rekod sewaan

## Struktur Projek

```
motor-rental-system/
├── backend/     ← Node.js + Express + SQLite (API)
└── frontend/    ← React (Vite) — web app
```

## Cara Setup & Jalankan

### 1. Backend

```bash
cd backend
npm install
npm run seed    # buat admin account + sample motorcycles
npm start        # jalan di http://localhost:4000
```

Akaun admin default lepas seed:
- **Email**: `admin@university.edu`
- **Password**: `admin123`

Boleh tukar port / JWT secret dalam fail `.env` (salin dari `.env.example` kalau nak).

### 2. Frontend

Buka terminal baru:

```bash
cd frontend
npm install
npm run dev       # jalan di http://localhost:5173
```

Buka browser ke `http://localhost:5173`. Frontend automatik connect ke backend
kat `http://localhost:4000/api` (boleh ubah dalam fail `.env` — salin dari `.env.example`).

## Cara Guna

1. **Daftar** akaun pelajar baru (atau login guna admin demo di atas)
2. Kat halaman utama, pilih motosikal, set berapa jam, klik **Rent Now**
3. Pergi **My Rentals**, klik **Return Motorcycle** bila dah settle — point terus masuk
4. Tengok **Points & Rewards** untuk balance, history, leaderboard & tukar reward
5. Login sebagai **admin** untuk tambah/urus motosikal & tengok semua rekod sewaan

## Logik Point (boleh ubah)

Dalam `backend/routes/rentals.js`:

```js
const POINTS_PER_RM = 1;     // 1 point setiap RM1 dibelanja
const ON_TIME_BONUS = 5;     // bonus kalau pulangkan sebelum/tepat masa due
```

## Nak Deploy / Sambung ke GitHub

```bash
cd motor-rental-system
git init
git add .
git commit -m "Initial commit: motor rental system with loyalty points"
git remote add origin <your-github-repo-url>
git push -u origin main
```

`.gitignore` dah disediakan untuk `node_modules`, database file, dan `.env`.

## Nota Teknikal

- Database guna **SQLite** (fail `motor_rental.db`, auto-generate) — tak perlu setup server DB berasingan, sesuai untuk projek kecil/tugasan
- Kalau nak scale lagi besar (ramai concurrent user), boleh tukar ke PostgreSQL/MySQL — struktur schema dalam `db.js` senang je nak port
- Password di-hash guna bcrypt, auth guna JWT (7 hari expiry)

## Idea Extend (kalau nak tambah untuk projek/assignment)

- Notification (email/SMS) bila rental due soon
- QR code check-in/check-out motor
- Payment gateway integration (bukan just simulate harga)
- Rating/review motosikal lepas return
- Analytics dashboard admin (revenue, motor paling popular, dll)
