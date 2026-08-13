import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Dashboard() {
  const [motorcycles, setMotorcycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rentingId, setRentingId] = useState(null);
  const [hours, setHours] = useState({});
  const [message, setMessage] = useState('');

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
  }, []);

  async function handleRent(m) {
    const h = Number(hours[m.id] || 1);
    setRentingId(m.id);
    setMessage('');
    try {
      const rental = await api.createRental({ motorcycle_id: m.id, hours: h });
      setMessage(`Rented ${m.model} for ${h}h — Total: RM${rental.total_price.toFixed(2)}. Check "My Rentals" to return it and earn points!`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRentingId(null);
    }
  }

  if (loading) return <p className="center-text">Loading motorcycles...</p>;

  return (
    <div className="page">
      <h1>Available Motorcycles</h1>
      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}
      <div className="grid">
        {motorcycles.map((m) => (
          <div key={m.id} className="card moto-card">
            <div className="moto-icon">🏍️</div>
            <h3>{m.model}</h3>
            <p className="muted">{m.plate_number}</p>
            <p className="price">RM{m.rate_per_hour.toFixed(2)} / hour</p>
            <span className={`status status-${m.status}`}>{m.status}</span>
            {m.status === 'available' && (
              <div className="rent-controls">
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={hours[m.id] || 1}
                  onChange={(e) => setHours({ ...hours, [m.id]: e.target.value })}
                />
                <span>hour(s)</span>
                <button
                  className="btn-primary"
                  onClick={() => handleRent(m)}
                  disabled={rentingId === m.id}
                >
                  {rentingId === m.id ? 'Renting...' : 'Rent Now'}
                </button>
              </div>
            )}
          </div>
        ))}
        {motorcycles.length === 0 && <p>No motorcycles available yet.</p>}
      </div>
    </div>
  );
}
