import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Spinner } from '../components/ui';
import { api, SystemStats, Tenant, TenantUsageAlerts } from '../lib/api';

const DIM_TR = { users: 'Kullanıcı', posTerminals: 'POS kasa', mobileTerminals: 'Mobil terminal' } as const;
const LEVEL_TR = { NEAR: 'limite yaklaştı', OVER: 'limit aşıldı', DRIFT: 'reconfigure gerekli' } as const;

export function DashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [usageAlerts, setUsageAlerts] = useState<TenantUsageAlerts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api.tenants.list().then(setTenants).catch(() => setTenants([]));
    void api.usage.alerts().then(setUsageAlerts).catch(() => setUsageAlerts([]));
    void api.system.stats().then(setStats).catch(() => setStats(null)).finally(() => setLoading(false));
  }, []);

  const count = (status: Tenant['status']) => tenants.filter((t) => t.status === status).length;
  const totalSeats = tenants
    .filter((t) => t.status !== 'DELETED')
    .reduce((sum, t) => sum + t.licensedUsers, 0);

  return (
    <>
      <PageHeader
        eyebrow="Operasyon merkezi"
        title="Genel Bakış"
        description="Müşteri operasyonlarını, lisans kapasitesini ve sistem sağlığını tek ekrandan takip edin."
      />
      {loading && <Spinner />}
      <div className="card stats">
        <div className="stat"><div className="num">{tenants.filter((t) => t.status !== 'DELETED').length}</div><div className="label">Toplam Müşteri</div></div>
        <div className="stat"><div className="num">{count('ACTIVE')}</div><div className="label">Aktif</div></div>
        <div className="stat"><div className="num">{count('PROVISIONING') + count('PENDING')}</div><div className="label">Kuruluyor</div></div>
        <div className="stat"><div className="num">{count('FAILED')}</div><div className="label">Hatalı</div></div>
        <div className="stat"><div className="num">{totalSeats}</div><div className="label">Toplam Kullanıcı Lisansı</div></div>
      </div>
      {usageAlerts.length > 0 && (
        <div className="card">
          <div className="section-heading">
            <div><h3>Lisans Uyarıları</h3><p>Kapasite sınırına yaklaşan veya yeniden yapılandırılması gereken müşteriler.</p></div>
          </div>
          <div className="table-wrap"><table>
            <thead><tr><th>Müşteri</th><th>Boyut</th><th>Kullanım</th><th>Durum</th><th>Son ölçüm</th></tr></thead>
            <tbody>
              {usageAlerts.flatMap((t) =>
                t.alerts.map((a, i) => (
                  <tr key={`${t.tenantId}-${a.dimension}-${a.level}`}>
                    {i === 0 && (
                      <td rowSpan={t.alerts.length}>
                        <Link to={`/tenants/${t.tenantId}`}>{t.name}</Link>
                      </td>
                    )}
                    <td>{DIM_TR[a.dimension]}</td>
                    <td>{a.used}/{a.limit}</td>
                    <td><span className={`badge ${a.level === 'NEAR' ? 'PENDING' : 'FAILED'}`}>{LEVEL_TR[a.level]}</span></td>
                    {i === 0 && (
                      <td rowSpan={t.alerts.length} className="muted">
                        {t.fetchedAt ? new Date(t.fetchedAt).toLocaleString('tr-TR') : '-'}
                      </td>
                    )}
                  </tr>
                )),
              )}
            </tbody>
          </table></div>
        </div>
      )}
      {stats && (
        <>
          <div className="card stats">
            <div className="stat"><div className="num">{stats.containersRunning}/{stats.containersTotal}</div><div className="label">Çalışan Container</div></div>
            <div className="stat"><div className="num">{stats.cpus}</div><div className="label">CPU</div></div>
            <div className="stat"><div className="num">{(stats.memTotalMb / 1024).toFixed(1)} GB</div><div className="label">Toplam RAM</div></div>
            <div className="stat"><div className="num">{stats.images}</div><div className="label">İmaj</div></div>
          </div>
          {stats.kalemContainers.length > 0 && (
            <div className="table-wrap"><table>
              <thead><tr><th>Container</th><th>Müşteri</th><th>Rol</th><th>Durum</th></tr></thead>
              <tbody>
                {stats.kalemContainers.map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td>{c.tenant}</td>
                    <td>{c.role}</td>
                    <td><span className={`badge ${c.state === 'running' ? 'ACTIVE' : 'FAILED'}`}>{c.state}</span></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </>
      )}
    </>
  );
}
