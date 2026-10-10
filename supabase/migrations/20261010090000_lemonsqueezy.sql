-- Subscriptions paid through Lemon Squeezy (merchant of record). The app asks lemonsqueezy_checkout() for a checkout
-- URL; after paying, lemonsqueezy_sync() looks the subscription up in Lemon Squeezy (the customer with the account's
-- email, which the checkout is prefilled with) and copies when it renews or ends. Every state comes from the Lemon
-- Squeezy API with the store's key, kept in private.lemonsqueezy_settings (`npm run payments:lemonsqueezy`).

create extension if not exists http with schema extensions;

alter table public.subscriptions drop constraint if exists subscriptions_provider_check;
alter table public.subscriptions add constraint subscriptions_provider_check
  check (provider in ('wayforpay', 'promo', 'apple', 'square', 'lemonsqueezy'));

create table if not exists private.lemonsqueezy_settings (
  id boolean primary key default true check (id),
  api_key text not null,
  store_id text not null,
  monthly_variant_id text not null,
  yearly_variant_id text not null,
  test_mode boolean not null,
  redirect_url text not null,
  updated_at timestamptz not null default now()
);

-- Checkouts handed out, so a later payment can be looked for on behalf of the user who started it.
create table if not exists private.lemonsqueezy_checkouts (
  checkout_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null check (plan in ('monthly', 'yearly')),
  created_at timestamptz not null default now(),
  linked_at timestamptz
);

