# CManage — Sprint Planı (1 haftalık sprintler)

**Tarih:** 7 Temmuz 2026 · **Repo:** cuneytekti/KalemPlatformCManage · **Ekip:** 1 geliştirici + Claude

## Mevcut Durum

Repo beklenenden ileride — iskelet değil, çalışan bir MVP var:

| Alan | Durum |
|---|---|
| API (NestJS + TypeORM + BullMQ + dockerode) | ✅ Tenant, lisans, teklif, fatura, lead, auth, audit, usage, webhook modülleri mevcut |
| Web panel (React 19 + Vite) | ✅ 9 sayfa: Dashboard, Tenants, Licenses, Quotes, Invoices, Leads, Users, Login, TenantDetail |
| Satış sitesi (website/) | ✅ 3 dilli statik site + fiyat hesaplayıcı |
| Provisioning | ✅ DB + container + Traefik + SSE log akışı |
| Teklif PDF (az/tr/en) | ✅ Playwright |
| CI (GitHub Actions) | ✅ API test+build, Web build, Docker build |
| Migration | ⚠️ Altyapı hazır, ilk migration üretilmedi (`synchronize` açık) |
| Fatura PDF + e-posta | ❌ |
| Lisans zorlaması (Kalem API tarafı) | ❌ KalemPlatformDev'de KALEM_MAX_* + /internal/license gerekli |
| Ödeme entegrasyonu | ❌ Sağlayıcı kararı bekliyor |
| Üretim (VPS) kurulumu | ❌ |

Plan bu yüzden "sıfırdan yazma" değil, **kalan işleri sahaya indirme** planıdır.

---

## Sprint 1 — Üretime Hazırlık (Faz 0)

**Hedef:** Panelden tek tıkla gerçek müşteri kurulabiliyor.

- İlk TypeORM migration'ını üret, `DB_SYNCHRONIZE=false` akışını doğrula
- GHCR workflow: `kalem-api` ve `kalem-backoffice-web` imajlarının build+push'u (KalemPlatformDev tarafında)
- VPS kurulum betiği/dokümanı: Docker, wildcard DNS (`*.kalemplatform.com`), Cloudflare DNS-01 token, `.env`
- Lokal compose ile uçtan uca kurulum smoke testi: webhook → DB → container → Traefik → ACTIVE
- CI yeşil kontrolü + eksik birim testlerinin tamamlanması

**Bitti tanımı:** Temiz makinede `docker compose up` sonrası panel üzerinden bir tenant ACTIVE oluyor.

## Sprint 2 — Fatura PDF + E-posta

**Hedef:** Aylık fatura döngüsü uçtan uca çalışıyor.

- Fatura PDF'i (teklif PDF altyapısının yeniden kullanımı, az/tr/en)
- SMTP entegrasyonunun tamamlanması: fatura + teklif e-posta gönderimi
- Dönem ortası lisans değişikliğinde pro-rata hesap
- Panelde fatura durum takibi: ödendi / gecikti; gecikende uyarı, N gün sonra otomatik SUSPEND seçeneği

## Sprint 3 — Lisans Zorlaması (Faz 2, iki repo birden)

**Hedef:** Lisans limitleri gerçekten zorlanıyor.

- **KalemPlatformDev:** `KALEM_MAX_USERS/POS_TERMINALS/MOBILE_TERMINALS` ENV desteği; kullanıcı/kasa/mobil kayıt servislerinde limit kontrolü; `/internal/license` endpoint'i (servis token korumalı)
- **CManage:** usage collector'ın gerçek endpoint'e bağlanması; limit aşımı/yaklaşımı uyarıları dashboard'da
- Endpoint sözleşmesini sprint başında yaz (risk #1'i erken kapatır)

## Sprint 4 — Lisans Değişikliği + Mobil Terminal

**Hedef:** Koltuk değişimi güvenli, mobil tenant'lar tam kurulumlu.

- Koltuk güncellemesinde container'ın yeni ENV ile yeniden oluşturulması + gece penceresi seçeneği + müşteri bildirimi
- Mobil terminal >0 olan tenant'larda `mobile-terminal-api` container provisioning'i
- FAILED kurulum retry akışının bu yeni adımlarla idempotent kalması

## Sprint 5 — Ödeme Entegrasyonu (Faz 4)

**Hedef:** Web sitesinden satış → otomatik kurulum.

- Sağlayıcı kararı (Pashabank sanal POS vs Stripe) — sprint 1. günü
- Ödeme sayfası + başarılı ödeme → HMAC imzalı webhook → otomatik tenant kurulumu
- Karşılama e-postası (subdomain + geçici şifre)
- Website fiyat hesaplayıcısının ödeme akışına bağlanması

## Sprint 6 — Sertleştirme (Faz 6)

**Hedef:** SLA verilebilir üretim ortamı.

- Tenant DB'leri için zamanlanmış `pg_dump` + saklama politikası
- Container health → panel bildirimi + e-posta uyarısı
- 2FA (TOTP), log rotasyonu
- Kapasite kontrolü: tek VPS ~30-35 tenant; %70 dolulukta çoklu host kararı

---

## Çalışma Şekli

- Branch: `main` korumalı; sprint işleri `feat/sprint-N-<konu>` branch'lerinde, PR + CI ile merge
- Her sprint GitHub milestone; iş kalemleri issue olarak açılır
- Sprint sonu: demo + README/DEVELOPMENT_PLAN güncellemesi

## Riskler (mevcut plandan taşındı)

1. Lisans zorlaması Kalem koduna dokunuyor → sözleşmeyi Sprint 3 başında yaz
2. Container recreate kesintisi → gece penceresi (Sprint 4)
3. Ödeme sağlayıcısı belirsiz → Sprint 5 gün 1 kararı
4. Tek VPS tek hata noktası → Sprint 6 yedekleme + izleme
