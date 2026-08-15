import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const boxRef = useRef(null);

  async function loadNotifications() {
    if (!user) return;
    try {
      const data = await api.myNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent fail, non-critical
    }
  }

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleToggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unreadCount > 0) {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
    }
  }

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

          <div className="notif-wrapper" ref={boxRef}>
            <button className="notif-bell" onClick={handleToggle}>
              🔔
              {unreadCount > 0 && <span className="notif-dot">{unreadCount}</span>}
            </button>
            {open && (
              <div className="notif-dropdown">
                <h4>Notifications</h4>
                {notifications.length === 0 && <p className="muted">Takde notification lagi.</p>}
                {notifications.map((n) => (
                  <div key={n.id} className="notif-item">
                    <p>{n.message}</p>
                    <span className="muted">{new Date(n.created_at + 'Z').toLocaleString('ms-MY')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <span className="points-badge">⭐ {user.points ?? 0} pts</span>
          <Link to="/profile" className="profile-link">👤 Profile</Link>
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
