import { FormEvent, useEffect, useState } from 'react';
import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  MapPin,
  MessageSquareText,
  MonitorCog,
  Plus,
  Send,
  UserRound,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { EmptyState, PageHeader, Spinner } from '../components/ui';
import { api, ClientInfo } from '../lib/api';

const ACTIVITIES = ['Supermarket', 'Minimarket', 'Hipermarket', 'Topdan Satış'];

const NEXT: Record<ClientInfo['status'], { to: ClientInfo['status']; label: string }[]> = {
  NEW: [
    { to: 'CONTACTED', label: 'İletişime Geçildi' },
    { to: 'CLOSED', label: 'Kapat' },
  ],
  CONTACTED: [
    { to: 'CONVERTED', label: 'Müşteriye Dönüştü' },
    { to: 'CLOSED', label: 'Kapat' },
  ],
  CONVERTED: [],
  CLOSED: [{ to: 'NEW', label: 'Yeniden Aç' }],
};

function FormSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="form-section">
      <div className="form-section-header">
        <div className="form-section-icon">{icon}</div>
        <div><h4>{title}</h4><p>{description}</p></div>
      </div>
      <div className="form-grid">{children}</div>
    </section>
  );
}

function YesNo({ name, label }: { name: string; label: string }) {
  return (
    <div className="segmented-field">
      <span>{label}</span>
      <div className="segmented-options">
        <label className="segmented-option">
          <input type="radio" name={name} value="true" />
          <span>Bəli</span>
        </label>
        <label className="segmented-option">
          <input type="radio" name={name} value="false" />
          <span>Xeyr</span>
        </label>
      </div>
    </div>
  );
}

