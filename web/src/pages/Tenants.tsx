import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { EmptyState, Spinner } from '../components/ui';
import { api, Tenant } from '../lib/api';

export function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    void api.tenants.list().then(setTenants).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const tenant = await api.tenants.create({
        name: String(form.get('name')),
        slug: String(form.get('slug')),
        contactEmail: String(form.get('contactEmail')) || undefined,
        licensedUsers: Number(form.get('licensedUsers')) || 5,
        licensedPosTerminals: Number(form.get('licensedPosTerminals')) || 1,
        licensedMobileTerminals: Number(form.get('licensedMobileTerminals')) || 0,
        erpType: String(form.get('erpType')),
      });
      toast.success(`${tenant.slug} kurulumu başlatıldı`);
      navigate(`/tenants/${tenant.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>Müşteriler</h2>
      <div className="card">
        <form className="inline" onSubmit={onCreate}>
          <label>Firma adı<input name="name" required maxLength={120} /></label>
          <label>Subdomain<input name="slug" required pattern="[a-z][a-z0-9-]{2,30}" placeholder="musteri1" /></label>
          <label>E-posta<input name="contactEmail" type="email" /></label>
          <label>Kullanıcı<input name="licensedUsers" type="number" defaultValue={5} min={1} max={1000} /></label>
          <label>POS Kasa<input name="licensedPosTerminals" type="number" defaultValue={1} min={1} max={200} /></label>
          <label>Mobil Terminal<input name="licensedMobileTerminals" type="number" defaultValue={0} min={0} max={500} /></label>
          <label>ERP
            <select name="erpType" defaultValue="STANDALONE">
              <option value="STANDALONE">Bağımsız</option>
              <option value="LOGO_TIGER">Logo Tiger</option>
              <option value="NETSIS">Netsis</option>
              <option value="GENERIC_REST">Generic REST</option>
            </select>
          </label>
          <button disabled={busy}>{busy ? 'Kuruluyor…' : 'Müşteri Kur'}</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
      {loading ? (
        <Spinner />
      ) : tenants.length === 0 ? (
        <EmptyState message="Henüz müşteri yok. Yukarıdaki formdan ilk kurulumu başlatın." />
      ) : (
      <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Firma</th><th>Subdomain</th><th>Durum</th><th>Kullanıcı</th><th>Kasa</th><th>Mobil</th><th>ERP</th><th>Kayıt</th></tr>
        </thead>
        <tbody>
          {tenants.map((t) => (
            <tr key={t.id}>
              <td><Link to={`/tenants/${t.id}`}>{t.name}</Link></td>
              <td>{t.slug}</td>
              <td><span className={`badge ${t.status}`}>{t.status}</span></td>
              <td>{t.licensedUsers}</td>
              <td>{t.licensedPosTerminals}</td>
              <td>{t.licensedMobileTerminals}</td>
              <td>{t.erpType}</td>
              <td>{new Date(t.createdAt).toLocaleDateString('tr-TR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      )}
    </>
  );
}
