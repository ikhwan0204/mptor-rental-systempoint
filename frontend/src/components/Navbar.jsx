import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to="/" className="brand">🏍️ Motor Rental</Link>
      {user ? (
        <div className="nav-links">
          <Link to="/">Motorcycles</Link>
          <Link to="/my-rentals">My Rentals</Link>
          <Link to="/points">Points & Rewards</Link>
          {user.role === 'admin' && <Link to="/admin">Admin</Link>}
          <span className="points-badge">⭐ {user.points ?? 0} pts</span>
          <button onClick={handleLogout} className="btn-ghost">Logout</button>
        </div>
      ) : (
        <div className="nav-links">
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      )}
    </nav>
  );
}
