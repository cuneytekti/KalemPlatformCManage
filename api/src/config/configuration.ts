export default () => ({
  // Üretimde 'false' yapıp migration'larla ilerleyin (README: Migration bölümü)
  dbSynchronize: process.env.DB_SYNCHRONIZE !== 'false',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://cmanage:cmanage@localhost:5432/cmanage',
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  docker: {
    // http://socket-proxy:2375 (üretim) — boşsa lokal /var/run/docker.sock
    hostUrl: process.env.DOCKER_HOST_URL ?? '',
  },
  tenant: {
    baseDomain: process.env.BASE_DOMAIN ?? 'localhost',
    apiImage: process.env.KALEM_API_IMAGE ?? 'kalem-api:local',
    webImage: process.env.KALEM_WEB_IMAGE ?? 'kalem-backoffice-web:local',
    dbHost: process.env.TENANT_DB_HOST ?? 'db',
    dbAdminUser: process.env.TENANT_DB_ADMIN_USER ?? 'cmanage',
    dbAdminPassword: process.env.TENANT_DB_ADMIN_PASSWORD ?? '',
    edgeNetwork: process.env.TENANT_EDGE_NETWORK ?? 'cmanage-edge',
    apiMemoryMb: parseInt(process.env.TENANT_API_MEMORY_MB ?? '768', 10),
    webMemoryMb: parseInt(process.env.TENANT_WEB_MEMORY_MB ?? '128', 10),
  },
  webhookSecret: process.env.WEBHOOK_SECRET ?? '',
  // PashaBank ECOMM sanal POS (mTLS). merchantHandler boşsa ödeme kapalı.
  pasha: {
    merchantHandler: process.env.PASHA_MERCHANT_HANDLER ?? '',
    clientHandler: process.env.PASHA_CLIENT_HANDLER ?? 'https://ecomm.pashabank.az:8463/ecomm2/ClientHandler',
    certPath: process.env.PASHA_CERT_PATH ?? '',
    keyPath: process.env.PASHA_KEY_PATH ?? '',
    keyPassphrase: process.env.PASHA_KEY_PASSPHRASE ?? '',
    mock: process.env.PASHA_MOCK === 'true',
  },
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'Kalem Platform <info@kalemyazilim.az>',
  },
  // Lead → Teklif dönüşümünde kullanılan varsayılan birim fiyatlar (aylık)
  defaultPrices: {
    user: process.env.DEFAULT_PRICE_USER ?? '15.00',
    pos: process.env.DEFAULT_PRICE_POS ?? '49.00',
    mobile: process.env.DEFAULT_PRICE_MOBILE ?? '19.00',
  },
  backup: {
    enabled: process.env.BACKUP_ENABLED !== 'false',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS ?? '14', 10),
  },
  // Fatura vadesi geçtikten N gün sonra tenant otomatik askıya alınır (0 = kapalı)
  autoSuspendOverdueDays: parseInt(process.env.AUTO_SUSPEND_OVERDUE_DAYS ?? '0', 10),
  // Panel JWT imza anahtarı — üretimde mutlaka güçlü bir değer verin
  jwtSecret: process.env.CMANAGE_JWT_SECRET ?? 'dev-only-secret-degistir',
  admin: {
    // Yalnız İLK açılışta, hiç kullanıcı yokken tohumlanır
    email: (process.env.CMANAGE_ADMIN_EMAIL ?? 'admin@kalemplatform.com').toLowerCase(),
    password: process.env.CMANAGE_ADMIN_PASSWORD ?? 'Admin@123-degistir',
  },
});
