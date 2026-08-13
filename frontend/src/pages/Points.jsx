import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Points() {
  const [data, setData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [redeemingId, setRedeemingId] = useState(null);
  const { updatePoints } = useAuth();

  async function load() {
    try {
      const [pts, lb, rw] = await Promise.all([api.myPoints(), api.leaderboard(), api.rewards()]);
      setData(pts);
      setLeaderboard(lb);
      setRewards(rw);
      updatePoints(pts.balance);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRedeem(reward) {
    setRedeemingId(reward.id);
    setMessage('');
    setError('');
    try {
      const res = await api.redeem(reward.id);
      setMessage(`Redeemed "${res.reward}"! Your code: ${res.code}`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRedeemingId(null);
    }
  }

  if (!data) return <p className="center-text">Loading...</p>;

  return (
    <div className="page">
      <h1>Points & Rewards</h1>
      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}

      <div className="card points-balance">
        <span className="big-number">{data.balance}</span>
        <span className="muted">points balance</span>
      </div>

      <h2>Redeem Rewards</h2>
      <div className="grid">
        {rewards.map((r) => (
          <div key={r.id} className="card">
            <h3>{r.name}</h3>
            <p className="muted">{r.description}</p>
            <p className="price">{r.points_cost} pts</p>
            <button
              className="btn-primary"
              disabled={data.balance < r.points_cost || redeemingId === r.id}
              onClick={() => handleRedeem(r)}
            >
              {redeemingId === r.id ? 'Redeeming...' : 'Redeem'}
            </button>
          </div>
        ))}
      </div>

      <h2>Points History</h2>
      <div className="list">
        {data.history.map((h) => (
          <div key={h.id} className="card history-row">
            <span>{h.reason}</span>
            <span className={h.points_change >= 0 ? 'points-plus' : 'points-minus'}>
              {h.points_change >= 0 ? '+' : ''}{h.points_change}
            </span>
          </div>
        ))}
        {data.history.length === 0 && <p>No points activity yet — rent a motorcycle to start earning!</p>}
      </div>

      <h2>🏆 Top Earners</h2>
      <div className="list">
        {leaderboard.map((u, i) => (
          <div key={i} className="card history-row">
            <span>#{i + 1} {u.name}</span>
            <span>{u.points} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
