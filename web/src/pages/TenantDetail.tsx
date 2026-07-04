import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfirm } from '../components/Confirm';
import { useToast } from '../components/Toast';
import { Spinner } from '../components/ui';
import { api, Tenant } from '../lib/api';

export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const reload = () => {
    if (!id) return;
    void api.tenants
      .get(id)
      .then(setTenant)
      .catch(() => setTenant(null))
      .finally(() => setLoading(false));
  };
  useEffect(reload, [id]);

  const busyStatus = tenant?.status === 'PENDING' || tenant?.status === 'PROVISIONING';

  useEffect(() => {
    if (!id || !busyStatus) return;
    const source = new EventSource(api.tenants.logStreamUrl(id));
    source.onmessage = (event) => setLogs((prev) => [...prev, String(event.data)]);
    const poll = setInterval(reload, 5000);
    return () => {
      source.close();
      clearInterval(poll);
    };
  }, [id, busyStatus]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [logs]);

  async function run(action: () => Promise<unknown>, successMessage: string) {
    try {
      await action();
      toast.success(successMessage);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function onLicenseSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    const form = new FormData(e.currentTarget);
    const ok = await confirm({
      title: 'Lisans Güncelleme',
      message: 'Container\'lar yeni limitlerle yeniden oluşturulacak (kısa kesinti). Devam edilsin mi?',
      confirmLabel: 'Güncelle',
    });
    if (!ok) return;
    await run(
      () =>
        api.tenants.updateLicense(id, {
          licensedUsers: Number(form.get('users')),
          licensedPosTerminals: Number(form.get('pos')),
          licensedMobileTerminals: Number(form.get('mobile')),
        }),
      'Yeniden yapılandırma kuyruğa alındı',
    );
  }

  async function onDelete() {
    if (!id || !tenant) return;
    const ok = await confirm({
      title: 'Tenant Silme',
      message: `${tenant.slug} kaldırılacak: container'lar silinir, subdomain kapanır.\nBu işlem geri alınamaz.`,
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;
    const dropDb = await confirm({
      title: 'Veritabanı',
      message: 'Müşteri veritabanı da silinsin mi?\n"Koru" derseniz DB yedek/arşiv için sunucuda kalır.',
      confirmLabel: 'DB\'yi de Sil',
      danger: true,
    });
    try {
      await api.tenants.remove(id, dropDb);
      toast.success('Tenant kaldırıldı');
      navigate('/tenants');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  if (loading) return <Spinner />;
  if (!tenant || !id) return <p className="error">Tenant bulunamadı.</p>;

  return (
    <>
      <h2>
        {tenant.name} <span className={`badge ${tenant.status}`}>{tenant.status}</span>
      </h2>

      <div className="card">
        <p>
          <strong>Adres:</strong>{' '}
          <a href={`https://${tenant.slug}.kalemplatform.com`} target="_blank" rel="noreferrer">
            {tenant.slug}.kalemplatform.com
          </a>
          {tenant.licensedMobileTerminals > 0 && (
            <> · <span className="muted">mobil: {tenant.slug}-mt.kalemplatform.com</span></>
          )}
        </p>
        <p><strong>Veritabanı:</strong> {tenant.dbName ?? '—'} · <strong>ERP:</strong> {tenant.erpType}</p>
        <p>
          <strong>Lisans:</strong> {tenant.licensedUsers} kullanıcı · {tenant.licensedPosTerminals} kasa ·{' '}
          {tenant.licensedMobileTerminals} mobil terminal
        </p>
        {tenant.lastUsage?.fetchedAt && (
          <p className="muted">
            Kullanım ({new Date(tenant.lastUsage.fetchedAt).toLocaleString('tr-TR')}):{' '}
            {tenant.lastUsage.users ?? '?'} kullanıcı · {tenant.lastUsage.posTerminals ?? '?'} kasa ·{' '}
            {tenant.lastUsage.mobileTerminals ?? '?'} mobil
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {tenant.status === 'ACTIVE' && (
            <button onClick={() => void run(() => api.tenants.suspend(id), 'Tenant askıya alındı')}>
              Askıya Al
            </button>
          )}
          {tenant.status === 'SUSPENDED' && (
            <button onClick={() => void run(() => api.tenants.resume(id), 'Tenant devam ettirildi')}>
              Devam Ettir
            </button>
          )}
          {tenant.status === 'FAILED' && (
            <button onClick={() => void run(() => api.tenants.retry(id), 'Kurulum yeniden kuyruğa alındı')}>
              Kurulumu Yeniden Dene
            </button>
          )}
          {tenant.status !== 'DELETED' && (
            <button className="danger" onClick={() => void onDelete()}>Sil</button>
          )}
        </div>
      </div>

      {(tenant.status === 'ACTIVE' || tenant.status === 'SUSPENDED') && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Lisans Güncelle</h3>
          <form className="inline" onSubmit={onLicenseSubmit}>
            <label>Kullanıcı<input name="users" type="number" defaultValue={tenant.licensedUsers} min={1} max={1000} /></label>
            <label>POS Kasa<input name="pos" type="number" defaultValue={tenant.licensedPosTerminals} min={1} max={200} /></label>
            <label>Mobil Terminal<input name="mobile" type="number" defaultValue={tenant.licensedMobileTerminals} min={0} max={500} /></label>
            <button>Güncelle ve Yeniden Yapılandır</button>
          </form>
          <p className="muted" style={{ marginBottom: 0 }}>
            Yeni limitler KALEM_MAX_* ortam değişkenleriyle container'lara uygulanır.
          </p>
        </div>
      )}

      <h3>Kurulum / Yapılandırma Logu</h3>
      <div className="logbox" ref={logRef}>
        {logs.length > 0 ? logs.join('\n') : 'Canlı log bekleniyor… (kurulum/yeniden yapılandırma sırasında akar)'}
      </div>
    </>
  );
}
