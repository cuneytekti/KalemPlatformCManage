# CManage Geliştirme Planı

Kararlar: satış sitesi de bu projede yapılacak · lisans limitleri aktif zorlanacak
(Kalem API'de değişiklik gerektirir) · tek VPS · teklif PDF'leri az/tr/en.

## Fiyatlandırma ve Faturalama Modeli

Ücretlendirme ÜÇ boyut üzerinden yapılır; teklif, lisans ve aylık fatura
hepsi aynı üç boyutu kullanır:

| Boyut          | Birim              | Zorlama noktası (Faz 2)        |
|----------------|--------------------|--------------------------------|
| Kullanıcı      | aylık ₼ / kullanıcı| Kalem API kullanıcı oluşturma  |
| POS Kasa       | aylık ₼ / kasa     | Kalem API POS terminal kaydı   |
| Mobil Terminal | aylık ₼ / terminal | Kalem API mobil cihaz kaydı    |

Aylık fatura = kullanıcı×birim + kasa×birim + terminal×birim.
Veri modeli (Tenant/License/Quote) bu üç boyutu şimdiden içeriyor.

---

## Faz 0 — Üretim Hazırlığı (mevcut iskeletin sahaya inmesi)

- API/web build'lerinin yeşil olması (auth dahil)
- GHCR'de private registry: `kalem-api` ve `kalem-backoffice-web` imajlarının
  CI ile build+push edilmesi (KalemPlatformv1 tarafında GitHub Actions)
- VPS kurulumu: Docker, `*.kalemplatform.com` wildcard DNS, Cloudflare DNS API
  token'ı, `.env` doldurma, `docker compose up`
- İlk gerçek tenant'ın uçtan uca kurulum testi (DB → container → Traefik → TLS)

**Çıktı:** Panelden tek tıkla gerçek müşteri kurulabiliyor.

## Faz 1 — Çekirdek Panel Tamamlama

- Tenant yaşam döngüsü: suspend / resume / delete (container stop + DB arşiv),
  FAILED kurulumlar için "yeniden dene" (saga adımları idempotent)
- Dashboard: host CPU/RAM/disk kullanımı (Docker stats), tenant başına durum
- Audit log: panelde kim ne yaptı (admin_users bazlı)
- Admin kullanıcı yönetimi ekranı (ekle/sil/şifre sıfırla)

## Faz 2 — Lisans Zorlaması (Kalem API değişikliği gerektirir)

Kalem tarafı (KalemPlatformv1):
- `KALEM_MAX_USERS`, `KALEM_MAX_POS_TERMINALS`, `KALEM_MAX_MOBILE_TERMINALS`
  ENV desteği; kullanıcı oluşturma, POS terminal kaydı ve mobil cihaz
  sertifikasyonu (V13 şemasındaki akış) servislerine limit kontrolü
- `/internal/license` endpoint'i: üç boyutun mevcut kullanım + limit değerleri
  (panel-to-tenant servis token'ı ile korunur)

CManage tarafı:
- Koltuk güncellenince tenant container'ının yeni ENV ile yeniden oluşturulması
  (kısa kesinti; gece penceresi seçeneği)
- Kullanım toplayıcı: her tenant'tan periyodik aktif kullanıcı sayısı çekme,
  limit aşımı/yaklaşımı uyarıları

## Faz 3 — Teklif Modülü (az/tr/en)

- 3 dilli HTML teklif şablonu: üç boyutun miktar × birim fiyat dökümü,
  aylık toplam, süre, KDV/ƏDV alanları, logo
- Playwright ile HTML→PDF; panelden indirme + e-posta ile gönderme (SMTP)
- Teklif → müşteri dönüşümü: ACCEPTED teklif tek tıkla tenant kurulumu başlatır

## Faz 4 — Satış Web Sitesi (kalemplatform.com)

- Public site: ürün tanıtımı, fiyatlandırma, demo talebi, kayıt formu
- Ödeme sağlayıcısı entegrasyonu (Azerbaycan pazarı — sağlayıcı kararı: faz
  başında netleştirilecek; adaylar Pashabank sanal POS / Stripe)
- Başarılı ödeme → HMAC imzalı webhook → otomatik tenant kurulumu →
  müşteriye karşılama e-postası (subdomain + geçici şifre)
- Site de Traefik arkasında ayrı container (`www.` + kök domain)

## Faz 5 — Aylık Faturalama

- Fatura üretici: her ay tenant'ın güncel lisansından (kullanıcı/kasa/terminal
  × birim fiyat) fatura kaydı oluşturur (`invoices` tablosu, dönem bazlı)
- Dönem ortası lisans değişikliğinde oransal (pro-rata) hesap
- Fatura PDF'i (teklif şablonu altyapısı yeniden kullanılır) + e-posta
- Ödeme durumu takibi: ödendi / gecikti; geciken faturada uyarı,
  N gün sonra tenant'ı otomatik SUSPEND etme seçeneği
- Ödeme tahsilatı Faz 4'teki sanal POS entegrasyonuna bağlanır
  (kayıtlı kart / tekrarlayan ödeme sağlayıcı desteğine göre)

## Faz 6 — Üretim Sertleştirme

- TypeORM `synchronize` → migration'lara geçiş
- Yedekleme: tenant DB'leri için zamanlanmış `pg_dump` + saklama politikası
- İzleme: container health → panel bildirimi + e-posta uyarısı
- 2FA (TOTP), API rate limiting, log rotasyonu
- Yük planı: tek VPS ~30-35 tenant; doluluk %70'e gelince çoklu host fazı açılır

> Not: Mobil terminal sayısı >0 olan tenant'larda `mobile-terminal-api`
> container'ı da kurulur (Faz 1'de provisioning'e eklenecek); 0 olanlarda
> kaynak tüketmemesi için hiç başlatılmaz.

---

## Riskler

1. **Lisans zorlaması Kalem koduna dokunuyor** — POS tarafı sprint takvimiyle
   çakışabilir; endpoint sözleşmesini erken netleştirip ayrı branch'te ilerletin.
2. **Koltuk değişiminde container recreate** kısa kesinti yaratır — müşteriye
   bildirim + pencere seçimi gerekli.
3. **Ödeme sağlayıcısı belirsiz** — Faz 4 başlangıcında karar şart; webhook
   sözleşmesi sağlayıcıdan bağımsız tasarlandı (HMAC), risk sınırlı.
4. **Tek VPS = tek hata noktası** — Faz 5 yedekleme ve dış izleme bunu kısmen
   telafi eder; SLA taahhüdü verilmeden önce ikinci host değerlendirilmeli.
