import { auth, AuthUser } from './auth';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  contactEmail?: string;
  status: 'PENDING' | 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'FAILED' | 'DELETED';
  dbName?: string;
  licensedUsers: number;
  licensedPosTerminals: number;
  licensedMobileTerminals: number;
  erpType: string;
  createdAt: string;
  lastUsage?: { users?: number; posTerminals?: number; mobileTerminals?: number; fetchedAt?: string };
}

export interface SystemStats {
  containersRunning: number;
  containersTotal: number;
  images: number;
  cpus: number;
  memTotalMb: number;
  kalemContainers: { name: string; tenant: string; role: string; state: string }[];
}

export interface Invoice {
  id: string;
  tenantId: string;
  period: string;
  lines: { label: string; qty: number; unitPrice: string; total: string }[];
  total: string;
  currency: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
  dueDate?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  message?: string;
  config?: string;
  source: string;
  status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED';
  quoteId?: string;
  createdAt: string;
}

export interface AdminUserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface License {
  id: string;
  tenantId: string;
  seats: number;
  posTerminals: number;
  mobileTerminals: number;
  pricePerUser: string;
  pricePerPosTerminal: string;
  pricePerMobileTerminal: string;
  currency: string;
  validFrom: string;
  validUntil?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
}

export interface Quote {
  id: string;
  customerName: string;
  contactEmail?: string;
  seats: number;
  posTerminals: number;
  mobileTerminals: number;
  pricePerUser: string;
  pricePerPosTerminal: string;
  pricePerMobileTerminal: string;
  monthlyTotal: string;
  currency: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';
  tenantId?: string;
  notes?: string;
  createdAt: string;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = auth.getToken();
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    auth.clear();
    window.location.href = '/login';
    throw new Error('Oturum süresi doldu');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const msg = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new Error(msg ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<LoginResult>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<void>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },
  tenants: {
    list: () => request<Tenant[]>('/tenants'),
    get: (id: string) => request<Tenant>(`/tenants/${id}`),
    create: (data: Partial<Tenant>) =>
      request<Tenant>('/tenants', { method: 'POST', body: JSON.stringify(data) }),
    // EventSource başlık gönderemez; token query ile taşınır
    logStreamUrl: (id: string) =>
      `/api/tenants/${id}/logs?token=${encodeURIComponent(auth.getToken() ?? '')}`,
    retry: (id: string) => request<Tenant>(`/tenants/${id}/retry`, { method: 'POST' }),
    suspend: (id: string) => request<Tenant>(`/tenants/${id}/suspend`, { method: 'POST' }),
    resume: (id: string) => request<Tenant>(`/tenants/${id}/resume`, { method: 'POST' }),
    remove: (id: string, dropDatabase: boolean) =>
      request<Tenant>(`/tenants/${id}?dropDatabase=${dropDatabase}`, { method: 'DELETE' }),
    updateLicense: (id: string, data: {
      licensedUsers: number; licensedPosTerminals: number; licensedMobileTerminals: number;
    }) => request<Tenant>(`/tenants/${id}/license`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  system: {
    stats: () => request<SystemStats>('/system/stats'),
  },
  invoices: {
    list: () => request<Invoice[]>('/invoices'),
    generate: (period?: string) =>
      request<Invoice[]>(`/invoices/generate${period ? `?period=${period}` : ''}`, { method: 'POST' }),
    setStatus: (id: string, status: Invoice['status']) =>
      request<Invoice>(`/invoices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    pdfUrl: (id: string, lang: 'az' | 'tr' | 'en' = 'az') =>
      `/api/invoices/${id}/pdf?lang=${lang}&token=${encodeURIComponent(auth.getToken() ?? '')}`,
    send: (id: string, lang: 'az' | 'tr' | 'en' = 'az') =>
      request<Invoice>(`/invoices/${id}/send`, { method: 'POST', body: JSON.stringify({ lang }) }),
  },
  leads: {
    list: () => request<Lead[]>('/leads'),
    setStatus: (id: string, status: Lead['status']) =>
      request<Lead>(`/leads/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    convertToQuote: (id: string) =>
      request<Quote>(`/leads/${id}/convert-to-quote`, { method: 'POST' }),
  },
  users: {
    list: () => request<AdminUserInfo[]>('/auth/users'),
    create: (data: { email: string; name: string; password: string }) =>
      request<AdminUserInfo>('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/auth/users/${id}`, { method: 'DELETE' }),
  },
  licenses: {
    list: (tenantId?: string) =>
      request<License[]>(`/licenses${tenantId ? `?tenantId=${tenantId}` : ''}`),
    create: (data: Partial<License>) =>
      request<License>('/licenses', { method: 'POST', body: JSON.stringify(data) }),
    change: (id: string, data: { seats: number; posTerminals: number; mobileTerminals: number }) =>
      request<License>(`/licenses/${id}/change`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  quotes: {
    list: () => request<Quote[]>('/quotes'),
    create: (data: Partial<Quote>) =>
      request<Quote>('/quotes', { method: 'POST', body: JSON.stringify(data) }),
    setStatus: (id: string, status: Quote['status']) =>
      request<Quote>(`/quotes/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    pdfUrl: (id: string, lang: 'az' | 'tr' | 'en') =>
      `/api/quotes/${id}/pdf?lang=${lang}&token=${encodeURIComponent(auth.getToken() ?? '')}`,
    send: (id: string, lang: 'az' | 'tr' | 'en' = 'az') =>
      request<Quote>(`/quotes/${id}/send`, { method: 'POST', body: JSON.stringify({ lang }) }),
    convertToTenant: (id: string, slug: string) =>
      request<Tenant>(`/quotes/${id}/convert-to-tenant`, { method: 'POST', body: JSON.stringify({ slug }) }),
  },
};
