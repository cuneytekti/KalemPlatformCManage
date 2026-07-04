import { ReactNode } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { ConfirmProvider } from './components/Confirm';
import { ToastProvider } from './components/Toast';
import { auth } from './lib/auth';
import { DashboardPage } from './pages/Dashboard';
import { InvoicesPage } from './pages/Invoices';
import { LicensesPage } from './pages/Licenses';
import { LoginPage } from './pages/Login';
import { QuotesPage } from './pages/Quotes';
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
        <h1>CManage</h1>
        <nav>
          <NavLink to="/" end>Genel Bakış</NavLink>
          <NavLink to="/tenants">Müşteriler</NavLink>
          <NavLink to="/licenses">Lisanslar</NavLink>
          <NavLink to="/quotes">Teklifler</NavLink>
          <NavLink to="/invoices">Faturalar</NavLink>
          <NavLink to="/users">Kullanıcılar</NavLink>
        </nav>
        <div className="sidebar-footer">
          <span className="muted">{user?.email}</span>
          <button className="ghost" onClick={logout}>Çıkış</button>
        </div>
      </aside>
      <main className="content">{children}</main>
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
                <Route path="/tenants" element={<TenantsPage />} />
                <Route path="/tenants/:id" element={<TenantDetailPage />} />
                <Route path="/licenses" element={<LicensesPage />} />
                <Route path="/quotes" element={<QuotesPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
