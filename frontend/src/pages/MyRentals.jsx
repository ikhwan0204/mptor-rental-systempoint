import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatCountdown(ms) {
  if (ms <= 0) return 'Tamat masa';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const STATUS_LABEL = {
  pending: 'Menunggu Kelulusan',
  approved: 'Diluluskan',
  rejected: 'Ditolak',
  returned: 'Selesai',
  cancelled: 'Dibatalkan',
};

export default function MyRentals() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const { updatePoints } = useAuth();
  const now = useNow();
  const prevStatuses = useRef({});
  const [toast, setToast] = useState('');

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await api.myRentals();

      // detect status changes since last poll -> show toast
      const changed = data.find((r) => {
        const prev = prevStatuses.current[r.id];
        return prev && prev !== r.status && (r.status === 'approved' || r.status === 'rejected');
      });
      if (changed) {
        setToast(
          changed.status === 'approved'
            ? `✅ Tempahan ${changed.model} anda telah DILULUSKAN!`
            : `❌ Tempahan ${changed.model} anda DITOLAK.`
        );
        setTimeout(() => setToast(''), 6000);
      }
      const map = {};
      data.forEach((r) => (map[r.id] = r.status));
      prevStatuses.current = map;

      setRentals(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 8000); // poll for admin decisions
    return () => clearInterval(interval);
  }, []);

  async function handleReturn(rental) {
    setBusyId(rental.id);
    setError('');
    try {
      await api.returnRental(rental.id);
      const points = await api.myPoints();
      updatePoints(points.balance);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleExtend(rental) {
    setBusyId(rental.id);
    setError('');
    try {
      await api.extendRental(rental.id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="center-text">Loading your rentals...</p>;

  return (
    <div className="page">
      <h1>My Rentals</h1>
      {toast && <div className="success-box toast">{toast}</div>}
      {error && <div className="error-box">{error}</div>}
      <div className="list">
        {rentals.map((r) => {
          const start = new Date(r.start_at).getTime();
          const end = new Date(r.end_at).getTime();
          const started = now >= start;
          const remaining = end - now;

          return (
            <div key={r.id} className="card rental-row">
              <div>
                <h3>{r.model} <span className="muted">({r.plate_number})</span></h3>

                {r.status === 'pending' && (
                  <>
                    <p className="muted">{r.duration_minutes} minit</p>
                    <p className="muted price-pending">💰 Harga akan dimaklumkan lepas admin approve</p>
                    <p className="muted">Dijadualkan: {new Date(r.start_at).toLocaleString('ms-MY')} - {new Date(r.end_at).toLocaleString('ms-MY')}</p>
                  </>
                )}

                {r.status !== 'pending' && (
                  <>
                    <p className="muted">
                      {r.duration_minutes} minit · RM{r.total_price.toFixed(2)}
                    </p>
                    <p className="muted">
                      {started ? 'Bermula: ' : 'Dijadualkan: '}
                      {new Date(r.start_at).toLocaleString('ms-MY')}
                    </p>
                  </>
                )}

                {r.status === 'approved' && started && remaining > 0 && (
                  <p className="countdown">⏳ Baki masa: {formatCountdown(remaining)}</p>
                )}
                {r.status === 'approved' && !started && (
                  <p className="muted">Menunggu masa tempahan bermula...</p>
                )}
                {r.status === 'returned' && (
                  <p className="points-earned">+{r.points_earned} points earned 🎉</p>
                )}
              </div>
              <div>
                <span className={`status status-${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span>
                {r.status === 'approved' && (
                  <>
                    <button className="btn-ghost" onClick={() => handleExtend(r)} disabled={busyId === r.id}>
                      +30 minit
                    </button>
                    <button className="btn-primary" onClick={() => handleReturn(r)} disabled={busyId === r.id}>
                      {busyId === r.id ? '...' : 'Return Motorcycle'}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {rentals.length === 0 && <p>You haven't booked any motorcycles yet.</p>}
      </div>
    </div>
  );
}
