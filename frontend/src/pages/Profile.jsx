import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: '', student_id: '', email: '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  useEffect(() => {
    api.getProfile()
      .then((data) => setForm({ name: data.name, student_id: data.student_id || '', email: data.email }))
      .catch((err) => setProfileErr(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileErr('');
    setProfileMsg('');
    try {
      const updated = await api.updateProfile({ name: form.name, student_id: form.student_id });
      updateUser({ name: updated.name, student_id: updated.student_id });
      setProfileMsg('Profile dikemaskini.');
    } catch (err) {
      setProfileErr(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwErr('');
    setPwMsg('');
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwErr('Password baru tidak sepadan dengan confirm password.');
      return;
    }
    setSavingPassword(true);
    try {
      await api.changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwMsg('Password berjaya ditukar.');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPwErr(err.message);
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) return <p className="center-text">Loading profile...</p>;

  return (
    <div className="page">
      <h1>My Profile</h1>

      <div className="card auth-card" style={{ marginBottom: 20 }}>
        <h2>Maklumat Peribadi</h2>
        {profileErr && <div className="error-box">{profileErr}</div>}
        {profileMsg && <div className="success-box">{profileMsg}</div>}
        <form onSubmit={handleSaveProfile}>
          <label>Nama Penuh</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <label>Student ID</label>
          <input value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} placeholder="e.g. S12345" />
          <label>Email</label>
          <input value={form.email} disabled />
          <button className="btn-primary" disabled={savingProfile} style={{ marginTop: 16 }}>
            {savingProfile ? 'Menyimpan...' : 'Simpan Profile'}
          </button>
        </form>
      </div>

      <div className="card auth-card">
        <h2>Tukar Password</h2>
        {pwErr && <div className="error-box">{pwErr}</div>}
        {pwMsg && <div className="success-box">{pwMsg}</div>}
        <form onSubmit={handleChangePassword}>
          <label>Password Semasa</label>
          <input
            type="password"
            value={pwForm.current_password}
            onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
            required
          />
          <label>Password Baru</label>
          <input
            type="password"
            value={pwForm.new_password}
            onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
            required
            minLength={6}
          />
          <label>Sahkan Password Baru</label>
          <input
            type="password"
            value={pwForm.confirm_password}
            onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
            required
            minLength={6}
          />
          <button className="btn-primary" disabled={savingPassword} style={{ marginTop: 16 }}>
            {savingPassword ? 'Menyimpan...' : 'Tukar Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
