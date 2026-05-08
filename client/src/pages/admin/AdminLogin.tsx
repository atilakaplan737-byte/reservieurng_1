import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

export function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token } = await api.adminLogin(password);
      localStorage.setItem('admin_token', token);
      navigate('/admin');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hero-gradient">
      <div className="max-w-sm mx-auto px-4 py-16">
        <h1 className="font-display text-3xl text-white text-center mb-8">Admin-Login</h1>
        <form onSubmit={submit} className="card space-y-4">
          <div>
            <label className="label">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              autoFocus
              required
            />
          </div>
          {error && <p className="text-wine-light text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Wird geprüft …' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}
