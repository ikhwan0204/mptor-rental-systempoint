import { useEffect, useState } from 'react';
import { api } from '../api';

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildDays(rangeStartIso) {
  const days = [];
  const base = startOfDay(new Date(rangeStartIso || new Date()));
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

// Compute booking segments (as % of 24h) that fall within this specific day
function segmentsForDay(bookings, day) {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;

  return bookings
    .map((b) => {
      const bStart = new Date(b.start_at).getTime();
      const bEnd = new Date(b.end_at).getTime();
      const segStart = Math.max(bStart, dayStart);
      const segEnd = Math.min(bEnd, dayEnd);
      if (segEnd <= segStart) return null;
      return {
        leftPct: ((segStart - dayStart) / (dayEnd - dayStart)) * 100,
        widthPct: ((segEnd - segStart) / (dayEnd - dayStart)) * 100,
        status: b.status,
        startLabel: new Date(bStart).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }),
        endLabel: new Date(bEnd).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }),
      };
    })
    .filter(Boolean);
}

export default function AvailabilityView({ motorcycleId, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAvailability(motorcycleId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [motorcycleId]);

  if (loading) return <div className="card avail-card"><p className="center-text">Loading jadual...</p></div>;
  if (error) return <div className="card avail-card"><div className="error-box">{error}</div></div>;

  const days = buildDays(data.rangeStart);
  const today = startOfDay(new Date()).getTime();

  return (
    <div className="card avail-card">
      <div className="avail-header">
        <h3>📅 Jadual 7 Hari — {data.motorcycle.model}</h3>
        <button className="btn-ghost" onClick={onClose}>Tutup</button>
      </div>
      <div className="avail-legend">
        <span><i className="dot dot-free"></i> Available</span>
        <span><i className="dot dot-approved"></i> Ditempah (approved)</span>
        <span><i className="dot dot-pending"></i> Menunggu approval</span>
      </div>

      <div className="avail-days">
        {days.map((day, idx) => {
          const segs = segmentsForDay(data.bookings, day);
          const isToday = startOfDay(day).getTime() === today;
          return (
            <div key={idx} className="avail-day-row">
              <div className="avail-day-label">
                {isToday ? 'Hari ini' : day.toLocaleDateString('ms-MY', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
              <div className="avail-timeline">
                {segs.map((s, i) => (
                  <div
                    key={i}
                    className={`avail-seg avail-seg-${s.status}`}
                    style={{ left: `${s.leftPct}%`, width: `${s.widthPct}%` }}
                    title={`${s.startLabel} - ${s.endLabel} (${s.status === 'approved' ? 'Ditempah' : 'Menunggu approval'})`}
                  />
                ))}
              </div>
              <div className="avail-hours-label">
                <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>12am</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