-- One call to the Lemon Squeezy API (JSON:API); raises lemonsqueezy_error on a failed response.
create or replace function private.lemonsqueezy(p_method text, p_path text, p_body jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings private.lemonsqueezy_settings;
  v_response extensions.http_response;
begin
  select * into v_settings from private.lemonsqueezy_settings where id;
  if not found then
    raise exception 'payments_not_configured';
  end if;
  v_response := extensions.http((
    p_method::extensions.http_method,
    'https://api.lemonsqueezy.com' || p_path,
    array[extensions.http_header('Authorization', 'Bearer ' || v_settings.api_key), extensions.http_header('Accept', 'application/vnd.api+json')],
    'application/vnd.api+json',
    p_body::text
  )::extensions.http_request);
  if v_response.status >= 300 then
    raise exception 'lemonsqueezy_error % %', v_response.status, left(v_response.content, 300);
  end if;
  return coalesce(nullif(v_response.content, ''), '{}')::jsonb;
end;
$$;

-- Copies a Lemon Squeezy subscription (its JSON:API "data" object) into public.subscriptions.
create or replace function private.apply_lemonsqueezy_subscription(p_user uuid, p_subscription jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings private.lemonsqueezy_settings;
  v_attributes jsonb := p_subscription -> 'attributes';
  v_plan text;
  v_end timestamptz;
  v_canceled boolean;
begin
  select * into v_settings from private.lemonsqueezy_settings where id;
  v_plan := case v_attributes ->> 'variant_id' when v_settings.yearly_variant_id then 'yearly' else 'monthly' end;
  v_canceled := coalesce((v_attributes ->> 'cancelled')::boolean, false) or v_attributes ->> 'status' in ('cancelled', 'expired');
  -- A renewing subscription lasts until the next charge (with a day to process it); a cancelled one until it ends.
  v_end := case
    when v_attributes ->> 'status' = 'expired' then coalesce((v_attributes ->> 'ends_at')::timestamptz, now())
    when v_canceled then coalesce((v_attributes ->> 'ends_at')::timestamptz, (v_attributes ->> 'renews_at')::timestamptz)
    else (v_attributes ->> 'renews_at')::timestamptz + interval '1 day'
  end;

  insert into public.subscriptions as s (user_id, plan, provider, current_period_end, external_id, canceled_at, updated_at)
  values (p_user, v_plan, 'lemonsqueezy', v_end, p_subscription ->> 'id', case when v_canceled then now() end, now())
  on conflict (user_id) do update set
    plan = excluded.plan,
    provider = 'lemonsqueezy',
    -- Time left from a promo code is kept.
    current_period_end = case when s.provider = 'promo' then greatest(s.current_period_end, excluded.current_period_end) else excluded.current_period_end end,
    external_id = excluded.external_id,
    canceled_at = case when v_canceled then coalesce(s.canceled_at, now()) else null end,
    updated_at = now();
end;
$$;

-- A Lemon Squeezy checkout for the signed-in user's plan, prefilled with the account's email. Returns its URL.
create or replace function public.lemonsqueezy_checkout(p_plan text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_settings private.lemonsqueezy_settings;
  v_email text;
  v_variant text;
  v_checkout jsonb;
begin
  if v_user is null then
    raise exception 'not_signed_in';
  end if;
  if p_plan not in ('monthly', 'yearly') then
    raise exception 'invalid_plan';
  end if;
  select * into v_settings from private.lemonsqueezy_settings where id;
  if not found then
    raise exception 'payments_not_configured';
  end if;
  select email into v_email from auth.users where id = v_user;
  v_variant := case p_plan when 'monthly' then v_settings.monthly_variant_id else v_settings.yearly_variant_id end;

  v_checkout := private.lemonsqueezy('POST', '/v1/checkouts', jsonb_build_object('data', jsonb_build_object(
    'type', 'checkouts',
    'attributes', jsonb_build_object(
      'checkout_data', jsonb_build_object('email', coalesce(v_email, ''), 'custom', jsonb_build_object('user_id', v_user::text)),
      'product_options', jsonb_build_object('redirect_url', v_settings.redirect_url, 'enabled_variants', jsonb_build_array(v_variant::bigint)),
      'test_mode', v_settings.test_mode
    ),
    'relationships', jsonb_build_object(
      'store', jsonb_build_object('data', jsonb_build_object('type', 'stores', 'id', v_settings.store_id)),
      'variant', jsonb_build_object('data', jsonb_build_object('type', 'variants', 'id', v_variant))
    )
  ))) -> 'data';

  insert into private.lemonsqueezy_checkouts (checkout_id, user_id, plan) values (v_checkout ->> 'id', v_user, p_plan);
  return v_checkout -> 'attributes' ->> 'url';
end;
$$;

-- Brings the signed-in user's subscription up to date with Lemon Squeezy and returns it (or null when there is none).
-- Lemon Squeezy is asked only after a recent checkout, near the end of the paid period, or twice a day.
create or replace function public.lemonsqueezy_sync()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_settings private.lemonsqueezy_settings;
  v_subscription public.subscriptions;
  v_email text;
  v_found jsonb;
begin
  if v_user is null then
    raise exception 'not_signed_in';
  end if;
  select * into v_settings from private.lemonsqueezy_settings where id;
  select * into v_subscription from public.subscriptions where user_id = v_user;

  if v_settings.id is not null then
    if v_subscription.provider = 'lemonsqueezy' and v_subscription.external_id is not null
      and (v_subscription.current_period_end < now() + interval '1 day' or v_subscription.updated_at < now() - interval '12 hours') then
      perform private.apply_lemonsqueezy_subscription(v_user,
        private.lemonsqueezy('GET', '/v1/subscriptions/' || v_subscription.external_id) -> 'data');
    elsif exists (select 1 from private.lemonsqueezy_checkouts where user_id = v_user and linked_at is null and created_at > now() - interval '7 days') then
      select email into v_email from auth.users where id = v_user;
      select subscription into v_found
      from jsonb_array_elements(coalesce(private.lemonsqueezy('GET',
        '/v1/subscriptions?filter[store_id]=' || v_settings.store_id || '&filter[user_email]=' || replace(replace(v_email, '+', '%2B'), '@', '%40')) -> 'data', '[]')) subscription
      where subscription -> 'attributes' ->> 'variant_id' in (v_settings.monthly_variant_id, v_settings.yearly_variant_id)
        and subscription -> 'attributes' ->> 'status' in ('on_trial', 'active', 'past_due')
      order by subscription -> 'attributes' ->> 'created_at' desc
      limit 1;
      if v_found is not null then
        perform private.apply_lemonsqueezy_subscription(v_user, v_found);
        update private.lemonsqueezy_checkouts set linked_at = now() where user_id = v_user and linked_at is null;
      end if;
    end if;
  end if;

  select * into v_subscription from public.subscriptions where user_id = v_user;
  if not found then
    return null;
  end if;
  return jsonb_build_object('plan', v_subscription.plan, 'provider', v_subscription.provider,
    'current_period_end', v_subscription.current_period_end, 'canceled_at', v_subscription.canceled_at);
end;
$$;

-- Cancelling covers Lemon Squeezy too: the subscription is cancelled there and access stays until it ends.
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
  if v_subscription.canceled_at is null then
    if v_subscription.provider = 'lemonsqueezy' and v_subscription.external_id is not null then
      perform private.apply_lemonsqueezy_subscription(v_user,
        private.lemonsqueezy('DELETE', '/v1/subscriptions/' || v_subscription.external_id) -> 'data');
    elsif v_subscription.provider = 'square' and v_subscription.external_id is not null then
      perform private.square('POST', '/v2/subscriptions/' || v_subscription.external_id || '/cancel', '{}'::jsonb);
    elsif v_subscription.provider = 'wayforpay' and v_subscription.order_reference is not null then
      select * into v_settings from private.payment_settings where id;
      perform net.http_post(
        url := 'https://api.wayforpay.com/regularApi',
        body := jsonb_build_object('requestType', 'REMOVE', 'merchantAccount', v_settings.merchant_account,
          'merchantPassword', v_settings.merchant_password, 'orderReference', v_subscription.order_reference),
        headers := '{"Content-Type": "application/json"}'::jsonb
      );
    end if;
  end if;
  update public.subscriptions set canceled_at = coalesce(canceled_at, now()), updated_at = now() where user_id = v_user;
  select * into v_subscription from public.subscriptions where user_id = v_user;
  return v_subscription.current_period_end;
end;
$$;

revoke all on function private.lemonsqueezy(text, text, jsonb) from public, anon, authenticated;
revoke all on function private.apply_lemonsqueezy_subscription(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.lemonsqueezy_checkout(text) from public, anon;
revoke all on function public.lemonsqueezy_sync() from public, anon;
grant execute on function public.lemonsqueezy_checkout(text) to authenticated;
grant execute on function public.lemonsqueezy_sync() to authenticated;
