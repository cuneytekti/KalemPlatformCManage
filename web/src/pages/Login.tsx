import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { auth } from '../lib/auth';

export function LoginPage() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsTotp, setNeedsTotp] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const totpCode = String(form.get('totpCode') ?? '').trim() || undefined;
    try {
      const result = await api.auth.login(String(form.get('email')), String(form.get('password')), totpCode);
      auth.save(result.accessToken, result.user);
      navigate('/', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('TOTP_REQUIRED')) {
        setNeedsTotp(true);
        setError('İki adımlı doğrulama etkin — uygulamanızdaki 6 haneli kodu girin.');
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>CManage</h1>
        <p className="muted">Kalem Platform Yönetim Paneli</p>
        <label>E-posta<input name="email" type="email" required autoFocus autoComplete="username" /></label>
        <label>Şifre<input name="password" type="password" required autoComplete="current-password" /></label>
        {needsTotp && (
          <label>Doğrulama Kodu (2FA)
            <input name="totpCode" inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="000000" autoComplete="one-time-code" autoFocus />
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <button disabled={busy}>{busy ? 'Giriş yapılıyor…' : 'Giriş Yap'}</button>
      </form>
    </div>
  );
}
