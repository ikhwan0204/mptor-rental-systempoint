import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', student_id: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.register(form);
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="card auth-card">
        <h2>Create Account</h2>
        {error && <div className="error-box">{error}</div>}
        <label>Full Name</label>
        <input value={form.name} onChange={(e) => update('name', e.target.value)} required />
        <label>Student ID</label>
        <input value={form.student_id} onChange={(e) => update('student_id', e.target.value)} placeholder="e.g. S12345" />
        <label>Email</label>
        <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
        <label>Password</label>
        <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={6} />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Register'}
        </button>
        <p className="switch-link">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
