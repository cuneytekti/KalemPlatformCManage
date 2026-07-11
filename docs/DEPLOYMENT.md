# CManage — VPS Kurulum Rehberi (Üretim)

Tek VPS üzerinde tam kurulum: Traefik + wildcard TLS + CManage paneli +
satış sitesi + tenant orkestrasyonu. Tahmini süre: 30-45 dk.

## Gereksinimler

- Ubuntu 22.04+ VPS (öneri: 8 GB RAM / 4 vCPU / 160 GB disk — ~30-35 tenant)
- `kalemplatform.com` DNS'inin Cloudflare'de yönetiliyor olması
- GHCR'de yayınlanmış `kalem-api` ve `kalem-backoffice-web` imajları
  (KalemPlatformDev'deki `ghcr.yml` workflow'u — bkz. README "Üretim")

## 1. DNS (Cloudflare)

| Kayıt | Tip | Değer | Proxy |
|---|---|---|---|
| `kalemplatform.com` | A | VPS IP | DNS only (gri) |
| `www` | A | VPS IP | DNS only |
| `panel` | A | VPS IP | DNS only |
| `*` (wildcard) | A | VPS IP | DNS only |

> Proxy'yi (turuncu bulut) kapalı tutun: TLS'i Traefik üretir (DNS-01),
> tenant subdomain'leri Cloudflare proxy'siz doğrudan VPS'e gelir.

**API Token:** Cloudflare → My Profile → API Tokens → Create Token →
"Edit zone DNS" şablonu → Zone: `kalemplatform.com`. Çıkan token `.env`'de
`CF_DNS_API_TOKEN` olur (DNS-01 wildcard sertifika için).

## 2. VPS temel kurulum

```bash
# Docker (resmî script)
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER   # yeniden giriş gerekir

# Güvenlik duvarı: yalnız SSH + HTTP(S)
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
```

## 3. GHCR erişimi

Private imajları çekmek için GitHub'da **read:packages** izinli bir
classic PAT üretin (Settings → Developer settings → Tokens):

```bash
echo <PAT> | docker login ghcr.io -u cuneytekti --password-stdin
```

## 4. Uygulama kurulumu

```bash
git clone https://github.com/cuneytekti/KalemPlatformCManage.git /opt/cmanage
cd /opt/cmanage
cp .env.example .env
```

`.env`'de doldurulması zorunlu alanlar:

| Değişken | Not |
|---|---|
| `CF_DNS_API_TOKEN` | Adım 1'deki token |
| `CMANAGE_DB_PASSWORD` | `openssl rand -base64 24` |
| `WEBHOOK_SECRET` | `openssl rand -base64 32` — satış sitesi webhook imzası |
| `CMANAGE_JWT_SECRET` | `openssl rand -base64 48` |
| `CMANAGE_ADMIN_PASSWORD` | İlk girişten sonra panelden değiştirin |
| `KALEM_API_IMAGE` / `KALEM_WEB_IMAGE` | GHCR imaj adresleri (tag sabitleme önerilir, örn. `:sha-<commit>`) |

`DB_SYNCHRONIZE` **false kalmalı** — şema, açılışta otomatik çalışan
migration'larla kurulur.

```bash
docker compose up -d --build
docker compose logs -f api   # "Nest application successfully started" bekleyin
```

## 5. Doğrulama

```bash
./scripts/smoke-test.sh              # otomatik uçtan uca test (aşağıya bakın)
```

Elle kontrol:

1. `https://kalemplatform.com` → satış sitesi (TLS geçerli, www → kök yönlenir)
2. `https://panel.kalemplatform.com` → panel login; admin e-posta/şifre ile girin
3. Panel → Tenants → yeni tenant oluşturun (örn. slug `demo`) → kurulum
   loglarını canlı izleyin → durum ACTIVE olmalı
4. `https://demo.kalemplatform.com` → tenant backoffice açılmalı
5. Panelde suspend → subdomain erişilemez olmalı → resume → geri gelmeli

## 6. İşletme notları

- **Yedekleme (Sprint 6'da otomatikleşecek):**
  `docker exec cmanage-db pg_dumpall -U cmanage | gzip > yedek-$(date +%F).sql.gz`
- **Güncelleme:** `git pull && docker compose up -d --build`
  (migration'lar açılışta otomatik uygulanır)
- **Traefik dashboard** varsayılan kapalıdır; ihtiyaç halinde geçici olarak
  SSH tüneliyle açın, kalıcı yayınlamayın.
- Sistem metrikleri (CPU/RAM/disk) panelin Dashboard sayfasında.

## Sorun giderme

| Belirti | Muhtemel neden |
|---|---|
| Sertifika üretilmiyor | `CF_DNS_API_TOKEN` izinleri / DNS propagasyonu (`docker compose logs traefik`) |
| Tenant PROVISIONING'de kalıyor | GHCR imajı çekilemiyor → `docker login ghcr.io` + imaj adı |
| API açılmıyor, migration hatası | Eski `synchronize` verisiyle çakışma — temiz kurulumda görülmez; `docker compose logs api` |
| Webhook 401 | Satış sitesindeki imza anahtarı ile `WEBHOOK_SECRET` uyuşmuyor |
