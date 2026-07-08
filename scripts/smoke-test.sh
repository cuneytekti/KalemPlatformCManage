#!/usr/bin/env bash
# CManage uçtan uca smoke test.
#
# Kullanım:
#   ./scripts/smoke-test.sh                          # servis + health + login
#   SMOKE_TENANT=1 ./scripts/smoke-test.sh           # + demo tenant kur/ACTIVE bekle/sil
#
# Ortam değişkenleri (varsayılanlar lokal compose'a göre):
#   API_URL   (vars: http://localhost:3000/api — üretimde https://panel.<domain>/api)
#   ADMIN_EMAIL / ADMIN_PASSWORD  (vars: .env'deki CMANAGE_ADMIN_*)
#   SMOKE_SLUG (vars: smoketest)  SMOKE_TIMEOUT saniye (vars: 300)
set -euo pipefail

API_URL="${API_URL:-http://localhost:3000/api}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@kalemplatform.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
SMOKE_SLUG="${SMOKE_SLUG:-smoketest}"
SMOKE_TIMEOUT="${SMOKE_TIMEOUT:-300}"

PASS=0; FAIL=0
ok()   { echo "  ✔ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✘ $1"; FAIL=$((FAIL+1)); }
json() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)"; }

echo "── CManage smoke test → $API_URL"

# 1. Compose servisleri ayakta mı? (docker varsa)
if command -v docker >/dev/null 2>&1 && docker compose ps >/dev/null 2>&1; then
  DOWN=$(docker compose ps --format '{{.Name}} {{.State}}' | awk '$2!="running"{print $1}' || true)
  if [ -z "$DOWN" ]; then ok "compose servisleri ayakta"; else fail "çalışmayan servis(ler): $DOWN"; fi
fi

# 2. Health (auth'suz; db+redis durumu)
HEALTH=$(curl -fsS --max-time 10 "$API_URL/health" || true)
if echo "$HEALTH" | grep -q '"ok"\|"up"'; then ok "health: $HEALTH"; else fail "health yanıtı beklenmedik: ${HEALTH:-BOŞ}"; fi

# 3. Login
if [ -z "$ADMIN_PASSWORD" ]; then
  echo "  ↷ ADMIN_PASSWORD verilmedi — login ve sonrası atlandı"; echo; echo "Sonuç: $PASS başarılı, $FAIL hatalı"; [ "$FAIL" -eq 0 ]; exit
fi
TOKEN=$(curl -fsS --max-time 10 -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  "$API_URL/auth/login" | json "['accessToken']" || true)
if [ -n "$TOKEN" ]; then ok "login başarılı"; else fail "login başarısız"; echo "Sonuç: $PASS başarılı, $((FAIL)) hatalı"; exit 1; fi
AUTH=(-H "Authorization: Bearer $TOKEN")

# 4. Korumalı uç: tenant listesi
if curl -fsS --max-time 10 "${AUTH[@]}" "$API_URL/tenants" >/dev/null; then
  ok "GET /tenants (JWT) çalışıyor"
else fail "GET /tenants başarısız"; fi

# 5. (Opsiyonel) Uçtan uca tenant kurulumu
if [ "${SMOKE_TENANT:-0}" = "1" ]; then
  echo "  → '$SMOKE_SLUG' tenant'ı kuruluyor (timeout ${SMOKE_TIMEOUT}s)..."
  TID=$(curl -fsS -H 'Content-Type: application/json' "${AUTH[@]}" \
    -d "{\"slug\":\"$SMOKE_SLUG\",\"name\":\"Smoke Test\",\"contactEmail\":\"$ADMIN_EMAIL\"}" \
    "$API_URL/tenants" | json "['id']")
  DEADLINE=$(( $(date +%s) + SMOKE_TIMEOUT )); STATUS=PENDING
  while [ "$(date +%s)" -lt "$DEADLINE" ]; do
    STATUS=$(curl -fsS "${AUTH[@]}" "$API_URL/tenants/$TID" | json "['status']")
    [ "$STATUS" = "ACTIVE" ] && break
    [ "$STATUS" = "FAILED" ] && break
    sleep 5
  done
  if [ "$STATUS" = "ACTIVE" ]; then ok "tenant ACTIVE oldu"; else fail "tenant durumu: $STATUS"; fi
  # Temizlik: container + DB düşür (kayıt DELETED olarak kalır)
  curl -fsS -X DELETE "${AUTH[@]}" "$API_URL/tenants/$TID?dropDatabase=true" >/dev/null \
    && ok "smoke tenant temizlendi" || fail "temizlik başarısız (elle silin: $TID)"
fi

echo; echo "Sonuç: $PASS başarılı, $FAIL hatalı"
[ "$FAIL" -eq 0 ]
