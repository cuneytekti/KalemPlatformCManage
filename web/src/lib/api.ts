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
  lastUsage?: { users?: number; posTerminals?: number; mobileTerminals?: number; fetchedAt?: string; alerts?: UsageAlert[] };
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


export interface ClientInfo {
  id: string;
  presentationDate?: string;
  fullName: string;
  phone: string;
  email: string;
  position?: string;
  companyLegalName?: string;
  companyWebsite?: string;
  marketName?: string;
  headOfficeStreet?: string;
  headOfficeCity?: string;
  marketCity?: string;
  branchAddress?: string;
  mainActivity?: string;
  branchCount?: number;
  cashRegisterCount?: number;
  barcodeScannerCount?: number;
  scaleCount?: number;
  posTerminalCount?: number;
  computerCount?: number;
  hasServer?: boolean;
  branchesCentralSystem?: boolean;
  sendCommercialOffer?: boolean;
  offerSent: boolean;
  note?: string;
  status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED';
  quoteId?: string;
  createdAt: string;
}

export interface AdminUserInfo {
  totpEnabled?: boolean;
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface UsageAlert {
  dimension: 'users' | 'posTerminals' | 'mobileTerminals';
  used: number;
  limit: number;
  level: 'NEAR' | 'OVER' | 'DRIFT';
}

export interface TenantUsageAlerts {
  tenantId: string;
  slug: string;
  name: string;
  fetchedAt?: string;
  alerts: UsageAlert[];
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
  quoteNumber: string;
  customerName: string;
  contactName?: string;
  contactEmail?: string;
  seats: number;
  posTerminals: number;
  mobileTerminals: number;
  pricePerUser: string;
  pricePerPosTerminal: string;
  pricePerMobileTerminal: string;
  monthlyTotal: string;
  setupFee: string;
  discountType: 'NONE' | 'FIXED' | 'PERCENT';
  discountValue: string;
  setupNetTotal: string;
  firstYearTotal: string;
  projectDurationText: string;
  paymentTermsText: string;
  currency: string;
  status: QuoteStatus;
  sentLanguage?: QuoteLanguage;
  sentAt?: string;
  tenantId?: string;
  notes?: string;
  lastActivity?: QuoteActivity;
  createdAt: string;
}

export type QuoteLanguage = 'az' | 'tr' | 'en';
export type QuoteStatus = 'DRAFT' | 'SENT' | 'FOLLOW_UP' | 'MEETING' | 'NEGOTIATION' | 'ACCEPTED' | 'REJECTED';
export type QuoteActivityType = 'EMAIL_SENT' | 'PHONE_CALL' | 'VISIT' | 'MEETING' | 'NOTE' | 'STATUS_CHANGE';

export interface QuoteActivity {
  id: string;
  quoteId: string;
  type: QuoteActivityType;
  status?: QuoteStatus;
  note: string;
  activityAt: string;
  createdByEmail?: string;
  createdAt: string;
}

export interface MailSettings {
  enabled: boolean;
  host: string;
  port: number;
  security: 'AUTO' | 'TLS' | 'STARTTLS' | 'NONE';
  authEnabled: boolean;
  username: string;
  password?: string;
  passwordConfigured: boolean;
  fromName: string;
  fromEmail: string;
  source: 'ENV' | 'PANEL';
  updatedAt?: string;
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
    login: (email: string, password: string, totpCode?: string) =>
      request<LoginResult>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, totpCode }),
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
      applyAt?: 'now' | 'night';
    }) => request<Tenant>(`/tenants/${id}/license`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  usage: {
    alerts: () => request<TenantUsageAlerts[]>('/usage/alerts'),
    collect: () => request<{ collected: number; alerted: number }>('/usage/collect', { method: 'POST' }),
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
    convertToQuote: (id: string, data: Partial<Quote>) =>
      request<Quote>(`/leads/${id}/convert-to-quote`, { method: 'POST', body: JSON.stringify(data) }),
  },
  clientInfo: {
    list: () => request<ClientInfo[]>('/client-info'),
    create: (data: Partial<ClientInfo>) =>
      request<ClientInfo>('/client-info', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ClientInfo>) =>
      request<ClientInfo>(`/client-info/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    setStatus: (id: string, status: ClientInfo['status']) =>
      request<ClientInfo>(`/client-info/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    convertToQuote: (id: string, data: Partial<Quote>) =>
      request<Quote>(`/client-info/${id}/convert-to-quote`, { method: 'POST', body: JSON.stringify(data) }),
  },
  twoFactor: {
    setup: () => request<{ secret: string; otpauthUrl: string }>('/auth/2fa/setup', { method: 'POST' }),
    enable: (code: string) => request<void>('/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ code }) }),
    disable: (code: string) => request<void>('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ code }) }),
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
    setStatus: (id: string, status: QuoteStatus, note: string) =>
      request<Quote>(`/quotes/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) }),
    pdfUrl: (id: string, lang: QuoteLanguage) =>
      `/api/quotes/${id}/pdf?lang=${lang}&token=${encodeURIComponent(auth.getToken() ?? '')}`,
    send: (id: string, lang: QuoteLanguage = 'az') =>
      request<Quote>(`/quotes/${id}/send`, { method: 'POST', body: JSON.stringify({ lang }) }),
    activities: (id: string) => request<QuoteActivity[]>(`/quotes/${id}/activities`),
    addActivity: (id: string, data: { type: QuoteActivityType; status?: QuoteStatus; note: string; activityAt?: string }) =>
      request<QuoteActivity>(`/quotes/${id}/activities`, { method: 'POST', body: JSON.stringify(data) }),
    convertToTenant: (id: string, slug: string) =>
      request<Tenant>(`/quotes/${id}/convert-to-tenant`, { method: 'POST', body: JSON.stringify({ slug }) }),
  },
  settings: {
    getMail: () => request<MailSettings>('/settings/mail'),
    saveMail: (data: Omit<MailSettings, 'passwordConfigured' | 'source' | 'updatedAt'>) =>
      request<MailSettings>('/settings/mail', { method: 'PUT', body: JSON.stringify(data) }),
    testMail: (data: Omit<MailSettings, 'passwordConfigured' | 'source' | 'updatedAt'> & { recipient: string }) =>
      request<{ ok: true; message: string }>('/settings/mail/test', { method: 'POST', body: JSON.stringify(data) }),
  },
};
