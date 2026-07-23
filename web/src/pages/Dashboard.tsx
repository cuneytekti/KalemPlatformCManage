import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileCheck2,
  FileText,
  Gauge,
  Layers3,
  ServerCog,
  Tag,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader, Spinner } from '../components/ui';
import {
  api,
  ClientInfo,
  Invoice,
  Lead,
  LogoKalemQuote,
  Quote,
  SystemStats,
  Tenant,
  TenantUsageAlerts,
} from '../lib/api';

const STATUS_TR: Record<string, string> = {
  NEW: 'Yeni', CONTACTED: 'İletişimde', CONVERTED: 'Dönüştü', CLOSED: 'Kapalı',
  DRAFT: 'Taslak', SENT: 'Gönderildi', FOLLOW_UP: 'Takip', MEETING: 'Görüşme', NEGOTIATION: 'Müzakere', ACCEPTED: 'Kabul edildi', REJECTED: 'Reddedildi',
  ACTIVE: 'Aktif', PENDING: 'Bekliyor', PROVISIONING: 'Kuruluyor', FAILED: 'Hatalı',
};

const APP_UPDATED_AT = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'long',
  timeStyle: 'short',
}).format(new Date(__APP_UPDATED_AT__));

type ActivityRow = {
  id: string;
  type: 'lead' | 'client' | 'quote' | 'logo-kalem';
  title: string;
  detail: string;
  status: string;
  createdAt: string;
  path: string;
};

function isRecent(date: string, days = 30) {
  return Date.now() - new Date(date).getTime() <= days * 24 * 60 * 60 * 1000;
}

function rate(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value) + ` ${currency}`;
}

