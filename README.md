# CManage — Kalem Platform Yönetim ve Orkestrasyon Paneli

SaaS satışlarını otomatize eden orkestrasyon merkezi: müşteri başına izole
Kalem Platform container'ı + izole PostgreSQL veritabanı kurar, Traefik ile
`<musteri>.kalemplatform.com` subdomain'ini gerçek zamanlı açar, lisans ve
fiyat tekliflerini yönetir.

## Mimari

- **Tenancy:** container-per-tenant + database-per-tenant (paylaşılan PG sunucusu)
- **Reverse proxy:** Traefik v3, Docker etiketleriyle otomatik rota + wildcard TLS (DNS-01)
- **Backend:** NestJS + TypeORM + BullMQ (Redis) + dockerode; Docker erişimi socket-proxy üzerinden
- **Frontend:** React 19 + Vite + TypeScript (nginx)

## Geliştirme

```bash
# Backend
cd api && npm install && npm run start:dev     # http://localhost:3000/api

# Frontend
cd web && npm install && npm run dev           # http://localhost:5173 (/api proxy'li)
```

## Üretim

```bash
cp .env.example .env   # düzenleyin
docker compose up -d --build
```

## Provisioning akışı

Satış webhook'u veya panelden müşteri ekleme →
`CREATE DATABASE` + tenant DB kullanıcısı → JWT secret üretimi →
kalem-api container (tenant ağı) → kalem-backoffice-web container
(Traefik etiketleri: `Host(\`slug.BASE_DOMAIN\`)`) → healthcheck → ACTIVE.
Canlı kurulum logları SSE ile panele akar.

## PDF üretimi (teklif)

`playwright-core` kullanılır (npm install'da tarayıcı İNDİRMEZ).
PDF özelliğini kullanmak için bir kez Chromium kurun:

```bash
cd api && npx playwright-core install --with-deps chromium
```

Üretim imajı için aynı satır `api/Dockerfile`'a eklenmelidir
(imaj ~800MB büyür; istenirse PDF ayrı bir worker imajına taşınabilir).

## Migration'a geçiş (üretim)

Geliştirmede şema `synchronize` ile otomatik güncellenir. Üretimde:

İlk migration üretildi: `api/src/migrations/1783437410857-InitialSchema.ts`
(uuid-ossp eklentisi dahil). Üretimde `.env` içinde `DB_SYNCHRONIZE=false`
bırakın — uygulama açılışta migration'ları otomatik çalıştırır.

Şema değişikliğinde yeni migration üretmek için:

```bash
cd api
DATABASE_URL=postgres://... npm run migration:generate
```

## Test & CI

```bash
cd api && npm test        # birim testleri (jest)
```

GitHub Actions (`.github/workflows/ci.yml`): API test+build, Web build,
Docker imaj build kontrolü.

## Güvenlik notları

- Rate limit: genel 120 istek/dk, login 5 deneme/dk
- helmet güvenlik başlıkları, pino yapılandırılmış JSON log
  (authorization/cookie başlıkları redakte edilir)
- Health: `GET /api/health` (auth'suz; db+redis durumu)

## Yol haritası / TODO

- [x] Panel kimlik doğrulaması (JWT, scrypt şifre, ilk admin tohumlama) — 2FA sonraya
- [x] Teklif PDF üretimi (az/tr/en, Playwright HTML→PDF)
- [x] Tenant suspend/resume/delete/retry + lisans reconfigure akışları
- [x] Lisans kullanım toplayıcı (saatlik; Kalem /internal/license bekleniyor)
- [x] Aylık fatura üretimi (cron + manuel) — pro-rata TODO
- [x] Audit log + admin kullanıcı yönetimi + sistem metrikleri
- [x] Migration altyapısı hazır (data-source.ts + DB_SYNCHRONIZE); ilk migration üretimi kaldı
- [ ] Kalem API tarafı: KALEM_MAX_* zorlaması + /internal/license endpoint'i (Faz 2)
- [ ] Fatura PDF + e-posta gönderimi (SMTP)
- [ ] Satış web sitesi + ödeme entegrasyonu (Faz 4)
- [ ] Çoklu host desteği (yerleştirme stratejisi)

## Satış web sitesi (website/)

`kalemplatform.com` için üç dilli (az/tr/en) statik pazarlama sitesi:
nginx container'ı, Traefik üzerinden kök domain + www yayını
(www → kök yönlendirmeli). Özellikler: üç boyutlu fiyat hesaplayıcı
(kullanıcı/kasa/mobil — birim fiyatlar `website/app.js` → `CONFIG.prices`),
demo başvuru formu (`CONFIG.leadEndpoint` doldurulursa POST, boşsa mailto),
KalemPlatformv1 işlevselliğine dayalı içerik (POS, offline, zincir mağaza,
Logo Tiger/Netsis, NBASoft, e-kassa).

Logo: `website/assets/logo.svg` vektörel yeniden çizimdir; orijinal logo
dosyalarınızı aynı isimle bu klasöre koyarak değiştirebilirsiniz.

Lokal önizleme: `cd website && python3 -m http.server 8090`
