import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { EmptyState, PageHeader, Spinner } from '../components/ui';
import { api, Lead } from '../lib/api';

const NEXT: Record<Lead['status'], { to: Lead['status']; label: string }[]> = {
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

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  const reload = () =>
    void api.leads.list().then(setLeads).catch(() => setLeads([])).finally(() => setLoading(false));
  useEffect(reload, []);

  function convert() {
    navigate('/quotes');
  }

  async function move(lead: Lead, to: Lead['status']) {
    try {
      await api.leads.setStatus(lead.id, to);
      toast.success(`${lead.company} → ${to}`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Satış operasyonları"
        title="Başvurular"
        description="Web sitesi demo formundan gelen satış taleplerini takip edin ve teklif sürecine taşıyın."
      />
      {loading ? (
        <Spinner />
      ) : leads.length === 0 ? (
        <EmptyState message="Henüz başvuru yok. Web sitesindeki demo formu buraya düşer." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Şirket</th><th>İlgili</th><th>İletişim</th>
                <th>Konfigürasyon</th><th>Mesaj</th><th>Tarih</th><th>Durum</th><th></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td><strong>{l.company}</strong></td>
                  <td>{l.name}</td>
                  <td>
                    <a href={`mailto:${l.email}`}>{l.email}</a>
                    {l.phone && <div className="muted">{l.phone}</div>}
                  </td>
                  <td className="muted">{l.config ?? '—'}</td>
                  <td className="muted" style={{ maxWidth: 220 }}>{l.message ?? '—'}</td>
                  <td>{new Date(l.createdAt).toLocaleDateString('tr-TR')}</td>
                  <td>
                    <span className={`badge ${l.status === 'CONVERTED' ? 'ACTIVE' : l.status === 'CLOSED' ? 'FAILED' : l.status === 'NEW' ? 'PENDING' : 'SENT'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td><div className="action-cell">
                    {!l.quoteId && l.status !== 'CLOSED' && (
                      <button onClick={convert}>Tekliflere Git</button>
                    )}
                    {l.quoteId && <span className="badge SENT">Teklif ✓</span>}
                    {NEXT[l.status].map((n) => (
                      <button key={n.to} className="ghost" onClick={() => void move(l, n.to)}>{n.label}</button>
                    ))}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
