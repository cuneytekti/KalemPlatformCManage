import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BadgePercent, Building2, CalendarClock, PackageOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { EmptyState, PageHeader } from '../components/ui';
import { api, Quote } from '../lib/api';

const DEFAULT_PROJECT_DURATION =
  'Onay ve gerekli erişimlerin sağlanmasından sonra tahmini 45-65 iş günü.';
const DEFAULT_PAYMENT_TERMS =
  "Kurulum bedelinin %50'si siparişte, %50'si canlı geçiş tamamlandığında ödenir.";

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

export function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const [convertId, setConvertId] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [qty, setQty] = useState({ seats: 5, pos: 1, mobile: 0 });
  const [unit, setUnit] = useState({ user: '', pos: '', mobile: '0' });
  const [setupFee, setSetupFee] = useState('0');
  const [discountType, setDiscountType] = useState<Quote['discountType']>('NONE');
  const [discountValue, setDiscountValue] = useState('0');

  const reload = () => void api.quotes.list().then(setQuotes).catch(() => setQuotes([]));
  useEffect(reload, []);

  const preview = useMemo(() => {
    const cents = (value: string) => Math.max(0, Math.round((Number(value) || 0) * 100));
    const monthly = qty.seats * cents(unit.user) + qty.pos * cents(unit.pos) + qty.mobile * cents(unit.mobile);
    const setup = cents(setupFee);
    const discount = discountType === 'FIXED'
      ? Math.min(setup, cents(discountValue))
      : discountType === 'PERCENT'
        ? Math.round(setup * Math.min(100, Math.max(0, Number(discountValue) || 0)) / 100)
        : 0;
    const netSetup = setup - discount;
    return {
      monthly: (monthly / 100).toFixed(2),
      netSetup: (netSetup / 100).toFixed(2),
      firstYear: ((monthly * 12 + netSetup) / 100).toFixed(2),
    };
  }, [discountType, discountValue, qty, setupFee, unit]);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const optional = (name: string) => String(form.get(name) ?? '').trim() || undefined;
    try {
      await api.quotes.create({
        customerName: String(form.get('customerName')).trim(),
        contactName: optional('contactName'),
        contactEmail: optional('contactEmail'),
        seats: qty.seats,
        posTerminals: qty.pos,
        mobileTerminals: qty.mobile,
        pricePerUser: unit.user,
        pricePerPosTerminal: unit.pos,
        pricePerMobileTerminal: unit.mobile || '0',
        setupFee: setupFee || '0',
        discountType,
        discountValue: discountType === 'NONE' ? '0' : (discountValue || '0'),
        projectDurationText: optional('projectDurationText'),
        paymentTermsText: optional('paymentTermsText'),
        notes: optional('notes'),
        currency: String(form.get('currency')),
      });
      formElement.reset();
      setQty({ seats: 5, pos: 1, mobile: 0 });
      setUnit({ user: '', pos: '', mobile: '0' });
      setSetupFee('0');
      setDiscountType('NONE');
      setDiscountValue('0');
      toast.success('Kurumsal teklif oluşturuldu');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

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

  return (
    <>
      <PageHeader
        eyebrow="Ticari yönetim"
        title="Fiyat Teklifleri"
        description="Kurumsal teklif oluşturun, üç dilde PDF üretin ve satış sürecini yönetin."
      />
      <form className="quote-form form-sections" onSubmit={onCreate}>
        <FormSection icon={<Building2 size={18} />} title="Müşteri ve muhatap" description="Kapakta ve teklif iletişiminde kullanılacak bilgiler.">
          <label className="field">Müşteri / şirket <span className="required">*</span><input name="customerName" required maxLength={120} /></label>
          <label className="field">Muhatap<input name="contactName" maxLength={120} placeholder="Ad Soyad" /></label>
          <label className="field">E-posta<input name="contactEmail" type="email" /></label>
        </FormSection>

        <FormSection icon={<PackageOpen size={18} />} title="Lisans ve kapasite" description="Aylık lisans adetleri ve birim fiyatları.">
          <label className="field">Kullanıcı adedi<input type="number" value={qty.seats} min={1} max={1000} onChange={(e) => setQty({ ...qty, seats: Number(e.target.value) })} /></label>
          <label className="field">Kullanıcı birim fiyat<input required inputMode="decimal" placeholder="15.00" value={unit.user} onChange={(e) => setUnit({ ...unit, user: e.target.value })} /></label>
          <label className="field">POS kasa adedi<input type="number" value={qty.pos} min={1} max={200} onChange={(e) => setQty({ ...qty, pos: Number(e.target.value) })} /></label>
          <label className="field">Kasa birim fiyat<input required inputMode="decimal" placeholder="49.00" value={unit.pos} onChange={(e) => setUnit({ ...unit, pos: e.target.value })} /></label>
          <label className="field">Mobil terminal<input type="number" value={qty.mobile} min={0} max={500} onChange={(e) => setQty({ ...qty, mobile: Number(e.target.value) })} /></label>
          <label className="field">Terminal birim fiyat<input inputMode="decimal" placeholder="19.00" value={unit.mobile} onChange={(e) => setUnit({ ...unit, mobile: e.target.value })} /></label>
        </FormSection>

        <FormSection icon={<BadgePercent size={18} />} title="Kurulum ve ticari koşullar" description="Tek seferlik bedel, indirim ve teklif özelindeki şartlar.">
          <label className="field">Kurulum bedeli<input inputMode="decimal" value={setupFee} onChange={(e) => setSetupFee(e.target.value)} /></label>
          <label className="field">İndirim tipi<select value={discountType} onChange={(e) => setDiscountType(e.target.value as Quote['discountType'])}><option value="NONE">İndirim yok</option><option value="FIXED">Sabit tutar</option><option value="PERCENT">Yüzde</option></select></label>
          <label className="field">İndirim değeri<input inputMode="decimal" value={discountValue} disabled={discountType === 'NONE'} min="0" max={discountType === 'PERCENT' ? '100' : undefined} onChange={(e) => setDiscountValue(e.target.value)} /></label>
          <label className="field">Para birimi<select name="currency" defaultValue="AZN"><option>AZN</option><option>TRY</option><option>USD</option><option>EUR</option></select></label>
          <label className="field half">Proje süresi<textarea name="projectDurationText" defaultValue={DEFAULT_PROJECT_DURATION} maxLength={1000} /></label>
          <label className="field half">Ödeme şartları<textarea name="paymentTermsText" defaultValue={DEFAULT_PAYMENT_TERMS} maxLength={1000} /></label>
          <label className="field full">Ek notlar<textarea name="notes" placeholder="Teklife özel kapsam, entegrasyon veya açıklamalar" /></label>
        </FormSection>

        <section className="quote-summary" aria-label="Teklif toplamları">
          <div><span>Aylık lisans</span><strong>{preview.monthly}</strong></div>
          <div><span>Net kurulum</span><strong>{preview.netSetup}</strong></div>
          <div className="quote-summary-primary"><span>İlk yıl toplam yatırım</span><strong>{preview.firstYear}</strong></div>
          <div className="quote-submit"><CalendarClock size={18} /><span>Teklif 30 gün geçerlidir.</span><button disabled={busy}>{busy ? 'Oluşturuluyor…' : 'Kurumsal Teklif Oluştur'}</button></div>
        </section>
        {error && <p className="error">{error}</p>}
      </form>

      {quotes.length === 0 ? <EmptyState message="Henüz teklif yok." /> : (
        <div className="table-wrap quote-table"><table><thead><tr><th>Teklif</th><th>Müşteri</th><th>Kullanıcı</th><th>Kasa</th><th>Aylık</th><th>İlk Yıl</th><th>Durum</th><th></th></tr></thead><tbody>
          {quotes.map((q) => <tr key={q.id}>
            <td><strong>{q.quoteNumber}</strong><small>{new Date(q.createdAt).toLocaleDateString('tr-TR')}</small></td>
            <td>{q.customerName}{q.contactName && <small>{q.contactName}</small>}</td>
            <td>{q.seats} × {q.pricePerUser}</td><td>{q.posTerminals} × {q.pricePerPosTerminal}</td>
            <td><strong>{q.monthlyTotal} {q.currency}</strong></td><td><strong>{q.firstYearTotal} {q.currency}</strong></td>
            <td><span className={`badge ${q.status}`}>{q.status}</span></td>
            <td><div className="action-cell">{(['az', 'tr', 'en'] as const).map((lang) => <a key={lang} href={api.quotes.pdfUrl(q.id, lang)} title={`PDF (${lang})`}>{lang.toUpperCase()}</a>)}
              {(q.status === 'DRAFT' || q.status === 'SENT') && <button className="ghost" onClick={() => void sendEmail(q)}>E-posta Gönder</button>}
              {!q.tenantId && q.status !== 'REJECTED' && convertId !== q.id && <button onClick={() => { setConvertId(q.id); setSlug(''); }}>Müşteriye Dönüştür</button>}
              {q.tenantId && <span className="badge ACTIVE">Müşteri ✓</span>}
            </div>{convertId === q.id && <div className="action-cell inline-convert"><input placeholder="subdomain (örn: musteri1)" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} pattern="[a-z][a-z0-9-]{2,30}" autoFocus /><button onClick={() => void convertToTenant(q)}>Kur</button><button className="ghost" onClick={() => setConvertId(null)}>Vazgeç</button></div>}</td>
          </tr>)}
        </tbody></table></div>
      )}
    </>
  );
}
