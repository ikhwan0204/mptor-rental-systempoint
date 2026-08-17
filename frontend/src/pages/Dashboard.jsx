import { useEffect, useState } from 'react';
import { api } from '../api';
import AvailabilityView from '../components/AvailabilityView';

function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultStart() {
  return toLocalInputValue(new Date());
}
function defaultEnd() {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  return toLocalInputValue(d);
}

export default function Dashboard() {
  const [motorcycles, setMotorcycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [bookingId, setBookingId] = useState(null);
  const [forms, setForms] = useState({});
  const [openAvailabilityId, setOpenAvailabilityId] = useState(null);

  function getForm(id) {
    return forms[id] || { rentNow: true, start: defaultStart(), end: defaultEnd() };
  }
  function setForm(id, patch) {
    setForms((f) => ({ ...f, [id]: { ...getForm(id), ...patch } }));
  }

  async function load() {
    setLoading(true);
    try {
      const data = await api.getMotorcycles();
      setMotorcycles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  async function handleBook(m) {
    const form = getForm(m.id);
    setBookingId(m.id);
    setMessage('');
    setError('');
    try {
      const startAt = form.rentNow ? new Date() : new Date(form.start);
      const endAt = new Date(form.end);
      if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
        throw new Error('Sila pilih masa mula & masa habis yang sah');
      }
      if (endAt <= startAt) {
        throw new Error('Masa habis kena lepas masa mula');
      }

      await api.createRental({
        motorcycle_id: m.id,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
      });
      setMessage(
        `Tempahan ${m.model} dihantar — status: MENUNGGU KELULUSAN admin. ` +
        `Harga akan dimaklumkan lepas admin approve. Tengok "My Rentals" atau loceng 🔔 untuk notification.`
      );
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBookingId(null);
    }
  }

  if (loading) return <p className="center-text">Loading motorcycles...</p>;

  return (
    <div className="page">
      <h1>Available Motorcycles</h1>
      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}
      <div className="grid">
        {motorcycles.map((m) => {
          const form = getForm(m.id);
          const canBook = m.status === 'available';
          return (
            <div key={m.id} className="card moto-card">
              <div className="moto-icon">🏍️</div>
              <h3>{m.model}</h3>
              <p className="muted">{m.plate_number}</p>
              <p className="price">RM{m.rate_per_hour.toFixed(2)} / hour</p>
              <span className={`status status-${m.status}`}>
                {m.status === 'rented' ? 'Sedang disewa sekarang' : m.status}
              </span>

              <button
                className="btn-ghost schedule-btn"
                onClick={() => setOpenAvailabilityId(openAvailabilityId === m.id ? null : m.id)}
              >
                {openAvailabilityId === m.id ? 'Sembunyi Jadual' : '📅 Lihat Jadual 7 Hari'}
              </button>

              {canBook && (
                <div className="booking-form">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.rentNow}
                      onChange={(e) => setForm(m.id, { rentNow: e.target.checked })}
                    />
                    Sewa sekarang (mula serta-merta)
                  </label>

                  {!form.rentNow && (
                    <div className="field-row">
                      <label className="field-label">Mula</label>
                      <input
                        type="datetime-local"
                        value={form.start}
                        onChange={(e) => setForm(m.id, { start: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="field-row">
                    <label className="field-label">Habis</label>
                    <input
                      type="datetime-local"
                      value={form.end}
                      onChange={(e) => setForm(m.id, { end: e.target.value })}
                    />
                  </div>

                  <button
                    className="btn-primary"
                    onClick={() => handleBook(m)}
                    disabled={bookingId === m.id}
                  >
                    {bookingId === m.id ? 'Menghantar...' : 'Hantar Tempahan'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {motorcycles.length === 0 && <p>No motorcycles available yet.</p>}
      </div>

      {openAvailabilityId && (
        <AvailabilityView
          motorcycleId={openAvailabilityId}
          onClose={() => setOpenAvailabilityId(null)}
        />
      )}
    </div>
  );
}