export function DashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clientRecords, setClientRecords] = useState<ClientInfo[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [logoKalemQuotes, setLogoKalemQuotes] = useState<LogoKalemQuote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [usageAlerts, setUsageAlerts] = useState<TenantUsageAlerts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      api.tenants.list().catch(() => [] as Tenant[]),
      api.leads.list().catch(() => [] as Lead[]),
      api.clientInfo.list().catch(() => [] as ClientInfo[]),
      api.quotes.list().catch(() => [] as Quote[]),
      api.logoKalem.list().catch(() => [] as LogoKalemQuote[]),
      api.invoices.list().catch(() => [] as Invoice[]),
      api.usage.alerts().catch(() => [] as TenantUsageAlerts[]),
      api.system.stats().catch(() => null),
    ]).then(([tenantRows, leadRows, clientRows, quoteRows, logoKalemRows, invoiceRows, alertRows, systemStats]) => {
      setTenants(tenantRows);
      setLeads(leadRows);
      setClientRecords(clientRows);
      setQuotes(quoteRows);
      setLogoKalemQuotes(logoKalemRows);
      setInvoices(invoiceRows);
      setUsageAlerts(alertRows);
      setStats(systemStats);
    }).finally(() => setLoading(false));
  }, []);

  const analytics = useMemo(() => {
    const activeQuoteStatuses = new Set(['DRAFT', 'SENT', 'FOLLOW_UP', 'MEETING', 'NEGOTIATION']);
    const openLeads = leads.filter((item) => !item.quoteId && item.status !== 'CLOSED');
    const requestedForms = clientRecords.filter((item) => item.sendCommercialOffer && !item.quoteId && item.status !== 'CLOSED');
    const openQuotes = quotes.filter((item) => activeQuoteStatuses.has(item.status));
    const sentQuotes = quotes.filter((item) => item.status !== 'DRAFT');
    const acceptedQuotes = quotes.filter((item) => item.status === 'ACCEPTED');
    const openLogoKalemQuotes = logoKalemQuotes.filter((item) => activeQuoteStatuses.has(item.status));
    const sentLogoKalemQuotes = logoKalemQuotes.filter((item) => item.status !== 'DRAFT');
    const acceptedLogoKalemQuotes = logoKalemQuotes.filter((item) => item.status === 'ACCEPTED');
    const activeTenants = tenants.filter((item) => item.status === 'ACTIVE');
    const linkedQuoteIds = new Set([
      ...leads.map((item) => item.quoteId),
      ...clientRecords.map((item) => item.quoteId),
    ].filter(Boolean));
    const directQuotes = quotes.filter((item) => !linkedQuoteIds.has(item.id)).length;
    const acquisition = leads.length + clientRecords.length + directQuotes;
    const requested = leads.filter((item) => item.quoteId).length
      + clientRecords.filter((item) => item.sendCommercialOffer || item.quoteId).length
      + directQuotes;
    const actionable = openLeads.length + requestedForms.length + openQuotes.length + openLogoKalemQuotes.length;
    const overdueInvoices = invoices.filter((item) => item.status === 'OVERDUE');
    const failedTenants = tenants.filter((item) => item.status === 'FAILED');
    const quoteByCurrency = quotes.reduce<Record<string, { open: number; won: number }>>((result, quote) => {
      result[quote.currency] ??= { open: 0, won: 0 };
      if (activeQuoteStatuses.has(quote.status)) result[quote.currency].open += Number(quote.firstYearTotal);
      if (quote.status === 'ACCEPTED') result[quote.currency].won += Number(quote.firstYearTotal);
      return result;
    }, {});
    const logoKalemByCurrency = logoKalemQuotes.reduce<Record<string, { open: number; won: number; monthly: number; annual: number }>>((result, quote) => {
      const currency = quote.activeCurrency || 'USD';
      result[currency] ??= { open: 0, won: 0, monthly: 0, annual: 0 };
      const main = Number(quote.activeRevision?.mainTotal || 0);
      if (activeQuoteStatuses.has(quote.status)) {
        result[currency].open += main;
        result[currency].monthly += Number(quote.activeRevision?.maintenanceTotal || 0);
        result[currency].annual += Number(quote.activeRevision?.lemTotal || 0);
      }
      if (quote.status === 'ACCEPTED') result[currency].won += main;
      return result;
    }, {});

    const activities: ActivityRow[] = [
      ...leads.map((item) => ({ id: `lead-${item.id}`, type: 'lead' as const, title: item.company, detail: `${item.name} · Web başvurusu`, status: item.status, createdAt: item.createdAt, path: '/leads' })),
      ...clientRecords.map((item) => ({ id: `client-${item.id}`, type: 'client' as const, title: item.companyLegalName || item.marketName || item.fullName, detail: `${item.fullName} · Bilgi toplama formu`, status: item.status, createdAt: item.createdAt, path: '/client-info' })),
      ...quotes.map((item) => ({ id: `quote-${item.id}`, type: 'quote' as const, title: item.customerName, detail: `${item.quoteNumber} · Standart teklif · ${formatMoney(Number(item.firstYearTotal), item.currency)}`, status: item.lastActivity?.status || item.status, createdAt: item.lastActivity?.activityAt || item.sentAt || item.createdAt, path: '/quotes' })),
      ...logoKalemQuotes.map((item) => ({ id: `logo-kalem-${item.id}`, type: 'logo-kalem' as const, title: item.customerName, detail: `${item.baseNumber}-R${String(item.activeRevision?.revisionNumber ?? 0).padStart(2, '0')} · Logo-Kalem · ${formatMoney(Number(item.activeRevision?.mainTotal || 0), item.activeCurrency || 'USD')}`, status: item.lastActivity?.status || item.status, createdAt: item.lastActivity?.activityAt || item.sentAt || item.createdAt, path: '/logo-kalem-quotes' })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);

    return {
      openLeads, requestedForms, openQuotes, sentQuotes, acceptedQuotes, openLogoKalemQuotes, sentLogoKalemQuotes, acceptedLogoKalemQuotes, activeTenants,
      acquisition, requested, actionable, overdueInvoices, failedTenants, quoteByCurrency, logoKalemByCurrency, activities,
    };
  }, [clientRecords, invoices, leads, logoKalemQuotes, quotes, tenants]);

  const funnel = [
    { label: 'Toplam başvuru ve bilgi kaydı', value: analytics.acquisition, path: '/leads' },
    { label: 'Teklif talebi / nitelikli kayıt', value: analytics.requested, path: '/client-info' },
    { label: 'Hazırlanan teklif', value: quotes.length, path: '/quotes' },
    { label: 'Müşteriye gönderilen', value: analytics.sentQuotes.length, path: '/quotes' },
    { label: 'Kabul edilen teklif', value: analytics.acceptedQuotes.length, path: '/quotes' },
  ];
  const funnelMax = Math.max(...funnel.map((item) => item.value), 1);
  const quoteStatusGroups = [
    { label: 'Taslak', value: quotes.filter((item) => item.status === 'DRAFT').length, className: 'DRAFT' },
    { label: 'Aktif takip', value: quotes.filter((item) => ['SENT', 'FOLLOW_UP', 'MEETING', 'NEGOTIATION'].includes(item.status)).length, className: 'SENT' },
    { label: 'Kabul', value: analytics.acceptedQuotes.length, className: 'ACCEPTED' },
    { label: 'Ret', value: quotes.filter((item) => item.status === 'REJECTED').length, className: 'REJECTED' },
  ];
  const logoKalemStatusGroups = [
    { label: 'Taslak', value: logoKalemQuotes.filter((item) => item.status === 'DRAFT').length, className: 'DRAFT' },
    { label: 'Aktif takip', value: logoKalemQuotes.filter((item) => ['SENT', 'FOLLOW_UP', 'MEETING', 'NEGOTIATION'].includes(item.status)).length, className: 'SENT' },
    { label: 'Kabul', value: analytics.acceptedLogoKalemQuotes.length, className: 'ACCEPTED' },
    { label: 'Ret', value: logoKalemQuotes.filter((item) => item.status === 'REJECTED').length, className: 'REJECTED' },
  ];
  const totalAlerts = usageAlerts.reduce((sum, item) => sum + item.alerts.length, 0);

  return (
    <>
      <PageHeader
        eyebrow="Satış ve operasyon merkezi"
        title="Genel Bakış"
        description="Başvuru, standart teklif ve bağımsız Logo-Kalem teklif portföyünü; satış aksiyonları ve operasyon sağlığıyla birlikte tek ekrandan analiz edin."
        actions={<div className="dashboard-header-actions"><Link className="dashboard-secondary-link" to="/quotes">Standart Teklifler</Link><Link className="dashboard-primary-link" to="/logo-kalem-quotes">Logo-Kalem Teklifler <ArrowRight size={16} /></Link></div>}
      />
      <section className="dashboard-release" aria-label="Uygulama sürüm bilgisi">
        <div><Tag size={16} /><span>Versiyon</span><strong>v{__APP_VERSION__}</strong></div>
        <div><CalendarClock size={16} /><span>Son güncelleme</span><strong>{APP_UPDATED_AT}</strong></div>
      </section>
      {loading ? <Spinner /> : <>
        <section className="dashboard-kpi-grid" aria-label="Temel performans göstergeleri">
          <article className="dashboard-kpi critical">
            <div className="dashboard-kpi-icon"><Activity size={20} /></div>
            <div><span>Bekleyen satış aksiyonu</span><strong>{analytics.actionable}</strong><small>Başvuru, form ve açık teklifler</small></div>
          </article>
          <article className="dashboard-kpi">
            <div className="dashboard-kpi-icon"><ClipboardList size={20} /></div>
            <div><span>Başvurular</span><strong>{leads.length}</strong><small>Son 30 gün: {leads.filter((item) => isRecent(item.createdAt)).length}</small></div>
          </article>
          <article className="dashboard-kpi">
            <div className="dashboard-kpi-icon"><FileText size={20} /></div>
            <div><span>Bilgi toplama kayıtları</span><strong>{clientRecords.length}</strong><small>{analytics.requestedForms.length} teklif hazırlamayı bekliyor</small></div>
          </article>
          <article className="dashboard-kpi success">
            <div className="dashboard-kpi-icon"><TrendingUp size={20} /></div>
            <div><span>Toplam teklif başarı oranı</span><strong>%{rate(analytics.acceptedQuotes.length + analytics.acceptedLogoKalemQuotes.length, analytics.sentQuotes.length + analytics.sentLogoKalemQuotes.length)}</strong><small>{analytics.acceptedQuotes.length + analytics.acceptedLogoKalemQuotes.length} kabul · iki teklif kanalının birleşik sonucu</small></div>
          </article>
        </section>

        <div className="dashboard-main-grid">
          <section className="card dashboard-funnel-card">
            <div className="section-heading"><div><h3>Satış dönüşüm hunisi</h3><p>Başvurudan kabul edilen teklife kadar mevcut birikim.</p></div><span className="dashboard-period">Tüm zamanlar</span></div>
            <div className="dashboard-funnel">
              {funnel.map((item, index) => <Link to={item.path} className="funnel-row" key={item.label}>
                <span className="funnel-index">{index + 1}</span>
                <div className="funnel-content"><div><span>{item.label}</span><strong>{item.value}</strong></div><div className="funnel-track"><span style={{ width: `${Math.max(4, (item.value / funnelMax) * 100)}%` }} /></div></div>
                {index > 0 && <small>%{rate(item.value, funnel[index - 1].value)}</small>}
              </Link>)}
            </div>
          </section>

          <section className="card dashboard-action-card">
            <div className="section-heading"><div><h3>Aksiyon merkezi</h3><p>Öncelik bekleyen satış ve operasyon kayıtları.</p></div><AlertTriangle size={19} /></div>
            <div className="action-queue">
              <Link to="/leads"><span className="action-dot warning" /><div><strong>Yeni ve açık başvurular</strong><small>İletişim veya teklif aksiyonu bekliyor</small></div><b>{analytics.openLeads.length}</b></Link>
              <Link to="/quotes"><span className="action-dot warning" /><div><strong>Teklif isteyen bilgi formları</strong><small>Henüz teklif hazırlanmamış</small></div><b>{analytics.requestedForms.length}</b></Link>
              <Link to="/quotes"><span className="action-dot info" /><div><strong>Taslak / yanıt bekleyen teklifler</strong><small>Standart satış takibi devam ediyor</small></div><b>{analytics.openQuotes.length}</b></Link>
              <Link to="/logo-kalem-quotes"><span className="action-dot info" /><div><strong>Logo-Kalem takip kuyruğu</strong><small>Taslak, gönderim ve satış görüşmesi sürecindekiler</small></div><b>{analytics.openLogoKalemQuotes.length}</b></Link>
              <Link to="/tenants"><span className={`action-dot ${analytics.failedTenants.length ? 'danger' : 'success'}`} /><div><strong>Hatalı müşteri kurulumu</strong><small>Operasyon müdahalesi gerektirir</small></div><b>{analytics.failedTenants.length}</b></Link>
              <Link to="/invoices"><span className={`action-dot ${analytics.overdueInvoices.length ? 'danger' : 'success'}`} /><div><strong>Gecikmiş fatura</strong><small>Tahsilat takibi gereken kayıtlar</small></div><b>{analytics.overdueInvoices.length}</b></Link>
            </div>
          </section>
        </div>

        <div className="dashboard-analysis-grid">
          <section className="card">
            <div className="section-heading"><div><h3>Standart teklif portföyü</h3><p>Platform lisans tekliflerinin durum ve ilk yıl yatırım değeri.</p></div><CircleDollarSign size={19} /></div>
            <div className="quote-status-grid">
              {quoteStatusGroups.map((group) => <div key={group.label}><div><span>{group.label}</span><strong>{group.value}</strong></div><div className={`status-track ${group.className}`}><span style={{ width: `${Math.max(group.value ? 8 : 0, rate(group.value, quotes.length))}%` }} /></div></div>)}
            </div>
            <div className="portfolio-values">
              {Object.keys(analytics.quoteByCurrency).length === 0 ? <p>Henüz parasal teklif verisi yok.</p> : Object.entries(analytics.quoteByCurrency).map(([currency, value]) => <div key={currency}><span>{currency}</span><div><small>Açık portföy</small><strong>{formatMoney(value.open, currency)}</strong></div><div><small>Kazanılan</small><strong>{formatMoney(value.won, currency)}</strong></div></div>)}
            </div>
          </section>

          <section className="card dashboard-logo-kalem-card">
            <div className="section-heading"><div><h3>Logo-Kalem teklif portföyü</h3><p>Bağımsız teklif modülünün aktif süreci ve ticari değeri.</p></div><Layers3 size={19} /></div>
            <div className="quote-status-grid">
              {logoKalemStatusGroups.map((group) => <div key={group.label}><div><span>{group.label}</span><strong>{group.value}</strong></div><div className={`status-track ${group.className}`}><span style={{ width: `${Math.max(group.value ? 8 : 0, rate(group.value, logoKalemQuotes.length))}%` }} /></div></div>)}
            </div>
            <div className="portfolio-values logo-kalem-values">
              {Object.keys(analytics.logoKalemByCurrency).length === 0 ? <p>Henüz Logo-Kalem teklif verisi yok.</p> : Object.entries(analytics.logoKalemByCurrency).map(([currency, value]) => <div key={currency}><span>{currency}</span><div><small>Açık net yatırım</small><strong>{formatMoney(value.open, currency)}</strong></div><div><small>Kazanılan</small><strong>{formatMoney(value.won, currency)}</strong></div><div><small>Aylık bakım / Yıllık LEM</small><strong>{formatMoney(value.monthly, currency)} / {formatMoney(value.annual, currency)}</strong></div></div>)}
            </div>
            <Link className="dashboard-module-link" to="/logo-kalem-quotes">Teklifleri ve revizyonları incele <ArrowRight size={14} /></Link>
          </section>
        </div>

        <section className="card dashboard-health-card">
          <div className="section-heading"><div><h3>Müşteri ve sistem sağlığı</h3><p>Aktif müşteriler, lisans kapasitesi ve çalışma ortamının anlık durumu.</p></div><Gauge size={19} /></div>
          <div className="health-summary">
            <div><Building2 size={18} /><span>Aktif müşteri</span><strong>{analytics.activeTenants.length}</strong></div>
            <div><UsersRound size={18} /><span>Lisanslı kullanıcı</span><strong>{tenants.filter((item) => item.status !== 'DELETED').reduce((sum, item) => sum + item.licensedUsers, 0)}</strong></div>
            <div><ServerCog size={18} /><span>Çalışan container</span><strong>{stats ? `${stats.containersRunning}/${stats.containersTotal}` : '—'}</strong></div>
            <div><AlertTriangle size={18} /><span>Lisans uyarısı</span><strong>{totalAlerts}</strong></div>
          </div>
          <div className={`system-health-banner ${analytics.failedTenants.length || totalAlerts ? 'attention' : ''}`}>
            {analytics.failedTenants.length || totalAlerts ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
            <div><strong>{analytics.failedTenants.length || totalAlerts ? 'Kontrol gerektiren operasyonlar var' : 'Tüm operasyonlar sağlıklı'}</strong><span>{analytics.failedTenants.length} hatalı kurulum · {totalAlerts} kapasite uyarısı</span></div>
            <Link to="/tenants">İncele <ArrowRight size={14} /></Link>
          </div>
        </section>

        <section className="card dashboard-activity-card">
          <div className="section-heading"><div><h3>Son satış hareketleri</h3><p>Başvuru, bilgi toplama, standart ve Logo-Kalem tekliflerinin birleşik zaman akışı.</p></div><span className="dashboard-period">Son {analytics.activities.length} kayıt</span></div>
          {analytics.activities.length === 0 ? <div className="dashboard-empty">Henüz satış hareketi bulunmuyor.</div> : <div className="activity-list">
            {analytics.activities.map((item) => <Link to={item.path} key={item.id}>
              <span className={`activity-icon ${item.type}`}>{item.type === 'lead' ? <ClipboardList size={17} /> : item.type === 'client' ? <FileCheck2 size={17} /> : item.type === 'logo-kalem' ? <Layers3 size={17} /> : <CircleDollarSign size={17} />}</span>
              <div><strong>{item.title}</strong><small>{item.detail}</small></div>
              <span className={`badge ${item.status}`}>{STATUS_TR[item.status] ?? item.status}</span>
              <time>{new Date(item.createdAt).toLocaleDateString('tr-TR')}</time>
              <ArrowRight size={15} />
            </Link>)}
          </div>}
        </section>
      </>}
    </>
  );
}
