import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BadgePercent, Building2, CalendarClock, FileText, PackageOpen, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { EmptyState, PageHeader, Spinner } from '../components/ui';
import { api, ClientInfo, Lead, Quote } from '../lib/api';

const DEFAULT_PROJECT_DURATION =
  'Onay ve gerekli erişimlerin sağlanmasından sonra tahmini 45-65 iş günü.';
const DEFAULT_PAYMENT_TERMS =
  "Kurulum bedelinin %50'si siparişte, %50'si canlı geçiş tamamlandığında ödenir.";

type Prospect = {
  source: 'lead' | 'clientInfo';
  id: string;
  company: string;
  contactName: string;
  email: string;
  phone?: string;
  details: string;
  createdAt: string;
  qty: { seats: number; pos: number; mobile: number };
  notes: string;
};

function FormSection({ icon, title, description, children }: {
  icon: React.ReactNode; title: string; description: string; children: React.ReactNode;
}) {
  return <section className="form-section"><div className="form-section-header"><div className="form-section-icon">{icon}</div><div><h4>{title}</h4><p>{description}</p></div></div><div className="form-grid">{children}</div></section>;
}

function configNumber(config: string | undefined, key: string, fallback: number) {
  const match = config?.match(new RegExp(`${key}=(\\d+)`));
  return match ? Number(match[1]) : fallback;
}

function leadProspect(lead: Lead): Prospect {
  return {
    source: 'lead', id: lead.id, company: lead.company, contactName: lead.name,
    email: lead.email, phone: lead.phone, details: lead.config || lead.message || 'Web sitesi başvurusu',
    createdAt: lead.createdAt,
    qty: {
      seats: configNumber(lead.config, 'users', 5),
      pos: Math.max(1, configNumber(lead.config, 'pos', 1)),
      mobile: configNumber(lead.config, 'mobile', 0),
    },
    notes: `Web başvurusu${lead.phone ? ` - ${lead.phone}` : ''}${lead.message ? `\n${lead.message}` : ''}`,
  };
}

function clientProspect(record: ClientInfo): Prospect {
  const hardware = [
    record.branchCount != null && `Şube: ${record.branchCount}`,
    record.cashRegisterCount != null && `Kasa: ${record.cashRegisterCount}`,
    record.posTerminalCount != null && `POS: ${record.posTerminalCount}`,
    record.computerCount != null && `Bilgisayar: ${record.computerCount}`,
  ].filter(Boolean).join(' · ');
  return {
    source: 'clientInfo', id: record.id,
    company: record.companyLegalName || record.marketName || record.fullName,
    contactName: record.fullName, email: record.email, phone: record.phone,
    details: [record.mainActivity, hardware].filter(Boolean).join(' · ') || 'Müşteri bilgi formu',
    createdAt: record.createdAt,
    qty: { seats: Math.max(1, record.computerCount ?? 5), pos: Math.max(1, record.cashRegisterCount ?? 1), mobile: 0 },
    notes: `Müşteri bilgi formu - ${record.fullName}, ${record.phone}${record.note ? `\n${record.note}` : ''}`,
  };
}

