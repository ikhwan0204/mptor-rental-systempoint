import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function MyRentals() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [returningId, setReturningId] = useState(null);
  const { user, updatePoints } = useAuth();

  async function load() {
    setLoading(true);
    try {
      const data = await api.myRentals();
      setRentals(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleReturn(rental) {
    setReturningId(rental.id);
    setError('');
    try {
      await api.returnRental(rental.id);
      const points = await api.myPoints();
      updatePoints(points.balance);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setReturningId(null);
    }
  }

  if (loading) return <p className="center-text">Loading your rentals...</p>;

  return (
    <div className="page">
      <h1>My Rentals</h1>
      {error && <div className="error-box">{error}</div>}
      <div className="list">
        {rentals.map((r) => (
          <div key={r.id} className="card rental-row">
            <div>
              <h3>{r.model} <span className="muted">({r.plate_number})</span></h3>
              <p className="muted">{r.hours_booked}h · RM{r.total_price.toFixed(2)} · started {new Date(r.started_at + 'Z').toLocaleString()}</p>
              {r.status === 'returned' && (
                <p className="points-earned">+{r.points_earned} points earned 🎉</p>
              )}
            </div>
            <div>
              <span className={`status status-${r.status}`}>{r.status}</span>
              {r.status === 'active' && (
                <button
                  className="btn-primary"
                  onClick={() => handleReturn(r)}
                  disabled={returningId === r.id}
                >
                  {returningId === r.id ? 'Returning...' : 'Return Motorcycle'}
                </button>
              )}
            </div>
          </div>
        ))}
        {rentals.length === 0 && <p>You haven't rented any motorcycles yet.</p>}
      </div>
    </div>
  );
}
