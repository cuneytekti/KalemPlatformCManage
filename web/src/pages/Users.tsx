import { FormEvent, useEffect, useState } from 'react';
import { useConfirm } from '../components/Confirm';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/ui';
import { AdminUserInfo, api } from '../lib/api';
import { auth } from '../lib/auth';

export function UsersPage() {
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [error, setError] = useState('');
  const me = auth.getUser();
  const toast = useToast();
  const confirm = useConfirm();

  const reload = () => void api.users.list().then(setUsers).catch(() => setUsers([]));
  useEffect(reload, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      await api.users.create({
        email: String(form.get('email')),
        name: String(form.get('name')),
        password: String(form.get('password')),
      });
      (e.target as HTMLFormElement).reset();
      toast.success('Kullanıcı eklendi');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Erişim yönetimi"
        title="Panel Kullanıcıları"
        description="Yönetim paneline erişebilen yetkili kullanıcı hesaplarını yönetin."
      />
      <div className="card">
        <div className="section-heading">
          <div><h3>Yeni kullanıcı</h3><p>Kurumsal panel erişimi için güvenli bir kullanıcı hesabı oluşturun.</p></div>
        </div>
        <form className="inline" onSubmit={onCreate}>
          <label>Ad<input name="name" required maxLength={120} /></label>
          <label>E-posta<input name="email" type="email" required /></label>
          <label>Şifre<input name="password" type="password" required minLength={10} /></label>
          <button>Kullanıcı Ekle</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
      <div className="table-wrap"><table>
        <thead><tr><th>Ad</th><th>E-posta</th><th>Rol</th><th>Kayıt</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td><span className={`badge ${u.totpEnabled ? 'ACTIVE' : 'PENDING'}`}>{u.totpEnabled ? 'Etkin' : 'Kapalı'}</span></td>
              <td>{new Date(u.createdAt).toLocaleDateString('tr-TR')}</td>
              <td>
                {u.id !== me?.id && (
                  <button
                    className="danger"
                    onClick={() => {
                      void confirm({
                        title: 'Kullanıcı Silme',
                        message: `${u.email} panel erişimini kaybedecek.`,
                        confirmLabel: 'Sil',
                        danger: true,
                      }).then((ok) => {
                        if (!ok) return;
                        void api.users.remove(u.id)
                          .then(() => { toast.success('Kullanıcı silindi'); reload(); })
                          .catch((e: Error) => toast.error(e.message));
                      });
                    }}
                  >
                    Sil
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}
