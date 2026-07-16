import { FormEvent, useEffect, useState } from 'react';
import { useToast } from '../components/Toast';
import { EmptyState, PageHeader } from '../components/ui';
import { api, License, Tenant } from '../lib/api';

export function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<License | null>(null);
  const [editValues, setEditValues] = useState({ seats: 1, posTerminals: 1, mobileTerminals: 0 });
  const toast = useToast();

  const reload = () => {
    void api.licenses.list().then(setLicenses).catch(() => setLicenses([]));
    void api.tenants.list().then(setTenants).catch(() => setTenants([]));
  };
  useEffect(reload, []);

  const tenantName = (id: string) => tenants.find((t) => t.id === id)?.name ?? id.slice(0, 8);

  function openChange(l: License) {
    setEditing(l);
    setEditValues({ seats: l.seats, posTerminals: l.posTerminals, mobileTerminals: l.mobileTerminals });
  }

  async function onChange() {
    if (!editing) return;
    try {
      await api.licenses.change(editing.id, editValues);
      toast.success('Lisans güncellendi — dönemin taslak faturası pro-rata yeniden hesaplandı');
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      await api.licenses.create({
        tenantId: String(form.get('tenantId')),
        seats: Number(form.get('seats')),
        posTerminals: Number(form.get('posTerminals')),
        mobileTerminals: Number(form.get('mobileTerminals')),
        pricePerUser: String(form.get('pricePerUser')),
        pricePerPosTerminal: String(form.get('pricePerPosTerminal')),
        pricePerMobileTerminal: String(form.get('pricePerMobileTerminal')) || '0',
        currency: String(form.get('currency')),
        validFrom: String(form.get('validFrom')),
      });
      (e.target as HTMLFormElement).reset();
      toast.success('Lisans oluşturuldu');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Kapasite yönetimi"
        title="Lisanslar"
        description="Müşteri lisanslarını, kullanım kapasitesini ve dönemsel fiyatlandırmayı yönetin."
      />
      <div className="card">
        <div className="section-heading">
          <div><h3>Yeni lisans tanımı</h3><p>Müşteri kapasitesini ve geçerli birim fiyatları belirleyin.</p></div>
        </div>
        <form className="inline" onSubmit={onCreate}>
          <label>Müşteri
            <select name="tenantId" required>
              {tenants.filter((t) => t.status !== 'DELETED').map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <label>Kullanıcı<input name="seats" type="number" defaultValue={5} min={1} max={1000} /></label>
          <label>Kasa<input name="posTerminals" type="number" defaultValue={1} min={1} max={200} /></label>
          <label>Mobil<input name="mobileTerminals" type="number" defaultValue={0} min={0} max={500} /></label>
          <label>Kullanıcı ₼<input name="pricePerUser" required placeholder="15.00" /></label>
          <label>Kasa ₼<input name="pricePerPosTerminal" required placeholder="49.00" /></label>
          <label>Mobil ₼<input name="pricePerMobileTerminal" placeholder="19.00" /></label>
          <label>Para birimi
            <select name="currency" defaultValue="AZN">
              <option>AZN</option><option>TRY</option><option>USD</option><option>EUR</option>
            </select>
          </label>
          <label>Başlangıç<input name="validFrom" type="date" required /></label>
          <button>Lisans Oluştur</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
      {licenses.length === 0 ? (
        <EmptyState message="Henüz lisans kaydı yok. Faturalama için her aktif müşteriye lisans tanımlayın." />
      ) : (
      <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Müşteri</th><th>Kullanıcı</th><th>Kasa</th><th>Mobil</th>
            <th>Birim (K/Ka/M)</th><th>Başlangıç</th><th>Bitiş</th><th>Durum</th><th></th>
          </tr>
        </thead>
        <tbody>
          {licenses.map((l) => (
            <tr key={l.id}>
              <td>{tenantName(l.tenantId)}</td>
              <td>{l.seats}</td>
              <td>{l.posTerminals}</td>
              <td>{l.mobileTerminals}</td>
              <td className="muted">{l.pricePerUser} / {l.pricePerPosTerminal} / {l.pricePerMobileTerminal} {l.currency}</td>
              <td>{l.validFrom}</td>
              <td>{l.validUntil ?? 'Süresiz'}</td>
              <td><span className={`badge ${l.status}`}>{l.status}</span></td>
              <td>
                {l.status === 'ACTIVE' && (
                  <button className="ghost" onClick={() => openChange(l)}>Değiştir</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      )}
      {editing && (
        <div className="modal-backdrop" onMouseDown={() => setEditing(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="license-edit-title" onMouseDown={(e) => e.stopPropagation()}>
            <span className="page-eyebrow">Kapasite güncelleme</span>
            <h3 id="license-edit-title">{tenantName(editing.tenantId)} lisansı</h3>
            <p>Yeni terminal ve kullanıcı adetleri mevcut faturalama dönemine uygulanacaktır.</p>
            <form className="form-sections" onSubmit={(e) => { e.preventDefault(); void onChange(); }}>
              <div className="form-grid">
                <label className="field">Kullanıcı
                  <input type="number" min={1} max={1000} value={editValues.seats}
                    onChange={(e) => setEditValues({ ...editValues, seats: Number(e.target.value) })} />
                </label>
                <label className="field">POS Kasa
                  <input type="number" min={1} max={200} value={editValues.posTerminals}
                    onChange={(e) => setEditValues({ ...editValues, posTerminals: Number(e.target.value) })} />
                </label>
                <label className="field">Mobil Terminal
                  <input type="number" min={0} max={500} value={editValues.mobileTerminals}
                    onChange={(e) => setEditValues({ ...editValues, mobileTerminals: Number(e.target.value) })} />
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={() => setEditing(null)}>Vazgeç</button>
                <button type="submit">Lisansı Güncelle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
