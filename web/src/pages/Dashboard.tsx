import { useEffect, useState } from 'react';
import { Spinner } from '../components/ui';
import { api, SystemStats, Tenant } from '../lib/api';

export function DashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api.tenants.list().then(setTenants).catch(() => setTenants([]));
    void api.system.stats().then(setStats).catch(() => setStats(null)).finally(() => setLoading(false));
  }, []);

  const count = (status: Tenant['status']) => tenants.filter((t) => t.status === status).length;
  const totalSeats = tenants
    .filter((t) => t.status !== 'DELETED')
    .reduce((sum, t) => sum + t.licensedUsers, 0);

  return (
    <>
      <h2>Genel Bakış</h2>
      {loading && <Spinner />}
      <div className="card stats">
        <div className="stat"><div className="num">{tenants.filter((t) => t.status !== 'DELETED').length}</div><div className="label">Toplam Müşteri</div></div>
        <div className="stat"><div className="num">{count('ACTIVE')}</div><div className="label">Aktif</div></div>
        <div className="stat"><div className="num">{count('PROVISIONING') + count('PENDING')}</div><div className="label">Kuruluyor</div></div>
        <div className="stat"><div className="num">{count('FAILED')}</div><div className="label">Hatalı</div></div>
        <div className="stat"><div className="num">{totalSeats}</div><div className="label">Toplam Kullanıcı Lisansı</div></div>
      </div>
      {stats && (
        <>
          <div className="card stats">
            <div className="stat"><div className="num">{stats.containersRunning}/{stats.containersTotal}</div><div className="label">Çalışan Container</div></div>
            <div className="stat"><div className="num">{stats.cpus}</div><div className="label">CPU</div></div>
            <div className="stat"><div className="num">{(stats.memTotalMb / 1024).toFixed(1)} GB</div><div className="label">Toplam RAM</div></div>
            <div className="stat"><div className="num">{stats.images}</div><div className="label">İmaj</div></div>
          </div>
          {stats.kalemContainers.length > 0 && (
            <table>
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
            </table>
          )}
        </>
      )}
    </>
  );
}
