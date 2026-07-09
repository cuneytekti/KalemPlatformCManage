# Codex Prompt — KalemPlatform Lisans Zorlaması + /internal/license

Aşağıdaki metni olduğu gibi Codex'e verin. (KalemPlatform reposunda çalıştırın.)

---

Bu repo, müşteri başına izole Docker container'ı olarak çalışan Kalem Platform
API'sidir. Yönetim paneli (CManage) her container'a lisans limitlerini ENV ile
verir ve kullanımı bir iç endpoint'ten okur. Senin görevin lisans zorlaması ve
bu endpoint'i eklemek.

Önce repoyu incele: dil/framework'ü, kullanıcı oluşturma servisini, POS
terminal kayıt servisini ve mobil cihaz sertifikasyon akışını (V13 şemasındaki
akış) bul. Değişiklikleri projenin mevcut mimarisine ve kod stiline uydur.

## 1. Lisans limiti ENV'leri

Container şu ortam değişkenleriyle başlatılır:

- `KALEM_MAX_USERS` — en fazla aktif kullanıcı
- `KALEM_MAX_POS_TERMINALS` — en fazla kayıtlı POS kasa
- `KALEM_MAX_MOBILE_TERMINALS` — en fazla sertifikalı mobil terminal

Kurallar:
- Değer tanımsız veya `<= 0` ise o boyutta zorlama YAPILMAZ (geriye dönük
  uyumluluk — mevcut kurulumlar kırılmamalı).
- Sayaç tanımları: kullanıcı = aktif (silinmemiş/devre dışı olmayan)
  kullanıcı sayısı; POS = kayıtlı POS terminal sayısı; mobil = sertifikalı
  mobil terminal sayısı. Repodaki gerçek varlık modeline göre en doğru
  karşılığı seç ve seçimini koda yorum olarak yaz.

## 2. Zorlama noktaları

Şu üç işlemin girişinde limit kontrolü yap; limit doluysa işlemi
**HTTP 403** ile reddet:

| İşlem | Hata kodu |
|---|---|
| Kullanıcı oluşturma | `LICENSE_LIMIT_USERS` |
| POS terminal kaydı | `LICENSE_LIMIT_POS_TERMINALS` |
| Mobil cihaz sertifikasyonu | `LICENSE_LIMIT_MOBILE_TERMINALS` |

Hata gövdesi JSON formatı (alan adları birebir):

```json
{ "error": "LICENSE_LIMIT_USERS", "used": 10, "limit": 10,
  "message": "Kullanıcı lisans limitine ulaşıldı (10/10)." }
```

Kontrolü tek bir ortak servise (örn. `LicenseLimitService`) topla; üç noktadan
onu çağır. Yarış durumuna dikkat: sayım + ekleme aynı transaction içinde
olmalı ya da eşdeğer bir kilitleme kullanılmalı.

## 3. GET /internal/license endpoint'i

- **Auth:** `Authorization: Bearer <token>` başlığı, `KALEM_INTERNAL_TOKEN`
  ENV değeriyle sabit-zamanlı (constant-time) karşılaştırılır. Yanlış/eksik
  token → 401. `KALEM_INTERNAL_TOKEN` tanımsızsa endpoint 404 dönmeli
  (özellik kapalı). Bu endpoint uygulamanın normal JWT/session auth
  zincirinden MUAF olmalı ama sadece kendi Bearer kontrolüyle.
- **Yanıt** (alan adları birebir, hepsi zorunlu):

```json
{
  "users":           { "used": 4, "limit": 10 },
  "posTerminals":    { "used": 1, "limit": 2 },
  "mobileTerminals": { "used": 0, "limit": 0 }
}
```

`used` = yukarıdaki sayaç tanımlarıyla anlık sayım; `limit` = ilgili
`KALEM_MAX_*` ENV'inin değeri (tanımsızsa 0). Endpoint hafif olmalı
(3 COUNT sorgusu); rate limit veya cache gerekmiyor.

Not: Token'ı üreten panel tarafıdır:
`hex(HMAC_SHA256(key=KALEM_JWT_SECRET, message="kalem-internal-license"))`.
Sen türetme YAPMA; yalnız `KALEM_INTERNAL_TOKEN` ENV'i ile karşılaştır.

## 4. Testler

- Her üç boyut için: limit altında işlem başarılı, limitte 403 + doğru hata
  gövdesi, ENV tanımsızken zorlama yok.
- /internal/license: doğru token → 200 ve doğru sayımlar; yanlış token → 401;
  ENV tanımsız → 404.

## 5. Yapma

- Public router/proxy yapılandırmasına /internal/license EKLEME (endpoint
  yalnız iç Docker ağından erişilecek).
- Mevcut API sözleşmelerini, DB şemasını (yeni tablo/kolon dahil) değiştirme —
  bu iş yalnız sayım + ENV okuma ile çözülmeli.
- Lisans değerlerini DB'ye yazmaya çalışma; kaynak her zaman ENV'dir.

Bitince değiştirdiğin dosyaları ve zorlama noktalarını (hangi servis/metot)
kısa bir listeyle özetle.
