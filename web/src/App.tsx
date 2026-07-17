import { ReactNode } from 'react';
import {
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  LogOut,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldCheck,
  UserRoundCog,
} from 'lucide-react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { ConfirmProvider } from './components/Confirm';
import { ToastProvider } from './components/Toast';
import { auth } from './lib/auth';
import { ClientInfoPage } from './pages/ClientInfo';
import { DashboardPage } from './pages/Dashboard';
import { InvoicesPage } from './pages/Invoices';
import { LeadsPage } from './pages/Leads';
import { LicensesPage } from './pages/Licenses';
import { LoginPage } from './pages/Login';
import { QuotesPage } from './pages/Quotes';
import { SettingsPage } from './pages/Settings';
import { TenantDetailPage } from './pages/TenantDetail';
import { TenantsPage } from './pages/Tenants';
import { UsersPage } from './pages/Users';

function RequireAuth({ children }: { children: ReactNode }) {
  if (!auth.isLoggedIn()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const user = auth.getUser();

  function logout() {
    auth.clear();
    navigate('/login', { replace: true });
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            <img src="/kalem-logo.png" alt="" />
          </div>
          <div>
            <h1>CManage</h1>
            <span>Kalem Platform</span>
          </div>
        </div>
        <div className="nav-label">Yönetim</div>
        <nav>
          <NavLink to="/" end><BarChart3 size={18} /><span>Genel Bakış</span></NavLink>
          <NavLink to="/leads"><ClipboardList size={18} /><span>Başvurular</span></NavLink>
          <NavLink to="/client-info"><FileText size={18} /><span>Müşteri Bilgi Toplama</span></NavLink>
          <NavLink to="/quotes"><ScrollText size={18} /><span>Teklifler</span></NavLink>
          <NavLink to="/tenants"><Building2 size={18} /><span>Müşteriler</span></NavLink>
          <NavLink to="/licenses"><ShieldCheck size={18} /><span>Lisanslar</span></NavLink>
          <NavLink to="/invoices"><ReceiptText size={18} /><span>Faturalar</span></NavLink>
          <NavLink to="/users"><UserRoundCog size={18} /><span>Kullanıcılar</span></NavLink>
          <NavLink to="/settings"><Settings size={18} /><span>Ayarlar</span></NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-avatar">{user?.email?.slice(0, 1).toUpperCase() ?? 'K'}</div>
          <div className="user-copy">
            <strong>Panel Kullanıcısı</strong>
            <span>{user?.email}</span>
          </div>
          <button className="icon-button" onClick={logout} title="Çıkış yap" aria-label="Çıkış yap">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <section className="workspace">
        <div className="topbar">
          <div>
            <span className="topbar-kicker">Kalem Platform</span>
            <strong>Merkezi Yönetim Paneli</strong>
          </div>
          <div className="system-pill"><span /> Sistem aktif</div>
        </div>
        <main className="content">{children}</main>
      </section>
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AppRoutes />
      </ConfirmProvider>
    </ToastProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="*"
        element={
          <RequireAuth>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/client-info" element={<ClientInfoPage />} />
                <Route path="/tenants" element={<TenantsPage />} />
                <Route path="/tenants/:id" element={<TenantDetailPage />} />
                <Route path="/licenses" element={<LicensesPage />} />
                <Route path="/quotes" element={<QuotesPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
