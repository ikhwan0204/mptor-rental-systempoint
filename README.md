# 🏍️ Motor Rental System — Universiti Loyalty Points

Sistem sewa motosikal untuk universiti, lengkap dengan sistem **loyalty points**:
setiap kali pelajar sewa & pulangkan motor, mereka dapat point yang boleh ditukar
dengan reward (baucar diskaun, jam percuma, dll).

## Ciri-ciri

- **Auth**: Register & login (pelajar / admin), guna JWT
- **Booking sistem**: Pelajar pilih **masa mula & masa habis** terus (atau "Sewa Sekarang" untuk mula serta-merta) — sistem auto kira harga ikut kadar sejam (rate) motor tu
  - Contoh (motor RM5/jam): 2ptg-5ptg (3 jam) = RM15, 5ptg-6:30ptg (1.5 jam) = RM7, 8mlm-10:30mlm (2.5 jam) = RM12
  - Harga di**bulatkan ke bawah** ke Ringgit terdekat
  - Extend +30 minit — harga dikira semula ikut rate motor
  - **Harga tak ditunjukkan** kat pelajar semasa status Pending — baru nampak lepas admin approve
- **Approval flow**: Tempahan masuk status **Pending** → admin approve/reject → user dapat notification
- **Slot blocking**: Bila satu slot dah ada pending/approved booking, orang lain **tak boleh** book waktu yang sama untuk motor tu
- **Live countdown**: Bila rental approved & dah sampai waktu mula, ada timer baki masa real-time
- **Notification bell**: Navbar ada loceng notification (auto poll setiap 10 saat) — bagitau user bila tempahan diluluskan/ditolak
- **Points**: Auto dapat point bila pulangkan motor
  - 1 point per RM1 dibelanja
  - +5 point bonus kalau pulangkan on-time
- **Rewards**: Tukar point dengan baucar / jam percuma, dapat kod redemption
- **Leaderboard**: Papan pendahulu top point earners (gamification)
- **Admin panel**: Tab "Pending Bookings" untuk approve/reject, urus senarai motosikal (tambah/padam/maintenance), tengok semua rekod sewaan
- **Profile**: Pelajar/admin boleh update nama, student ID, dan tukar password sendiri
- **Jadual 7 Hari**: Setiap motosikal ada butang "Lihat Jadual 7 Hari" — timeline visual tunjuk slot mana available, mana dah ditempah (pending/approved), senang nak plan bila nak sewa

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
2. Kat halaman utama, pilih motosikal, tick **"Sewa sekarang"** atau pilih tarikh/masa lain, pilih tempoh, klik **Sewa Sekarang / Tempah**
3. Tempahan akan **Pending** — tunggu admin approve (loceng 🔔 kat navbar akan bagitau bila status berubah)
4. Login sebagai **admin**, pergi tab **Pending Bookings**, klik **Approve** atau **Reject**
5. Balik login pelajar, pergi **My Rentals** — kalau approved & dah sampai waktu, ada countdown timer baki masa. Boleh **Extend +30min (RM2)** atau **Return Motorcycle** bila settle — point terus masuk
6. Tengok **Points & Rewards** untuk balance, history, leaderboard & tukar reward
7. Klik **👤 Profile** untuk update nama/student ID atau tukar password
8. Kat halaman utama, klik **📅 Lihat Jadual 7 Hari** pada mana-mana motor untuk tengok timeline — hijau = available, kuning = menunggu approval, merah = dah ditempah (approved)

## Logik Harga (boleh ubah)

Dalam `backend/utils/pricing.js`:

```js
function calculatePrice(ratePerHour, durationMinutes) {
  const hours = durationMinutes / 60;
  return Math.floor(ratePerHour * hours); // bulat ke bawah ke RM terdekat
}
```

Rate `ratePerHour` diambil dari kadar setiap motosikal (admin boleh ubah dalam tab Motorcycles).

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