export function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clientRecords, setClientRecords] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [convertId, setConvertId] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [qty, setQty] = useState({ seats: 5, pos: 1, mobile: 0 });
  const [unit, setUnit] = useState({ user: '', pos: '', mobile: '0' });
  const [setupFee, setSetupFee] = useState('0');
  const [discountType, setDiscountType] = useState<Quote['discountType']>('NONE');
  const [discountValue, setDiscountValue] = useState('0');
  const toast = useToast();
  const navigate = useNavigate();

  const reload = () => {
    setLoading(true);
    void Promise.all([api.quotes.list(), api.leads.list(), api.clientInfo.list()])
      .then(([quoteRows, leadRows, clientRows]) => {
        setQuotes(quoteRows); setLeads(leadRows); setClientRecords(clientRows);
      })
      .catch(() => { setQuotes([]); setLeads([]); setClientRecords([]); })
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const prospects = useMemo(() => [
    ...leads.filter((lead) => !lead.quoteId && lead.status !== 'CLOSED').map(leadProspect),
    ...clientRecords.filter((record) => record.sendCommercialOffer === true && !record.quoteId && record.status !== 'CLOSED').map(clientProspect),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [clientRecords, leads]);

  const preview = useMemo(() => {
    const cents = (value: string) => Math.max(0, Math.round((Number(value) || 0) * 100));
    const monthly = qty.seats * cents(unit.user) + qty.pos * cents(unit.pos) + qty.mobile * cents(unit.mobile);
    const setup = cents(setupFee);
    const discount = discountType === 'FIXED' ? Math.min(setup, cents(discountValue))
      : discountType === 'PERCENT' ? Math.round(setup * Math.min(100, Math.max(0, Number(discountValue) || 0)) / 100) : 0;
    const netSetup = setup - discount;
    return { monthly: (monthly / 100).toFixed(2), netSetup: (netSetup / 100).toFixed(2), firstYear: ((monthly * 12 + netSetup) / 100).toFixed(2) };
  }, [discountType, discountValue, qty, setupFee, unit]);

  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) setSelected(null); };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close); };
  }, [busy, selected]);

  function openProposal(prospect: Prospect) {
    setSelected(prospect); setQty(prospect.qty); setUnit({ user: '', pos: '', mobile: '0' });
    setSetupFee('0'); setDiscountType('NONE'); setDiscountValue('0'); setError('');
  }

  async function prepareProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setError(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    const optional = (name: string) => String(form.get(name) ?? '').trim() || undefined;
    const payload: Partial<Quote> = {
      customerName: String(form.get('customerName')).trim(), contactName: optional('contactName'),
      contactEmail: optional('contactEmail'), seats: qty.seats, posTerminals: qty.pos,
      mobileTerminals: qty.mobile, pricePerUser: unit.user, pricePerPosTerminal: unit.pos,
      pricePerMobileTerminal: unit.mobile || '0', setupFee: setupFee || '0', discountType,
      discountValue: discountType === 'NONE' ? '0' : (discountValue || '0'),
      projectDurationText: optional('projectDurationText'), paymentTermsText: optional('paymentTermsText'),
      notes: optional('notes'), currency: String(form.get('currency')),
    };
    try {
      const quote = selected.source === 'lead'
        ? await api.leads.convertToQuote(selected.id, payload)
        : await api.clientInfo.convertToQuote(selected.id, payload);
      toast.success(`${quote.quoteNumber} numaralı teklif hazırlandı`);
      setSelected(null); reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  }

  async function sendEmail(quote: Quote) {
    try { await api.quotes.send(quote.id, 'az'); toast.success(`Teklif e-postayla gönderildi: ${quote.customerName}`); reload(); }
    catch (err) { toast.error(err instanceof Error ? err.message : String(err)); }
  }

  async function convertToTenant(quote: Quote) {
    if (!/^[a-z][a-z0-9-]{2,30}$/.test(slug)) { toast.error('Geçerli bir subdomain girin (küçük harf, 3-31 karakter)'); return; }
    try { const tenant = await api.quotes.convertToTenant(quote.id, slug); toast.success(`${quote.customerName} → ${slug}.kalemplatform.com kurulumu başladı`); setConvertId(null); setSlug(''); navigate(`/tenants/${tenant.id}`); }
    catch (err) { toast.error(err instanceof Error ? err.message : String(err)); }
  }

  return <>
    <PageHeader eyebrow="Ticari yönetim" title="Fiyat Teklifleri" description="Teklif isteyen potansiyel müşteriler için kapsamı belirleyin, kurumsal PDF hazırlayın ve satış sürecini yönetin." />

    <section className="card prospect-card">
      <div className="section-heading"><div><h3>Teklif bekleyen potansiyel müşteriler</h3><p>Başvurular ve müşteri bilgi toplama kayıtlarından teklif talep eden müşteriler.</p></div><span className="prospect-count">{prospects.length} bekleyen</span></div>
      {loading ? <Spinner /> : prospects.length === 0 ? <EmptyState message="Teklif hazırlanmayı bekleyen potansiyel müşteri bulunmuyor." /> : <div className="table-wrap"><table><thead><tr><th>Kaynak</th><th>Şirket</th><th>İlgili</th><th>İletişim</th><th>İhtiyaç özeti</th><th>Talep tarihi</th><th></th></tr></thead><tbody>
        {prospects.map((prospect) => <tr key={`${prospect.source}-${prospect.id}`}><td><span className={`source-badge ${prospect.source}`}>{prospect.source === 'lead' ? 'Başvuru' : 'Bilgi Formu'}</span></td><td><strong>{prospect.company}</strong></td><td>{prospect.contactName}</td><td><a href={`mailto:${prospect.email}`}>{prospect.email}</a>{prospect.phone && <small>{prospect.phone}</small>}</td><td className="prospect-detail">{prospect.details}</td><td>{new Date(prospect.createdAt).toLocaleDateString('tr-TR')}</td><td><button onClick={() => openProposal(prospect)}><FileText size={15} /> Teklif Hazırla</button></td></tr>)}
      </tbody></table></div>}
    </section>

    <div className="section-heading quote-list-heading"><div><h3>Hazırlanan teklifler</h3><p>PDF, gönderim ve müşteri dönüşüm işlemleri.</p></div></div>
    {loading ? <Spinner /> : quotes.length === 0 ? <EmptyState message="Henüz hazırlanmış teklif yok." /> : <div className="table-wrap quote-table"><table><thead><tr><th>Teklif</th><th>Müşteri</th><th>Kullanıcı</th><th>Kasa</th><th>Aylık</th><th>İlk Yıl</th><th>Durum</th><th></th></tr></thead><tbody>
      {quotes.map((quote) => <tr key={quote.id}><td><strong>{quote.quoteNumber}</strong><small>{new Date(quote.createdAt).toLocaleDateString('tr-TR')}</small></td><td>{quote.customerName}{quote.contactName && <small>{quote.contactName}</small>}</td><td>{quote.seats} × {quote.pricePerUser}</td><td>{quote.posTerminals} × {quote.pricePerPosTerminal}</td><td><strong>{quote.monthlyTotal} {quote.currency}</strong></td><td><strong>{quote.firstYearTotal} {quote.currency}</strong></td><td><span className={`badge ${quote.status}`}>{quote.status}</span></td><td><div className="action-cell">{(['az', 'tr', 'en'] as const).map((lang) => <a key={lang} href={api.quotes.pdfUrl(quote.id, lang)}>{lang.toUpperCase()}</a>)}{(quote.status === 'DRAFT' || quote.status === 'SENT') && <button className="ghost" onClick={() => void sendEmail(quote)}>E-posta Gönder</button>}{!quote.tenantId && quote.status !== 'REJECTED' && convertId !== quote.id && <button onClick={() => { setConvertId(quote.id); setSlug(''); }}>Müşteriye Dönüştür</button>}{quote.tenantId && <span className="badge ACTIVE">Müşteri ✓</span>}</div>{convertId === quote.id && <div className="action-cell inline-convert"><input placeholder="subdomain (örn: musteri1)" value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} pattern="[a-z][a-z0-9-]{2,30}" autoFocus /><button onClick={() => void convertToTenant(quote)}>Kur</button><button className="ghost" onClick={() => setConvertId(null)}>Vazgeç</button></div>}</td></tr>)}
    </tbody></table></div>}

    {selected && <div className="form-modal-backdrop" onMouseDown={() => !busy && setSelected(null)}><div className="form-modal proposal-modal" role="dialog" aria-modal="true" aria-labelledby="proposal-form-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="form-modal-header"><div><span className="page-eyebrow">{selected.source === 'lead' ? 'Başvuru kaydı' : 'Müşteri bilgi kaydı'}</span><h3 id="proposal-form-title">{selected.company} için teklif hazırla</h3><p>Teklifte kullanılacak kapsam, fiyat ve ticari koşulları belirleyin.</p></div><button className="modal-close" type="button" onClick={() => setSelected(null)} disabled={busy} aria-label="Teklif formunu kapat"><X size={18} /></button></div>
      <form onSubmit={prepareProposal}><div className="form-modal-body"><div className="form-sections">
        <FormSection icon={<Building2 size={18} />} title="Müşteri ve muhatap" description="Kaynak kayıttan gelen bilgiler teklif için düzenlenebilir."><label className="field"><span>Müşteri / şirket <span className="required">*</span></span><input name="customerName" required maxLength={120} defaultValue={selected.company} autoFocus /></label><label className="field">Muhatap<input name="contactName" maxLength={120} defaultValue={selected.contactName} /></label><label className="field">E-posta<input name="contactEmail" type="email" defaultValue={selected.email} /></label></FormSection>
        <FormSection icon={<PackageOpen size={18} />} title="Lisans ve kapasite" description="İhtiyaç bilgileri kaynak kayda göre önceden doldurulmuştur."><label className="field">Kullanıcı adedi<input type="number" value={qty.seats} min={1} max={1000} onChange={(event) => setQty({ ...qty, seats: Number(event.target.value) })} /></label><label className="field">Kullanıcı birim fiyat<input required inputMode="decimal" placeholder="15.00" value={unit.user} onChange={(event) => setUnit({ ...unit, user: event.target.value })} /></label><label className="field">POS kasa adedi<input type="number" value={qty.pos} min={1} max={200} onChange={(event) => setQty({ ...qty, pos: Number(event.target.value) })} /></label><label className="field">Kasa birim fiyat<input required inputMode="decimal" placeholder="49.00" value={unit.pos} onChange={(event) => setUnit({ ...unit, pos: event.target.value })} /></label><label className="field">Mobil terminal<input type="number" value={qty.mobile} min={0} max={500} onChange={(event) => setQty({ ...qty, mobile: Number(event.target.value) })} /></label><label className="field">Terminal birim fiyat<input inputMode="decimal" placeholder="19.00" value={unit.mobile} onChange={(event) => setUnit({ ...unit, mobile: event.target.value })} /></label></FormSection>
        <FormSection icon={<BadgePercent size={18} />} title="Kurulum ve ticari koşullar" description="Tek seferlik bedel, indirim ve teklif özelindeki şartlar."><label className="field">Kurulum bedeli<input inputMode="decimal" value={setupFee} onChange={(event) => setSetupFee(event.target.value)} /></label><label className="field">İndirim tipi<select name="discountType" value={discountType} onChange={(event) => setDiscountType(event.target.value as Quote['discountType'])}><option value="NONE">İndirim yok</option><option value="FIXED">Sabit tutar</option><option value="PERCENT">Yüzde</option></select></label><label className="field">İndirim değeri<input inputMode="decimal" value={discountValue} disabled={discountType === 'NONE'} min="0" max={discountType === 'PERCENT' ? '100' : undefined} onChange={(event) => setDiscountValue(event.target.value)} /></label><label className="field">Para birimi<select name="currency" defaultValue="AZN"><option>AZN</option><option>TRY</option><option>USD</option><option>EUR</option></select></label><label className="field half">Proje süresi<textarea name="projectDurationText" defaultValue={DEFAULT_PROJECT_DURATION} maxLength={1000} /></label><label className="field half">Ödeme şartları<textarea name="paymentTermsText" defaultValue={DEFAULT_PAYMENT_TERMS} maxLength={1000} /></label><label className="field full">Ek notlar<textarea name="notes" defaultValue={selected.notes} maxLength={1800} /></label></FormSection>
        <section className="quote-summary" aria-label="Teklif toplamları"><div><span>Aylık lisans</span><strong>{preview.monthly}</strong></div><div><span>Net kurulum</span><strong>{preview.netSetup}</strong></div><div className="quote-summary-primary"><span>İlk yıl toplam yatırım</span><strong>{preview.firstYear}</strong></div></section>
        {error && <p className="error">{error}</p>}
      </div></div><div className="form-modal-footer"><p><CalendarClock size={14} /> Oluşturulan teklif kaynak kayda otomatik bağlanır.</p><div className="button-row"><button className="ghost" type="button" onClick={() => setSelected(null)} disabled={busy}>Vazgeç</button><button type="submit" disabled={busy}><FileText size={15} /> {busy ? 'Hazırlanıyor…' : 'Teklifi Kaydet ve Hazırla'}</button></div></div></form>
    </div></div>}
  </>;
}
