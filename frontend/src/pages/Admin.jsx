import { useEffect, useState } from 'react';
import { api } from '../api';

const STATUS_LABEL = {
  pending: 'Menunggu Kelulusan',
  approved: 'Diluluskan',
  rejected: 'Ditolak',
  returned: 'Selesai',
  cancelled: 'Dibatalkan',
};

export default function Admin() {
  const [motorcycles, setMotorcycles] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ model: '', plate_number: '', rate_per_hour: '' });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState('pending');

  async function load() {
    try {
      const [m, r] = await Promise.all([api.getMotorcycles(), api.allRentals()]);
      setMotorcycles(m);
      setRentals(r);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.addMotorcycle({
        model: form.model,
        plate_number: form.plate_number,
        rate_per_hour: Number(form.rate_per_hour),
      });
      setForm({ model: '', plate_number: '', rate_per_hour: '' });
      setMessage('Motorcycle added.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this motorcycle?')) return;
    try {
      await api.deleteMotorcycle(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleMaintenance(m) {
    const newStatus = m.status === 'maintenance' ? 'available' : 'maintenance';
    try {
      await api.updateMotorcycle(m.id, { status: newStatus });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleApprove(r) {
    setBusyId(r.id);
    setError('');
    try {
      await api.approveRental(r.id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(r) {
    setBusyId(r.id);
    setError('');
    try {
      await api.rejectRental(r.id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const pendingRentals = rentals.filter((r) => r.status === 'pending');

  return (
    <div className="page">
      <h1>Admin Panel</h1>
      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}

      <div className="tabs">
        <button className={tab === 'pending' ? 'tab active' : 'tab'} onClick={() => setTab('pending')}>
          Pending Bookings {pendingRentals.length > 0 && `(${pendingRentals.length})`}
        </button>
        <button className={tab === 'motorcycles' ? 'tab active' : 'tab'} onClick={() => setTab('motorcycles')}>Motorcycles</button>
        <button className={tab === 'rentals' ? 'tab active' : 'tab'} onClick={() => setTab('rentals')}>All Rentals</button>
      </div>

      {tab === 'pending' && (
        <div className="list">
          {pendingRentals.map((r) => (
            <div key={r.id} className="card rental-row">
              <div>
                <h3>{r.model} <span className="muted">({r.plate_number})</span></h3>
                <p className="muted">{r.user_name} · {r.user_email}</p>
                <p className="muted">
                  {new Date(r.start_at).toLocaleString('ms-MY')} · {r.duration_minutes} minit · RM{r.total_price.toFixed(2)}
                </p>
              </div>
              <div className="admin-actions">
                <button className="btn-primary" onClick={() => handleApprove(r)} disabled={busyId === r.id}>
                  Approve
                </button>
                <button className="btn-danger" onClick={() => handleReject(r)} disabled={busyId === r.id}>
                  Reject
                </button>
              </div>
            </div>
          ))}
          {pendingRentals.length === 0 && <p>Takde tempahan menunggu kelulusan buat masa ni.</p>}
        </div>
      )}

      {tab === 'motorcycles' && (
        <>
          <form onSubmit={handleAdd} className="card inline-form">
            <input placeholder="Model (e.g. Yamaha Y15ZR)" value={form.model} onChange={(e) => update('model', e.target.value)} required />
            <input placeholder="Plate number" value={form.plate_number} onChange={(e) => update('plate_number', e.target.value)} required />
            <input placeholder="Rate/hour (RM)" type="number" step="0.5" value={form.rate_per_hour} onChange={(e) => update('rate_per_hour', e.target.value)} required />
            <button className="btn-primary" disabled={saving}>{saving ? 'Adding...' : 'Add Motorcycle'}</button>
          </form>

          <div className="list">
            {motorcycles.map((m) => (
              <div key={m.id} className="card rental-row">
                <div>
                  <h3>{m.model} <span className="muted">({m.plate_number})</span></h3>
                  <p className="muted">RM{m.rate_per_hour.toFixed(2)}/hour</p>
                </div>
                <div className="admin-actions">
                  <span className={`status status-${m.status}`}>{m.status}</span>
                  <button className="btn-ghost" onClick={() => toggleMaintenance(m)}>
                    {m.status === 'maintenance' ? 'Mark Available' : 'Mark Maintenance'}
                  </button>
                  <button className="btn-danger" onClick={() => handleDelete(m.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'rentals' && (
        <div className="list">
          {rentals.map((r) => (
            <div key={r.id} className="card rental-row">
              <div>
                <h3>{r.model} <span className="muted">({r.plate_number})</span></h3>
                <p className="muted">{r.user_name} · {r.user_email}</p>
                <p className="muted">
                  {new Date(r.start_at).toLocaleString('ms-MY')} · {r.duration_minutes} minit · RM{r.total_price.toFixed(2)}
                </p>
              </div>
              <div>
                <span className={`status status-${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span>
                {r.status === 'returned' && <p className="points-earned">+{r.points_earned} pts</p>}
              </div>
            </div>
          ))}
          {rentals.length === 0 && <p>No rentals yet.</p>}
        </div>
      )}
    </div>
  );
}
