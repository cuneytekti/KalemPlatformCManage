import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { EmptyState, Spinner } from '../components/ui';
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

/** Bəli/Xeyr radyo grubu (Zoho formundaki gibi) */
function YesNo({ name, label }: { name: string; label: string }) {
  return (
    <label style={{ minWidth: 220 }}>
      {label}
      <span style={{ display: 'flex', gap: '1rem', paddingTop: '0.3rem' }}>
        <span style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          <input type="radio" name={name} value="true" /> Bəli
        </span>
        <span style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          <input type="radio" name={name} value="false" /> Xeyr
        </span>
      </span>
    </label>
  );
}

export function ClientInfoPage() {
  const [records, setRecords] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const navigate = useNavigate();

  const reload = () =>
    void api.clientInfo.list().then(setRecords).catch(() => setRecords([])).finally(() => setLoading(false));
  useEffect(reload, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const f = new FormData(e.currentTarget);
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
      (e.target as HTMLFormElement).reset();
      setShowForm(false);
      toast.success('Müşteri bilgi kaydı oluşturuldu');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function convert(r: ClientInfo) {
    try {
      await api.clientInfo.convertToQuote(r.id);
      toast.success(`${r.companyLegalName || r.marketName || r.fullName} için taslak teklif oluşturuldu`);
      navigate('/quotes');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
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
      <h2>Müşteri Bilgi Toplama</h2>
      <p className="muted">Müştəri Məlumatları — J-Retail Təqdimatı formu ve toplanan kayıtlar.</p>

      <button onClick={() => setShowForm((v) => !v)}>
        {showForm ? 'Formu Gizle' : '+ Yeni Müşteri Kaydı'}
      </button>

      {showForm && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3>Müştəri Məlumatları</h3>
          <p className="muted">J-Retail Təqdimatı</p>
          <form className="inline" onSubmit={onCreate}>
            <label>Tarix<input name="presentationDate" type="date" /></label>
            <label>Ad və soyad: *<input name="fullName" required maxLength={120} /></label>
            <label>Əlaqə nömrəsi: *<input name="phone" required maxLength={32} /></label>
            <label>E-mail: *<input name="email" type="email" required /></label>
            <label>Vəzifə:<input name="position" maxLength={120} /></label>
            <label>Şirkətin hüquqi adı:<input name="companyLegalName" maxLength={200} /></label>
            <label>Şirkət websaytı:<input name="companyWebsite" maxLength={200} /></label>
            <label>Marketin adı:<input name="marketName" maxLength={200} /></label>
            <label>Baş ofisin ünvanı — Küçə<input name="headOfficeStreet" maxLength={200} /></label>
            <label>Baş ofisin ünvanı — Şəhər<input name="headOfficeCity" maxLength={120} /></label>
            <label>Marketin yerləşdiyi şəhər:<input name="marketCity" maxLength={120} /></label>
            <label>Filialın ünvanı:<input name="branchAddress" maxLength={300} /></label>
            <label>
              Marketin əsas fəaliyyəti:
              <select name="mainActivity" defaultValue="">
                <option value="">—</option>
                {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label>Filialın sayı:<input name="branchCount" type="number" min={0} /></label>
            <label>Kassa sayı:<input name="cashRegisterCount" type="number" min={0} /></label>
            <label>Barkod oxuyucu sayı:<input name="barcodeScannerCount" type="number" min={0} /></label>
            <label>Tərəzi sayı:<input name="scaleCount" type="number" min={0} /></label>
            <label>POS terminal sayı:<input name="posTerminalCount" type="number" min={0} /></label>
            <label>Kompüter sayı:<input name="computerCount" type="number" min={0} /></label>
            <YesNo name="hasServer" label="Server mövcuddur?" />
            <YesNo name="branchesCentralSystem" label="Filiallar mərkəzi sistemlə işləyir?" />
            <YesNo name="sendCommercialOffer" label="Kommersiya təklifi göndərilsin?" />
            <label style={{ minWidth: 320 }}>Qeyd :<textarea name="note" rows={3} maxLength={4000} /></label>
            <button type="submit">Göndər</button>
          </form>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      <div style={{ marginTop: '1.25rem' }}>
        {loading ? (
          <Spinner />
        ) : records.length === 0 ? (
          <EmptyState message="Henüz kayıt yok. Yukarıdaki formla ilk müşteri bilgisini ekleyin." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Market / Şirket</th><th>İlgili</th><th>İletişim</th><th>Faaliyet</th>
                  <th>Donanım</th><th>Teklif İstedi</th><th>Teklif Gönderildi</th>
                  <th>Tarih</th><th>Durum</th><th></th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.marketName || r.companyLegalName || '—'}</strong>
                      {r.marketCity && <div className="muted">{r.marketCity}</div>}
                    </td>
                    <td>
                      {r.fullName}
                      {r.position && <div className="muted">{r.position}</div>}
                    </td>
                    <td>
                      <a href={`mailto:${r.email}`}>{r.email}</a>
                      <div className="muted">{r.phone}</div>
                    </td>
                    <td className="muted">
                      {r.mainActivity ?? '—'}
                      {r.branchCount != null && <div>filial: {r.branchCount}</div>}
                    </td>
                    <td className="muted" style={{ fontSize: '0.8rem' }}>
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
                    <td>
                      <span className={`badge ${r.status === 'CONVERTED' ? 'ACTIVE' : r.status === 'CLOSED' ? 'FAILED' : r.status === 'NEW' ? 'PENDING' : 'SENT'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {!r.quoteId && r.status !== 'CLOSED' && (
                        <button onClick={() => void convert(r)}>Teklife Dönüştür</button>
                      )}
                      {r.quoteId && <span className="badge SENT">Teklif ✓</span>}
                      {NEXT[r.status].map((n) => (
                        <button key={n.to} className="ghost" onClick={() => void move(r, n.to)}>{n.label}</button>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
