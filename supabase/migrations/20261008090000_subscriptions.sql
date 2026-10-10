-- Paid reading: the first pages of every book are free, the rest needs a subscription ($5 a month or $40 a year,
-- paid through WayForPay on the website) or a promo code. Access lasts until subscriptions.current_period_end.
--
-- Payments run without separate servers: the app calls wayforpay_checkout() for a signed payment form, and
-- WayForPay reports each charge (the first one and every renewal) to wayforpay_callback() through the REST API.
-- Merchant keys live in private.payment_settings, filled by `npm run payments:configure` (scripts/payments-configure.sh).

create extension if not exists pg_net with schema extensions;

-- Not exposed through the API: settings with secrets, promo codes and the raw payment log.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.payment_settings (
  id boolean primary key default true check (id),
  merchant_account text not null,
  merchant_domain text not null,
  secret_key text not null,
  merchant_password text not null,
  -- WayForPay posts payment results here: <supabase>/rest/v1/rpc/wayforpay_callback?apikey=<anon key>
  service_url text not null,
  return_url text not null,
  monthly_price numeric(10, 2) not null default 5,
  yearly_price numeric(10, 2) not null default 40,
  currency text not null default 'USD',
  updated_at timestamptz not null default now()
);

create table if not exists private.promo_codes (
  code text primary key check (code = upper(code)),
  days integer not null check (days > 0),
  max_redemptions integer check (max_redemptions > 0),
  redeemed_count integer not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists private.promo_redemptions (
  code text not null references private.promo_codes (code),
  user_id uuid not null references auth.users (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (code, user_id)
);

-- Every callback from WayForPay; a charge extends the subscription once, however often it is reported.
create table if not exists private.payment_events (
  order_reference text primary key,
  base_reference text not null,
  status text not null,
  payload jsonb not null,
  applied boolean not null default false,
  received_at timestamptz not null default now()
);

insert into private.promo_codes (code, days) values ('LINGFRIEND', 365) on conflict (code) do nothing;

-- One row per user: who may read past the free pages, and until when.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null check (plan in ('monthly', 'yearly', 'promo')),
  provider text not null check (provider in ('wayforpay', 'promo', 'apple')),
  current_period_end timestamptz not null,
  -- The WayForPay order that started the recurring charges; used to cancel them.
  order_reference text,
  canceled_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
drop policy if exists "Users read their subscription" on public.subscriptions;
create policy "Users read their subscription" on public.subscriptions for select to authenticated using (auth.uid() = user_id);
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

create table if not exists public.payment_orders (
  order_reference text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null check (plan in ('monthly', 'yearly')),
  amount numeric(10, 2) not null,
  currency text not null,
  status text not null default 'created',
  rec_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_orders enable row level security;
drop policy if exists "Users read their orders" on public.payment_orders;
create policy "Users read their orders" on public.payment_orders for select to authenticated using (auth.uid() = user_id);
revoke all on public.payment_orders from anon, authenticated;
grant select on public.payment_orders to authenticated;

-- Adds a period to the user's access, counting from its current end when it has not run out yet.
create or replace function private.extend_subscription(p_user uuid, p_plan text, p_provider text, p_period interval, p_order text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_end timestamptz;
begin
  insert into public.subscriptions as s (user_id, plan, provider, current_period_end, order_reference, canceled_at, updated_at)
  values (p_user, p_plan, p_provider, now() + p_period, p_order, null, now())
  on conflict (user_id) do update set
    current_period_end = greatest(s.current_period_end, now()) + p_period,
    -- A promo code adds time to a paid subscription without replacing it.
    plan = case when p_provider = 'promo' and s.provider <> 'promo' and s.current_period_end > now() then s.plan else excluded.plan end,
    provider = case when p_provider = 'promo' and s.provider <> 'promo' and s.current_period_end > now() then s.provider else excluded.provider end,
    order_reference = coalesce(excluded.order_reference, s.order_reference),
    canceled_at = case when p_provider = 'promo' then s.canceled_at else null end,
    updated_at = now()
  returning current_period_end into v_end;
  return v_end;
end;
$$;

-- Applies a promo code to the signed-in user. Errors: not_signed_in, invalid_code, code_used_up, already_redeemed.
create or replace function public.redeem_promo(p_code text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_promo private.promo_codes;
begin
  if v_user is null then
    raise exception 'not_signed_in';
  end if;
  select * into v_promo from private.promo_codes where code = upper(trim(p_code)) for update;
  if not found or not v_promo.active or (v_promo.expires_at is not null and v_promo.expires_at < now()) then
    raise exception 'invalid_code';
  end if;
  if v_promo.max_redemptions is not null and v_promo.redeemed_count >= v_promo.max_redemptions then
    raise exception 'code_used_up';
  end if;
  insert into private.promo_redemptions (code, user_id) values (v_promo.code, v_user) on conflict do nothing;
  if not found then
    raise exception 'already_redeemed';
  end if;
  update private.promo_codes set redeemed_count = redeemed_count + 1 where code = v_promo.code;
  return private.extend_subscription(v_user, 'promo', 'promo', make_interval(days => v_promo.days), null);
end;
$$;

-- A signed WayForPay payment form for the signed-in user: the first charge now, then automatic renewals.
-- Returns { url, fields: [[name, value], ...] }; the app posts the fields to url.
create or replace function public.wayforpay_checkout(p_plan text, p_language text default 'UA')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_settings private.payment_settings;
  v_email text;
  v_reference text := 'LING-' || replace(gen_random_uuid()::text, '-', '');
  v_date text := extract(epoch from now())::bigint::text;
  v_amount numeric(10, 2);
  v_amount_text text;
  v_product text;
  v_period interval;
  v_signature text;
begin
  if v_user is null then
    raise exception 'not_signed_in';
  end if;
  if p_plan not in ('monthly', 'yearly') then
    raise exception 'invalid_plan';
  end if;
  select * into v_settings from private.payment_settings where id;
  if not found then
    raise exception 'payments_not_configured';
  end if;
  select email into v_email from auth.users where id = v_user;

  v_amount := case p_plan when 'monthly' then v_settings.monthly_price else v_settings.yearly_price end;
  v_amount_text := trim(to_char(v_amount, 'FM9999990.00'));
  v_product := case p_plan when 'monthly' then 'Ling subscription, 1 month' else 'Ling subscription, 1 year' end;
  v_period := case p_plan when 'monthly' then interval '1 month' else interval '1 year' end;
  v_signature := encode(extensions.hmac(
    concat_ws(';', v_settings.merchant_account, v_settings.merchant_domain, v_reference, v_date, v_amount_text,
      v_settings.currency, v_product, '1', v_amount_text),
    v_settings.secret_key, 'md5'), 'hex');

  insert into public.payment_orders (order_reference, user_id, plan, amount, currency)
  values (v_reference, v_user, p_plan, v_amount, v_settings.currency);

  return jsonb_build_object(
    'url', 'https://secure.wayforpay.com/pay',
    'orderReference', v_reference,
    'fields', jsonb_build_array(
      jsonb_build_array('merchantAccount', v_settings.merchant_account),
      jsonb_build_array('merchantAuthType', 'SimpleSignature'),
      jsonb_build_array('merchantDomainName', v_settings.merchant_domain),
      jsonb_build_array('merchantSignature', v_signature),
      jsonb_build_array('orderReference', v_reference),
      jsonb_build_array('orderDate', v_date),
      jsonb_build_array('amount', v_amount_text),
      jsonb_build_array('currency', v_settings.currency),
      jsonb_build_array('productName[]', v_product),
      jsonb_build_array('productPrice[]', v_amount_text),
      jsonb_build_array('productCount[]', '1'),
      jsonb_build_array('language', upper(coalesce(nullif(p_language, ''), 'UA'))),
      jsonb_build_array('returnUrl', v_settings.return_url),
      jsonb_build_array('serviceUrl', v_settings.service_url),
      jsonb_build_array('clientEmail', coalesce(v_email, '')),
      jsonb_build_array('regularOn', '1'),
      jsonb_build_array('regularBehavior', 'preset'),
      jsonb_build_array('regularMode', p_plan),
      jsonb_build_array('regularAmount', v_amount_text),
      jsonb_build_array('regularCount', case p_plan when 'monthly' then '120' else '10' end),
      jsonb_build_array('dateNext', to_char(now() + v_period, 'DD.MM.YYYY'))
    )
  );
end;
$$;

-- WayForPay reports payment results here (serviceUrl). PostgREST passes the whole JSON body as the single unnamed
-- argument. Renewals arrive as <first order>_WFPREG-<n>; each approved charge adds one period.
create or replace function public.wayforpay_callback(jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb := $1;
  v_settings private.payment_settings;
  v_reference text := v_payload ->> 'orderReference';
  v_base text;
  v_status text := coalesce(v_payload ->> 'transactionStatus', '');
  v_expected text;
  v_order public.payment_orders;
  v_applied boolean;
  v_time text := extract(epoch from now())::bigint::text;
begin
  select * into v_settings from private.payment_settings where id;
  if not found or v_reference is null then
    raise exception 'not_configured_or_empty';
  end if;
  v_expected := encode(extensions.hmac(
    concat_ws(';', coalesce(v_payload ->> 'merchantAccount', ''), v_reference, coalesce(v_payload ->> 'amount', ''),
      coalesce(v_payload ->> 'currency', ''), coalesce(v_payload ->> 'authCode', ''), coalesce(v_payload ->> 'cardPan', ''),
      v_status, coalesce(v_payload ->> 'reasonCode', '')),
    v_settings.secret_key, 'md5'), 'hex');
  if v_expected <> coalesce(v_payload ->> 'merchantSignature', '') then
    raise exception 'invalid_signature';
  end if;

  v_base := regexp_replace(v_reference, '_WFPREG-\d+$', '');
  insert into private.payment_events (order_reference, base_reference, status, payload)
  values (v_reference, v_base, v_status, v_payload)
  on conflict (order_reference) do update set status = excluded.status, payload = excluded.payload, received_at = now()
  returning applied into v_applied;

  select * into v_order from public.payment_orders where order_reference = v_base;
  if found then
    if v_reference = v_base then
      update public.payment_orders
      set status = lower(v_status), rec_token = coalesce(v_payload ->> 'recToken', rec_token), updated_at = now()
      where order_reference = v_base;
    end if;
    if v_status = 'Approved' and not v_applied then
      perform private.extend_subscription(v_order.user_id, v_order.plan, 'wayforpay',
        case v_order.plan when 'monthly' then interval '1 month' else interval '1 year' end, v_base);
      update private.payment_events set applied = true where order_reference = v_reference;
    end if;
  end if;

  return jsonb_build_object(
    'orderReference', v_reference,
    'status', 'accept',
    'time', v_time::bigint,
    'signature', encode(extensions.hmac(v_reference || ';accept;' || v_time, v_settings.secret_key, 'md5'), 'hex')
  );
end;
$$;

-- Stops automatic renewals; access stays until the end of the period already paid for.
create or replace function public.cancel_subscription()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_subscription public.subscriptions;
  v_settings private.payment_settings;
begin
  if v_user is null then
    raise exception 'not_signed_in';
  end if;
  select * into v_subscription from public.subscriptions where user_id = v_user for update;
  if not found then
    raise exception 'no_subscription';
  end if;
  if v_subscription.provider = 'wayforpay' and v_subscription.order_reference is not null and v_subscription.canceled_at is null then
    select * into v_settings from private.payment_settings where id;
    perform net.http_post(
      url := 'https://api.wayforpay.com/regularApi',
      body := jsonb_build_object('requestType', 'REMOVE', 'merchantAccount', v_settings.merchant_account,
        'merchantPassword', v_settings.merchant_password, 'orderReference', v_subscription.order_reference),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  update public.subscriptions set canceled_at = coalesce(canceled_at, now()), updated_at = now() where user_id = v_user;
  return v_subscription.current_period_end;
end;
$$;

revoke all on function private.extend_subscription(uuid, text, text, interval, text) from public, anon, authenticated;
revoke all on function public.redeem_promo(text) from public, anon;
revoke all on function public.wayforpay_checkout(text, text) from public, anon;
revoke all on function public.cancel_subscription() from public, anon;
revoke all on function public.wayforpay_callback(jsonb) from public;
grant execute on function public.redeem_promo(text) to authenticated;
grant execute on function public.wayforpay_checkout(text, text) to authenticated;
grant execute on function public.cancel_subscription() to authenticated;
grant execute on function public.wayforpay_callback(jsonb) to anon, authenticated;
