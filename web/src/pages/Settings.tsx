import { FormEvent, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Save,
  Send,
  ServerCog,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { PageHeader, Spinner } from '../components/ui';
import { auth } from '../lib/auth';
import { api, MailSettings } from '../lib/api';

const EMPTY_SETTINGS: MailSettings = {
  enabled: false,
  host: '',
  port: 587,
  security: 'AUTO',
  authEnabled: true,
  username: '',
  password: '',
  passwordConfigured: false,
  fromName: 'Kalem Platform',
  fromEmail: 'info@kalemyazilim.az',
  source: 'ENV',
};

export function SettingsPage() {
  const [settings, setSettings] = useState<MailSettings>(EMPTY_SETTINGS);
  const [recipient, setRecipient] = useState(auth.getUser()?.email ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    void api.settings.getMail()
      .then((data) => setSettings({ ...data, password: '' }))
      .catch((error) => toast.error(error instanceof Error ? error.message : String(error)))
      .finally(() => setLoading(false));
  }, []);

  const payload = () => ({
    enabled: settings.enabled,
    host: settings.host,
    port: Number(settings.port),
    security: settings.security,
    authEnabled: settings.authEnabled,
    username: settings.username,
    password: settings.password || undefined,
    fromName: settings.fromName,
    fromEmail: settings.fromEmail,
  });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await api.settings.saveMail(payload());
      setSettings({ ...result, password: '' });
      toast.success('Mail ayarları kaydedildi ve kullanıma alındı');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function testMail() {
    if (!recipient.trim()) {
      toast.error('Test e-postası için alıcı adresi girin');
      return;
    }
    setTesting(true);
    try {
      const result = await api.settings.testMail({ ...payload(), recipient: recipient.trim() });
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setTesting(false);
    }
  }

  return <>
    <PageHeader
      eyebrow="Sistem yapılandırması"
      title="Ayarlar"
      description="CManage tarafından gönderilen teklif, fatura ve sistem bildirimlerinin merkezi e-posta hesabını yönetin."
    />
    {loading ? <Spinner /> : <form onSubmit={save} className="settings-layout">
      <section className="card settings-main-card">
        <div className="section-heading"><div><h3>Mail Ayarları</h3><p>SMTP bağlantısı ve kurumsal gönderen bilgileri.</p></div><Mail size={20} /></div>

        <div className="settings-enable-row">
          <div className="settings-feature-icon"><Send size={20} /></div>
          <div><strong>E-posta gönderimini etkinleştir</strong><span>Kapalı olduğunda hiçbir sistem e-postası gönderilmez.</span></div>
          <label className="settings-switch"><input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} /><span /></label>
        </div>

        <div className="settings-section-title"><ServerCog size={17} /><div><strong>SMTP bağlantısı</strong><span>Servis sağlayıcınızın sunucu ve güvenlik bilgileri.</span></div></div>
        <div className="settings-form-grid">
          <label className="field half">SMTP sunucusu<input required={settings.enabled} maxLength={255} placeholder="smtp.example.com" value={settings.host} onChange={(event) => setSettings({ ...settings, host: event.target.value })} /></label>
          <label className="field quarter">Port<input required type="number" min={1} max={65535} value={settings.port} onChange={(event) => setSettings({ ...settings, port: Number(event.target.value) })} /></label>
          <label className="field quarter">Güvenlik modu<select value={settings.security} onChange={(event) => setSettings({ ...settings, security: event.target.value as MailSettings['security'] })}><option value="AUTO">Otomatik</option><option value="STARTTLS">STARTTLS</option><option value="TLS">SSL / TLS</option><option value="NONE">Şifresiz</option></select></label>
        </div>

        <div className="settings-auth-row">
          <div><KeyRound size={17} /><span>SMTP kimlik doğrulaması kullan</span></div>
          <label className="settings-switch compact"><input type="checkbox" checked={settings.authEnabled} onChange={(event) => setSettings({ ...settings, authEnabled: event.target.checked })} /><span /></label>
        </div>
        <div className="settings-form-grid">
          <label className="field half">Kullanıcı adı<input required={settings.enabled && settings.authEnabled} disabled={!settings.authEnabled} maxLength={255} autoComplete="username" value={settings.username} onChange={(event) => setSettings({ ...settings, username: event.target.value })} /></label>
          <label className="field half">Şifre<div className="password-field"><input type={showPassword ? 'text' : 'password'} disabled={!settings.authEnabled} maxLength={512} autoComplete="new-password" placeholder={settings.passwordConfigured ? 'Mevcut şifre kayıtlı — değiştirmek için girin' : 'SMTP şifresi'} value={settings.password ?? ''} onChange={(event) => setSettings({ ...settings, password: event.target.value })} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
        </div>

        <div className="settings-section-title"><ShieldCheck size={17} /><div><strong>Gönderen kimliği</strong><span>Alıcının gelen kutusunda görünecek kurumsal bilgiler.</span></div></div>
        <div className="settings-form-grid">
          <label className="field half">Gönderen adı<input required maxLength={120} placeholder="Kalem Platform" value={settings.fromName} onChange={(event) => setSettings({ ...settings, fromName: event.target.value })} /></label>
          <label className="field half">Gönderen e-posta<input required type="email" maxLength={255} placeholder="info@kalemyazilim.az" value={settings.fromEmail} onChange={(event) => setSettings({ ...settings, fromEmail: event.target.value })} /></label>
        </div>

        <div className="settings-save-row"><p>Kaydedilen ayarlar uygulamayı yeniden başlatmadan devreye girer.</p><button type="submit" disabled={saving || testing}><Save size={16} /> {saving ? 'Kaydediliyor…' : 'Ayarları Kaydet'}</button></div>
      </section>

      <aside className="settings-sidebar">
        <section className={`card settings-status-card ${settings.enabled ? 'enabled' : ''}`}>
          <div className="settings-status-icon"><CheckCircle2 size={21} /></div>
          <span>Mail servisi</span><strong>{settings.enabled ? 'Etkin' : 'Devre dışı'}</strong>
          <dl><div><dt>Kaynak</dt><dd>{settings.source === 'PANEL' ? 'Panel ayarı' : 'Environment'}</dd></div><div><dt>Kimlik</dt><dd>{settings.authEnabled ? (settings.passwordConfigured ? 'Hazır' : 'Şifre gerekli') : 'Kullanılmıyor'}</dd></div><div><dt>Güvenlik</dt><dd>{settings.security}</dd></div></dl>
          {settings.updatedAt && <small>Son güncelleme: {new Date(settings.updatedAt).toLocaleString('tr-TR')}</small>}
        </section>
        <section className="card settings-test-card">
          <div className="section-heading"><div><h3>Test e-postası</h3><p>Formdaki değerlerle gerçek bir gönderim yapın.</p></div></div>
          <label>Test alıcısı<input type="email" required value={recipient} onChange={(event) => setRecipient(event.target.value)} /></label>
          <button type="button" className="ghost" disabled={testing || saving || !settings.enabled} onClick={() => void testMail()}><Send size={15} /> {testing ? 'Test ediliyor…' : 'Test E-postası Gönder'}</button>
          <p>Test başarılı olduğunda SMTP bağlantısı, kimlik doğrulaması ve mesaj teslimi birlikte doğrulanır.</p>
        </section>
      </aside>
    </form>}
  </>;
}
