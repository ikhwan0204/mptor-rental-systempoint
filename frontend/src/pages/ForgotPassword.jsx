import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setPreviewUrl('');
    try {
      const data = await api.forgotPassword(email);
      setMessage(data.message);
      if (data.previewUrl) setPreviewUrl(data.previewUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="card auth-card">
        <h2>Forgot Password</h2>
        {error && <div className="error-box">{error}</div>}
        {message && <div className="success-box">{message}</div>}
        {previewUrl && (
          <div className="success-box">
            📧 (Dev mode) Klik untuk lihat email test:{' '}
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">Buka Email</a>
          </div>
        )}
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
        <p className="switch-link"><Link to="/login">Back to Log In</Link></p>
      </form>
    </div>
  );
}
