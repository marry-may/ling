-- Subscriptions paid through Stripe Checkout. The app asks stripe_checkout() for a checkout URL; after paying,
-- stripe_sync() looks the checkout session up in Stripe, links its subscription to the user and later copies when it
-- renews or ends. Every state comes from the Stripe API with the account's secret key, kept in private.stripe_settings
-- (`npm run payments:stripe`).

create extension if not exists http with schema extensions;

alter table public.subscriptions drop constraint if exists subscriptions_provider_check;
alter table public.subscriptions add constraint subscriptions_provider_check
  check (provider in ('wayforpay', 'promo', 'apple', 'square', 'lemonsqueezy', 'stripe'));

create table if not exists private.stripe_settings (
  id boolean primary key default true check (id),
  secret_key text not null,
  monthly_price_id text not null,
  yearly_price_id text not null,
  test_mode boolean not null,
  success_url text not null,
  cancel_url text not null,
  updated_at timestamptz not null default now()
);

-- Checkout sessions handed out, so the payment can be found on behalf of the user who started it.
create table if not exists private.stripe_checkouts (
  session_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null check (plan in ('monthly', 'yearly')),
  created_at timestamptz not null default now(),
  linked_at timestamptz
);

-- One call to the Stripe API with a form-encoded body; raises stripe_error on a failed response.
create or replace function private.stripe(p_method text, p_path text, p_form jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings private.stripe_settings;
  v_response extensions.http_response;
begin
  select * into v_settings from private.stripe_settings where id;
  if not found then
    raise exception 'payments_not_configured';
  end if;
  v_response := extensions.http((
    p_method::extensions.http_method,
    'https://api.stripe.com' || p_path,
    array[extensions.http_header('Authorization', 'Bearer ' || v_settings.secret_key)],
    'application/x-www-form-urlencoded',
    case when p_form is not null then extensions.urlencode(p_form) end
  )::extensions.http_request);
  if v_response.status >= 300 then
    raise exception 'stripe_error % %', v_response.status, left(v_response.content, 300);
  end if;
  return coalesce(nullif(v_response.content, ''), '{}')::jsonb;
end;
$$;

-- Copies a Stripe subscription object into public.subscriptions.
create or replace function private.apply_stripe_subscription(p_user uuid, p_subscription jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings private.stripe_settings;
  v_item jsonb := p_subscription -> 'items' -> 'data' -> 0;
  v_status text := p_subscription ->> 'status';
  v_period_end timestamptz;
  v_plan text;
  v_end timestamptz;
  v_canceled boolean;
begin
  select * into v_settings from private.stripe_settings where id;
  v_plan := case v_item -> 'price' ->> 'id' when v_settings.yearly_price_id then 'yearly' else 'monthly' end;
  -- Newer API versions keep the period on the subscription item, older ones on the subscription.
  v_period_end := to_timestamp(coalesce((v_item ->> 'current_period_end')::bigint, (p_subscription ->> 'current_period_end')::bigint));
  v_canceled := v_status in ('canceled', 'incomplete_expired') or coalesce((p_subscription ->> 'cancel_at_period_end')::boolean, false)
    or p_subscription ->> 'cancel_at' is not null;
  -- A renewing subscription lasts until the next charge (with a day to process it); a cancelled one until it ends.
  v_end := case
    when v_status in ('canceled', 'incomplete_expired') then coalesce(to_timestamp((p_subscription ->> 'ended_at')::bigint), now())
    when v_canceled then coalesce(to_timestamp((p_subscription ->> 'cancel_at')::bigint), v_period_end)
    else v_period_end + interval '1 day'
  end;

  insert into public.subscriptions as s (user_id, plan, provider, current_period_end, external_id, canceled_at, updated_at)
  values (p_user, v_plan, 'stripe', v_end, p_subscription ->> 'id', case when v_canceled then now() end, now())
  on conflict (user_id) do update set
    plan = excluded.plan,
    provider = 'stripe',
    -- Time left from a promo code is kept.
    current_period_end = case when s.provider = 'promo' then greatest(s.current_period_end, excluded.current_period_end) else excluded.current_period_end end,
    external_id = excluded.external_id,
    canceled_at = case when v_canceled then coalesce(s.canceled_at, now()) else null end,
    updated_at = now();
end;
$$;

-- A Stripe Checkout session for the signed-in user's plan, prefilled with the account's email. Returns its URL.
create or replace function public.stripe_checkout(p_plan text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_settings private.stripe_settings;
  v_email text;
  v_session jsonb;
begin
  if v_user is null then
    raise exception 'not_signed_in';
  end if;
  if p_plan not in ('monthly', 'yearly') then
    raise exception 'invalid_plan';
  end if;
  select * into v_settings from private.stripe_settings where id;
  if not found then
    raise exception 'payments_not_configured';
  end if;
  select email into v_email from auth.users where id = v_user;

  v_session := private.stripe('POST', '/v1/checkout/sessions', jsonb_strip_nulls(jsonb_build_object(
    'mode', 'subscription',
    'line_items[0][price]', case p_plan when 'monthly' then v_settings.monthly_price_id else v_settings.yearly_price_id end,
    'line_items[0][quantity]', '1',
    'success_url', v_settings.success_url,
    'cancel_url', v_settings.cancel_url,
    'client_reference_id', v_user::text,
    'customer_email', v_email,
    'subscription_data[metadata][user_id]', v_user::text,
    'allow_promotion_codes', 'true'
  )));

  insert into private.stripe_checkouts (session_id, user_id, plan) values (v_session ->> 'id', v_user, p_plan);
  return v_session ->> 'url';
end;
$$;

-- Brings the signed-in user's subscription up to date with Stripe and returns it (or null when there is none).
-- Stripe is asked only after a recent checkout, near the end of the paid period, or twice a day. Subscriptions from
-- Lemon Squeezy are still kept up to date through lemonsqueezy_sync().
create or replace function public.stripe_sync()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_settings private.stripe_settings;
  v_subscription public.subscriptions;
  v_checkout private.stripe_checkouts;
  v_session jsonb;
begin
  if v_user is null then
    raise exception 'not_signed_in';
  end if;
  select * into v_settings from private.stripe_settings where id;
  select * into v_subscription from public.subscriptions where user_id = v_user;

  if v_settings.id is not null then
    -- A fresh checkout comes first: it may replace an older subscription.
    for v_checkout in
      select * from private.stripe_checkouts
      where user_id = v_user and linked_at is null and created_at > now() - interval '7 days'
      order by created_at desc
      limit 3
    loop
      v_session := private.stripe('GET', '/v1/checkout/sessions/' || v_checkout.session_id || '?expand[]=subscription');
      if v_session ->> 'status' = 'complete' and jsonb_typeof(v_session -> 'subscription') = 'object' then
        perform private.apply_stripe_subscription(v_user, v_session -> 'subscription');
        update private.stripe_checkouts set linked_at = now() where user_id = v_user and linked_at is null;
        select * into v_subscription from public.subscriptions where user_id = v_user;
        exit;
      elsif v_session ->> 'status' = 'expired' then
        update private.stripe_checkouts set linked_at = now() where session_id = v_checkout.session_id;
      end if;
    end loop;

    if v_subscription.provider = 'stripe' and v_subscription.external_id is not null
      and (v_subscription.current_period_end < now() + interval '1 day' or v_subscription.updated_at < now() - interval '12 hours') then
      perform private.apply_stripe_subscription(v_user, private.stripe('GET', '/v1/subscriptions/' || v_subscription.external_id));
    end if;
  end if;

  if v_subscription.provider = 'lemonsqueezy' then
    return public.lemonsqueezy_sync();
  end if;
  select * into v_subscription from public.subscriptions where user_id = v_user;
  if not found then
    return null;
  end if;
  return jsonb_build_object('plan', v_subscription.plan, 'provider', v_subscription.provider,
    'current_period_end', v_subscription.current_period_end, 'canceled_at', v_subscription.canceled_at);
end;
$$;

-- Cancelling covers Stripe too: the subscription stops renewing there and access stays until the period ends.
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
    if v_subscription.provider = 'stripe' and v_subscription.external_id is not null then
      perform private.apply_stripe_subscription(v_user,
        private.stripe('POST', '/v1/subscriptions/' || v_subscription.external_id, '{"cancel_at_period_end": "true"}'::jsonb));
    elsif v_subscription.provider = 'lemonsqueezy' and v_subscription.external_id is not null then
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

revoke all on function private.stripe(text, text, jsonb) from public, anon, authenticated;
revoke all on function private.apply_stripe_subscription(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.stripe_checkout(text) from public, anon;
revoke all on function public.stripe_sync() from public, anon;
grant execute on function public.stripe_checkout(text) to authenticated;
grant execute on function public.stripe_sync() to authenticated;
