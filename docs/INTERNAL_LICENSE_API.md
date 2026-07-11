# Kalem API — /internal/license Sözleşmesi (CManage ↔ Kalem)

CManage paneli her tenant'ın Kalem API container'ından saatlik kullanım
çeker ve lisans limitlerinin zorlanmasını Kalem API'ye devreder.
Bu doküman iki taraf için tek referanstır. **Sözleşme değişecekse önce
burası güncellenir.**

## Ortam değişkenleri (CManage → container)

CManage, tenant container'ını oluştururken/reconfigure ederken şunları verir:

| ENV | Anlam |
|---|---|
| `KALEM_MAX_USERS` | En fazla aktif kullanıcı sayısı |
| `KALEM_MAX_POS_TERMINALS` | En fazla kayıtlı POS kasa |
| `KALEM_MAX_MOBILE_TERMINALS` | En fazla sertifikalı mobil terminal |
| `KALEM_INTERNAL_TOKEN` | /internal/license erişim token'ı (aşağıda) |

Token türetimi (CManage tarafında yapılır, Kalem yalnız karşılaştırır):
`hex( HMAC_SHA256( key = KALEM_JWT_SECRET, message = "kalem-internal-license" ) )`

## Limit zorlaması (Kalem API tarafı)

Aşağıdaki işlemler, ilgili sayaç limit değerine ulaşmışsa
**HTTP 403** + makine-okur hata koduyla reddedilir:

| İşlem | Sayaç | Hata kodu |
|---|---|---|
| Kullanıcı oluşturma | aktif (silinmemiş/pasif olmayan) kullanıcı sayısı | `LICENSE_LIMIT_USERS` |
| POS terminal kaydı | kayıtlı POS terminal sayısı | `LICENSE_LIMIT_POS_TERMINALS` |
| Mobil cihaz sertifikasyonu | sertifikalı mobil terminal sayısı | `LICENSE_LIMIT_MOBILE_TERMINALS` |

Hata gövdesi:

```json
{ "error": "LICENSE_LIMIT_USERS", "used": 10, "limit": 10,
  "message": "Kullanıcı lisans limitine ulaşıldı (10/10)." }
```

ENV tanımsız veya `<= 0` ise ilgili boyutta zorlama YAPILMAZ
(geriye dönük uyumluluk; mevcut kurulumlar kırılmaz).

## GET /internal/license (Kalem API tarafı)

- **Auth:** `Authorization: Bearer <KALEM_INTERNAL_TOKEN>` — sabit-zamanlı
  karşılaştırma; yanlış/eksik token → 401. `KALEM_INTERNAL_TOKEN` tanımsızsa
  endpoint tamamen 404 döner (özellik kapalı).
- **Erişim:** yalnız tenant'ın iç Docker ağından çağrılır; public route
  edilmez (Traefik etiketi eklenmez, nginx proxy'den geçmez).

Yanıt — üç boyutun anlık kullanım ve container'ın bildiği limitleri:

```json
{
  "users":           { "used": 4, "limit": 10 },
  "posTerminals":    { "used": 1, "limit": 2 },
  "mobileTerminals": { "used": 0, "limit": 0 }
}
```

`limit` değeri ilgili `KALEM_MAX_*` ENV'inin okunmuş halidir (tanımsızsa 0).
CManage bu değeri panel lisansıyla karşılaştırıp uyuşmazlıkta DRIFT uyarısı
üretir (lisans değişmiş ama container henüz yeni ENV'le yeniden
oluşturulmamış demektir).

## CManage tarafı davranışı (bilgi)

- Saatlik cron + `POST /api/usage/collect` (elle tetikleme)
- `used >= lisans` → OVER, `used >= lisans×0.9` → NEAR, limit uyuşmazlığı → DRIFT
- Yeni uyarı seviyesinde admin'e e-posta; dashboard'da "Lisans Uyarıları"
- Endpoint erişilemezse sessizce atlanır (Kalem tarafı hazır olmadan da panel çalışır)