export function ClientInfoPage() {
  const [records, setRecords] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const reload = () =>
    void api.clientInfo.list().then(setRecords).catch(() => setRecords([])).finally(() => setLoading(false));
  useEffect(reload, []);

  useEffect(() => {
    if (!showForm) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setShowForm(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showForm, busy]);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const formElement = e.currentTarget;
    const f = new FormData(formElement);
    const str = (k: string) => (String(f.get(k) ?? '').trim() || undefined);
    const num = (k: string) => {
      const v = String(f.get(k) ?? '').trim();
      return v === '' ? undefined : parseInt(v, 10);
    };
    const bool = (k: string) => {
      const v = f.get(k);
      return v == null ? undefined : v === 'true';
    };
    try {
      await api.clientInfo.create({
        presentationDate: str('presentationDate'),
        fullName: String(f.get('fullName')),
        phone: String(f.get('phone')),
        email: String(f.get('email')),
        position: str('position'),
        companyLegalName: str('companyLegalName'),
        companyWebsite: str('companyWebsite'),
        marketName: str('marketName'),
        headOfficeStreet: str('headOfficeStreet'),
        headOfficeCity: str('headOfficeCity'),
        marketCity: str('marketCity'),
        branchAddress: str('branchAddress'),
        mainActivity: str('mainActivity'),
        branchCount: num('branchCount'),
        cashRegisterCount: num('cashRegisterCount'),
        barcodeScannerCount: num('barcodeScannerCount'),
        scaleCount: num('scaleCount'),
        posTerminalCount: num('posTerminalCount'),
        computerCount: num('computerCount'),
        hasServer: bool('hasServer'),
        branchesCentralSystem: bool('branchesCentralSystem'),
        sendCommercialOffer: bool('sendCommercialOffer'),
        note: str('note'),
      });
      formElement.reset();
      setShowForm(false);
      toast.success('Müşteri bilgi kaydı oluşturuldu');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function convert() {
    navigate('/quotes');
  }

  async function move(r: ClientInfo, to: ClientInfo['status']) {
    try {
      await api.clientInfo.setStatus(r.id, to);
      toast.success(`${r.fullName} → ${to}`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function toggleOfferSent(r: ClientInfo) {
    try {
      await api.clientInfo.update(r.id, { offerSent: !r.offerSent });
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Satış operasyonları"
        title="Müşteri Bilgi Toplama"
        description="J-Retail təqdimatı için müşteri ihtiyaçlarını kaydedin, takip edin ve doğrudan teklife dönüştürün."
        actions={
          <button onClick={() => { setError(''); setShowForm(true); }}>
            <Plus size={16} /> Yeni Müşteri Kaydı
          </button>
        }
      />

      {loading ? (
        <Spinner />
      ) : records.length === 0 ? (
        <EmptyState message="İlk müşteri bilgi kaydını oluşturmak için yukarıdaki butonu kullanın." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Market / Şirket</th><th>İlgili</th><th>İletişim</th><th>Faaliyet</th>
                <th>Donanım</th><th>Teklif İstedi</th><th>Gönderildi</th>
                <th>Tarih</th><th>Durum</th><th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.marketName || r.companyLegalName || '—'}</strong>
                    {r.marketCity && <div className="muted">{r.marketCity}</div>}
                  </td>
                  <td>{r.fullName}{r.position && <div className="muted">{r.position}</div>}</td>
                  <td><a href={`mailto:${r.email}`}>{r.email}</a><div className="muted">{r.phone}</div></td>
                  <td className="muted">
                    {r.mainActivity ?? '—'}
                    {r.branchCount != null && <div>filial: {r.branchCount}</div>}
                  </td>
                  <td className="muted">
                    {[
                      r.cashRegisterCount != null && `kassa ${r.cashRegisterCount}`,
                      r.posTerminalCount != null && `POS ${r.posTerminalCount}`,
                      r.computerCount != null && `PC ${r.computerCount}`,
                      r.barcodeScannerCount != null && `barkod ${r.barcodeScannerCount}`,
                      r.scaleCount != null && `tərəzi ${r.scaleCount}`,
                      r.hasServer != null && `server: ${r.hasServer ? 'bəli' : 'xeyr'}`,
                    ].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td>{r.sendCommercialOffer == null ? '—' : r.sendCommercialOffer ? 'Bəli' : 'Xeyr'}</td>
                  <td>
                    <button className="ghost" onClick={() => void toggleOfferSent(r)}>
                      {r.offerSent ? '✓ Evet' : 'Hayır'}
                    </button>
                  </td>
                  <td>{new Date(r.createdAt).toLocaleDateString('tr-TR')}</td>
                  <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                  <td>
                    <div className="action-cell">
                      {!r.quoteId && r.status !== 'CLOSED' && r.sendCommercialOffer && (
                        <button onClick={convert}>Tekliflere Git</button>
                      )}
                      {r.quoteId && <span className="badge SENT">Teklif ✓</span>}
                      {NEXT[r.status].map((n) => (
                        <button key={n.to} className="ghost" onClick={() => void move(r, n.to)}>{n.label}</button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="form-modal-backdrop" onMouseDown={() => !busy && setShowForm(false)}>
          <div className="form-modal" role="dialog" aria-modal="true" aria-labelledby="client-form-title" onMouseDown={(e) => e.stopPropagation()}>
            <div className="form-modal-header">
              <div>
                <span className="page-eyebrow">J-Retail təqdimatı</span>
                <h3 id="client-form-title">Yeni müşteri bilgi kaydı</h3>
                <p>Müşteri ve operasyon bilgilerini eksiksiz şekilde kaydedin.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setShowForm(false)} disabled={busy} aria-label="Formu kapat">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={onCreate}>
              <div className="form-modal-body">
                <div className="form-sections">
                  <FormSection icon={<UserRound size={18} />} title="Sunum ve iletişim" description="Görüşme tarihi ve iletişim kurulacak kişi">
                    <label className="field">Tarix<input name="presentationDate" type="date" /></label>
                    <label className="field"><span>Ad və soyad <span className="required">*</span></span><input name="fullName" required maxLength={120} autoFocus /></label>
                    <label className="field">Vəzifə<input name="position" maxLength={120} /></label>
                    <label className="field half"><span>Əlaqə nömrəsi <span className="required">*</span></span><input name="phone" required maxLength={32} /></label>
                    <label className="field half"><span>E-mail <span className="required">*</span></span><input name="email" type="email" required /></label>
                  </FormSection>

                  <FormSection icon={<Building2 size={18} />} title="Şirket ve market" description="Ticari unvan ve faaliyet bilgileri">
                    <label className="field half">Şirkətin hüquqi adı<input name="companyLegalName" maxLength={200} /></label>
                    <label className="field half">Marketin adı<input name="marketName" maxLength={200} /></label>
                    <label className="field half">Şirkət websaytı<input name="companyWebsite" maxLength={200} placeholder="https://" /></label>
                    <label className="field half">Marketin əsas fəaliyyəti
                      <select name="mainActivity" defaultValue="">
                        <option value="">Seçilməyib</option>
                        {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </label>
                  </FormSection>

                  <FormSection icon={<MapPin size={18} />} title="Adres bilgileri" description="Merkez ve şube konumları">
                    <label className="field wide">Baş ofisin ünvanı — Küçə<input name="headOfficeStreet" maxLength={200} /></label>
                    <label className="field">Baş ofisin ünvanı — Şəhər<input name="headOfficeCity" maxLength={120} /></label>
                    <label className="field half">Marketin yerləşdiyi şəhər<input name="marketCity" maxLength={120} /></label>
                    <label className="field half">Filialın ünvanı<input name="branchAddress" maxLength={300} /></label>
                  </FormSection>

                  <FormSection icon={<MonitorCog size={18} />} title="Şube ve donanım kapasitesi" description="Mevcut operasyon ölçeği ve cihaz adetleri">
                    <label className="field">Filialın sayı<input name="branchCount" type="number" min={0} /></label>
                    <label className="field">Kassa sayı<input name="cashRegisterCount" type="number" min={0} /></label>
                    <label className="field">POS terminal sayı<input name="posTerminalCount" type="number" min={0} /></label>
                    <label className="field">Kompüter sayı<input name="computerCount" type="number" min={0} /></label>
                    <label className="field">Barkod oxuyucu sayı<input name="barcodeScannerCount" type="number" min={0} /></label>
                    <label className="field">Tərəzi sayı<input name="scaleCount" type="number" min={0} /></label>
                  </FormSection>

                  <FormSection icon={<ClipboardCheck size={18} />} title="Sistem ve teklif tercihleri" description="Teknik yapı ve ticari beklenti">
                    <YesNo name="hasServer" label="Server mövcuddur?" />
                    <YesNo name="branchesCentralSystem" label="Filiallar mərkəzi sistemlə işləyir?" />
                    <YesNo name="sendCommercialOffer" label="Kommersiya təklifi göndərilsin?" />
                  </FormSection>

                  <FormSection icon={<MessageSquareText size={18} />} title="Notlar" description="Görüşmede öne çıkan ek bilgiler">
                    <label className="field full">Qeyd<textarea name="note" rows={4} maxLength={4000} placeholder="Müşteri beklentileri, özel koşullar ve takip notları..." /></label>
                  </FormSection>
                </div>
                {error && <p className="error">{error}</p>}
              </div>
              <div className="form-modal-footer">
                <p><CalendarDays size={14} /> Kayıt, oluşturulma tarihiyle birlikte takip listesine eklenecektir.</p>
                <div className="button-row">
                  <button className="ghost" type="button" onClick={() => setShowForm(false)} disabled={busy}>Vazgeç</button>
                  <button type="submit" disabled={busy}><Send size={15} /> {busy ? 'Kaydediliyor…' : 'Kaydı Oluştur'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
