#!/usr/bin/env bash
# Writes the WayForPay merchant settings into private.payment_settings (see supabase/migrations/*_subscriptions.sql).
#
#   npm run payments:configure
#
# From .env.local: WAYFORPAY_MERCHANT_ACCOUNT, WAYFORPAY_MERCHANT_DOMAIN, WAYFORPAY_SECRET_KEY, WAYFORPAY_MERCHANT_PASSWORD
# (never VITE_ ones: they would end up in the app). Without them WayForPay's public test merchant is used, which
# accepts test cards only. Also needs SUPABASE_DB_URL, VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
set -euo pipefail
cd "$(dirname "$0")/.."

env_value() {
  grep -E "^$1=" .env.local 2>/dev/null | head -n 1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//' || true
}

DB_URL=$(env_value SUPABASE_DB_URL)
SUPABASE_URL=$(env_value VITE_SUPABASE_URL)
ANON_KEY=$(env_value VITE_SUPABASE_ANON_KEY)
SITE_URL=$(env_value VITE_SITE_URL)
[ -n "$DB_URL" ] && [ -n "$SUPABASE_URL" ] && [ -n "$ANON_KEY" ] || { echo "SUPABASE_DB_URL, VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local" >&2; exit 1; }

ACCOUNT=$(env_value WAYFORPAY_MERCHANT_ACCOUNT)
if [ -z "$ACCOUNT" ]; then
  MODE="TEST (WayForPay test merchant, test cards only)"
  ACCOUNT="test_merch_n1"
  DOMAIN="www.market.ua"
  SECRET="flk3409refn54t54t*FNJRET"
  PASSWORD="d485396ae413eb60dc251b0899b261c2"
else
  MODE="LIVE ($ACCOUNT)"
  DOMAIN=$(env_value WAYFORPAY_MERCHANT_DOMAIN)
  SECRET=$(env_value WAYFORPAY_SECRET_KEY)
  PASSWORD=$(env_value WAYFORPAY_MERCHANT_PASSWORD)
  [ -n "$DOMAIN" ] && [ -n "$SECRET" ] && [ -n "$PASSWORD" ] || { echo "Set WAYFORPAY_MERCHANT_DOMAIN, WAYFORPAY_SECRET_KEY and WAYFORPAY_MERCHANT_PASSWORD too" >&2; exit 1; }
fi

SERVICE_URL="${SUPABASE_URL%/}/rest/v1/rpc/wayforpay_callback?apikey=$ANON_KEY"
RETURN_URL="${SITE_URL:-https://ling.uno/}"
RETURN_URL="${RETURN_URL%/}/?payment=done"

psql "$DB_URL" -v ON_ERROR_STOP=1 -X -q \
  -v account="$ACCOUNT" -v domain="$DOMAIN" -v secret="$SECRET" -v password="$PASSWORD" \
  -v service="$SERVICE_URL" -v return_url="$RETURN_URL" <<'SQL'
insert into private.payment_settings (id, merchant_account, merchant_domain, secret_key, merchant_password, service_url, return_url)
values (true, :'account', :'domain', :'secret', :'password', :'service', :'return_url')
on conflict (id) do update set
  merchant_account = excluded.merchant_account, merchant_domain = excluded.merchant_domain,
  secret_key = excluded.secret_key, merchant_password = excluded.merchant_password,
  service_url = excluded.service_url, return_url = excluded.return_url, updated_at = now();
SQL

echo "Payments configured: $MODE"
echo "Return URL: $RETURN_URL"
