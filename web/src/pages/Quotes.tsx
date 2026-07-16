import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { EmptyState, PageHeader } from '../components/ui';
import { api, Quote } from '../lib/api';

export function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [error, setError] = useState('');
  const toast = useToast();
  const navigate = useNavigate();
  const [convertId, setConvertId] = useState<string | null>(null);
  const [slug, setSlug] = useState('');

  async function sendEmail(q: Quote) {
    try {
      await api.quotes.send(q.id, 'az');
      toast.success(`Teklif e-postayla gönderildi: ${q.customerName}`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function convertToTenant(q: Quote) {
    if (!/^[a-z][a-z0-9-]{2,30}$/.test(slug)) {
      toast.error('Geçerli bir subdomain girin (küçük harf, 3-31 karakter)');
      return;
    }
    try {
      const tenant = await api.quotes.convertToTenant(q.id, slug);
      toast.success(`${q.customerName} → ${slug}.kalemplatform.com kurulumu başladı`);
      setConvertId(null);
      setSlug('');
      navigate(`/tenants/${tenant.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }
  const [qty, setQty] = useState({ seats: 5, pos: 1, mobile: 0 });
  const [unit, setUnit] = useState({ user: '', pos: '', mobile: '0' });

  const reload = () => void api.quotes.list().then(setQuotes).catch(() => setQuotes([]));
  useEffect(reload, []);

  /** Formdaki canlı aylık toplam önizlemesi */
  const preview = useMemo(() => {
    const cents = (v: string) => Math.round((parseFloat(v) || 0) * 100);
    const total =
      qty.seats * cents(unit.user) + qty.pos * cents(unit.pos) + qty.mobile * cents(unit.mobile);
    return (total / 100).toFixed(2);
  }, [qty, unit]);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      await api.quotes.create({
        customerName: String(form.get('customerName')),
        contactEmail: String(form.get('contactEmail')) || undefined,
        seats: qty.seats,
        posTerminals: qty.pos,
        mobileTerminals: qty.mobile,
        pricePerUser: unit.user,
        pricePerPosTerminal: unit.pos,
        pricePerMobileTerminal: unit.mobile || '0',
        currency: String(form.get('currency')),
      });
      (e.target as HTMLFormElement).reset();
      setQty({ seats: 5, pos: 1, mobile: 0 });
      setUnit({ user: '', pos: '', mobile: '0' });
      toast.success('Teklif oluşturuldu');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Ticari yönetim"
        title="Fiyat Teklifleri"
        description="Müşteri kapasitesine göre fiyatlandırma oluşturun, PDF üretin ve satış sürecini yönetin."
      />
      <div className="card">
        <div className="section-heading">
          <div><h3>Yeni fiyat teklifi</h3><p>Lisans adetlerini ve birim fiyatları tanımlayın.</p></div>
        </div>
        <form className="inline" onSubmit={onCreate}>
          <label>Müşteri<input name="customerName" required maxLength={120} /></label>
          <label>E-posta<input name="contactEmail" type="email" /></label>
          <label>Kullanıcı
            <input type="number" value={qty.seats} min={1} max={1000}
              onChange={(e) => setQty({ ...qty, seats: Number(e.target.value) })} />
          </label>
          <label>POS Kasa
            <input type="number" value={qty.pos} min={1} max={200}
              onChange={(e) => setQty({ ...qty, pos: Number(e.target.value) })} />
          </label>
          <label>Mobil Terminal
            <input type="number" value={qty.mobile} min={0} max={500}
              onChange={(e) => setQty({ ...qty, mobile: Number(e.target.value) })} />
          </label>
          <label>Kullanıcı birim ₼
            <input required placeholder="15.00" value={unit.user}
              onChange={(e) => setUnit({ ...unit, user: e.target.value })} />
          </label>
          <label>Kasa birim ₼
            <input required placeholder="49.00" value={unit.pos}
              onChange={(e) => setUnit({ ...unit, pos: e.target.value })} />
          </label>
          <label>Terminal birim ₼
            <input placeholder="19.00" value={unit.mobile}
              onChange={(e) => setUnit({ ...unit, mobile: e.target.value })} />
          </label>
          <label>Para birimi
            <select name="currency" defaultValue="AZN">
              <option>AZN</option><option>TRY</option><option>USD</option><option>EUR</option>
            </select>
          </label>
          <button>Teklif Oluştur</button>
        </form>
        <p className="muted" style={{ marginBottom: 0 }}>
          Aylık toplam önizleme: <strong>{preview}</strong>
        </p>
        {error && <p className="error">{error}</p>}
      </div>
      {quotes.length === 0 ? (
        <EmptyState message="Henüz teklif yok." />
      ) : (
      <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Müşteri</th><th>Kullanıcı</th><th>Kasa</th><th>Mobil</th>
            <th>Aylık Toplam</th><th>Durum</th><th>Tarih</th><th></th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id}>
              <td>{q.customerName}</td>
              <td>{q.seats} × {q.pricePerUser}</td>
              <td>{q.posTerminals} × {q.pricePerPosTerminal}</td>
              <td>{q.mobileTerminals} × {q.pricePerMobileTerminal}</td>
              <td><strong>{q.monthlyTotal} {q.currency}</strong></td>
              <td><span className={`badge ${q.status}`}>{q.status}</span></td>
              <td>{new Date(q.createdAt).toLocaleDateString('tr-TR')}</td>
              <td>
                <div className="action-cell">
                  {(['az', 'tr', 'en'] as const).map((lang) => (
                    <a key={lang} href={api.quotes.pdfUrl(q.id, lang)} title={`PDF (${lang})`}>
                      {lang.toUpperCase()}
                    </a>
                  ))}
                  {(q.status === 'DRAFT' || q.status === 'SENT') && (
                    <button className="ghost" onClick={() => void sendEmail(q)}>E-posta Gönder</button>
                  )}
                  {!q.tenantId && q.status !== 'REJECTED' && convertId !== q.id && (
                    <button onClick={() => { setConvertId(q.id); setSlug(''); }}>
                      Müşteriye Dönüştür
                    </button>
                  )}
                  {q.tenantId && <span className="badge ACTIVE">Müşteri ✓</span>}
                </div>
                {convertId === q.id && (
                  <div className="action-cell inline-convert">
                    <input
                      placeholder="subdomain (örn: musteri1)"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase())}
                      pattern="[a-z][a-z0-9-]{2,30}"
                      autoFocus
                    />
                    <button onClick={() => void convertToTenant(q)}>Kur</button>
                    <button className="ghost" onClick={() => setConvertId(null)}>Vazgeç</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      )}
    </>
  );
}
