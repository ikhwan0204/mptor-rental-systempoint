import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Password tidak sepadan.');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword({ token, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="card auth-card">
          <h2>Link Tidak Sah</h2>
          <p className="muted">Token reset password tak dijumpai dalam link ni. Sila minta link baru.</p>
          <p className="switch-link"><Link to="/forgot-password">Minta Link Baru</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="card auth-card">
        <h2>Reset Password</h2>
        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">Password berjaya ditukar! Redirecting ke login...</div>}
        {!success && (
          <>
            <label>Password Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
            <label>Sahkan Password Baru</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Reset Password'}
            </button>
          </>
        )}
        <p className="switch-link"><Link to="/login">Back to Log In</Link></p>
      </form>
    </div>
  );
}
