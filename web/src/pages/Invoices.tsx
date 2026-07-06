import { useEffect, useState } from 'react';
import { useToast } from '../components/Toast';
import { EmptyState } from '../components/ui';
import { api, Invoice, Tenant } from '../lib/api';

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function sendEmail(inv: Invoice) {
    try {
      await api.invoices.send(inv.id, 'az');
      toast.success(`Fatura e-postayla gönderildi (${inv.period})`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  const reload = () => {
    void api.invoices.list().then(setInvoices).catch(() => setInvoices([]));
    void api.tenants.list().then(setTenants).catch(() => setTenants([]));
  };
  useEffect(reload, []);

  const tenantName = (id: string) => tenants.find((t) => t.id === id)?.name ?? id.slice(0, 8);
  const period = new Date().toISOString().slice(0, 7);

  async function generate() {
    setError('');
    setBusy(true);
    try {
      const created = await api.invoices.generate(period);
      if (created.length === 0) {
        setError('Yeni fatura yok: bu dönem zaten faturalanmış veya ACTIVE lisanslı tenant bulunamadı.');
      } else {
        toast.success(`${created.length} fatura oluşturuldu`);
      }
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>Faturalar</h2>
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>
          Her ayın 1'i 06:00'da otomatik oluşturulur. Manuel tetikleme:
        </p>
        <button onClick={() => void generate()} disabled={busy}>
          {busy ? 'Oluşturuluyor…' : `${period} Dönemini Faturala`}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
      {invoices.length === 0 ? (
        <EmptyState message="Henüz fatura yok. Dönem faturalaması otomatik (her ayın 1'i) veya yukarıdan manuel çalışır." />
      ) : (
      <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Dönem</th><th>Müşteri</th><th>Kalemler</th><th>Toplam</th><th>Vade</th><th>Durum</th><th></th></tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td>{inv.period}</td>
              <td>{tenantName(inv.tenantId)}</td>
              <td className="muted">
                {inv.lines.map((l) => `${l.label}: ${l.qty}×${l.unitPrice}`).join(' · ')}
              </td>
              <td><strong>{inv.total} {inv.currency}</strong></td>
              <td>{inv.dueDate ?? '—'}</td>
              <td><span className={`badge ${inv.status === 'PAID' ? 'ACTIVE' : inv.status === 'OVERDUE' ? 'FAILED' : inv.status}`}>{inv.status}</span></td>
              <td style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <a href={api.invoices.pdfUrl(inv.id, 'az')} title="Fatura PDF">PDF</a>
                {(inv.status === 'DRAFT' || inv.status === 'SENT' || inv.status === 'OVERDUE') && (
                  <button className="ghost" onClick={() => void sendEmail(inv)}>E-posta Gönder</button>
                )}
                {inv.status === 'DRAFT' && (
                  <button onClick={() => void api.invoices.setStatus(inv.id, 'SENT').then(reload)}>Gönderildi</button>
                )}
                {(inv.status === 'SENT' || inv.status === 'OVERDUE') && (
                  <button onClick={() => void api.invoices.setStatus(inv.id, 'PAID').then(reload)}>Ödendi</button>
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
