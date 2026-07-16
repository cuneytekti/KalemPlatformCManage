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
      <div className="login-shell">
        <section className="login-brand">
          <div className="login-brand-logo">
            <img src="/kalem-logo.png" alt="" />
            <div><strong>CManage</strong><span>Kalem Platform</span></div>
          </div>
          <div className="login-brand-copy">
            <h1>Operasyonunuz tek merkezde.</h1>
            <p>Müşteri, lisans, teklif, fatura ve sistem operasyonlarını güvenli bir yönetim deneyimiyle kontrol edin.</p>
          </div>
          <div className="login-brand-foot">© {new Date().getFullYear()} Kalem Platform · Kurumsal Yönetim Sistemleri</div>
        </section>
        <form className="login-card" onSubmit={onSubmit}>
          <div>
            <span className="page-eyebrow">Güvenli erişim</span>
            <h2>Yönetim paneline giriş</h2>
            <p>Yetkili hesabınızla devam edin.</p>
          </div>
          <label>E-posta<input name="email" type="email" required autoFocus autoComplete="username" placeholder="ad@kalemplatform.com" /></label>
          <label>Şifre<input name="password" type="password" required autoComplete="current-password" placeholder="••••••••••" /></label>
          {needsTotp && (
            <label>Doğrulama Kodu (2FA)
              <input name="totpCode" inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="000000" autoComplete="one-time-code" autoFocus />
            </label>
          )}
          {error && <p className="error">{error}</p>}
          <button disabled={busy}>{busy ? 'Giriş yapılıyor…' : 'Giriş Yap'}</button>
        </form>
      </div>
    </div>
  );
}
