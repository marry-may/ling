-- Subscriptions paid through Square (replaces WayForPay for checkout). The app asks square_checkout() for a Square
-- payment link; after paying, square_sync() looks the subscription up in Square itself (the order's payment and
-- customer, or the customer with the account's email) and copies its paid-through date. Nothing Square sends is
-- trusted: every state comes from Square's API with the seller's token, which stays in private.square_settings
-- (written by `npm run payments:square`, scripts/square-setup.mjs).

create extension if not exists http with schema extensions;

alter table public.subscriptions drop constraint if exists subscriptions_provider_check;
alter table public.subscriptions add constraint subscriptions_provider_check check (provider in ('wayforpay', 'promo', 'apple', 'square'));
-- The provider's own subscription ID (Square), used to refresh and cancel it.
alter table public.subscriptions add column if not exists external_id text;

create table if not exists private.square_settings (
  id boolean primary key default true check (id),
  environment text not null check (environment in ('sandbox', 'production')),
  access_token text not null,
  location_id text not null,
  currency text not null,
  monthly_variation_id text not null,
  yearly_variation_id text not null,
  monthly_amount integer not null,
  yearly_amount integer not null,
  redirect_url text not null,
  updated_at timestamptz not null default now()
);

-- Payment links handed out, so a payment can be traced back to the user who started it.
create table if not exists private.square_checkouts (
  order_id text primary key,
  payment_link_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null check (plan in ('monthly', 'yearly')),
  created_at timestamptz not null default now(),
  linked_at timestamptz
);

-- One call to the Square API; raises square_error on a failed response.
create or replace function private.square(p_method text, p_path text, p_body jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings private.square_settings;
  v_response extensions.http_response;
begin
  select * into v_settings from private.square_settings where id;
  if not found then
    raise exception 'payments_not_configured';
  end if;
  v_response := extensions.http((
    p_method::extensions.http_method,
    case v_settings.environment when 'production' then 'https://connect.squareup.com' else 'https://connect.squareupsandbox.com' end || p_path,
    array[extensions.http_header('Authorization', 'Bearer ' || v_settings.access_token), extensions.http_header('Square-Version', '2025-10-16')],
    'application/json',
    p_body::text
  )::extensions.http_request);
  if v_response.status >= 300 then
    raise exception 'square_error % %', v_response.status, left(v_response.content, 300);
  end if;
  return coalesce(nullif(v_response.content, ''), '{}')::jsonb;
end;
$$;

-- Copies a Square subscription into public.subscriptions: paid through charged_through_date, canceled once Square says so.
create or replace function private.apply_square_subscription(p_user uuid, p_subscription jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings private.square_settings;
  v_plan text;
  v_end timestamptz;
  v_canceled boolean;
begin
  select * into v_settings from private.square_settings where id;
  v_plan := case p_subscription ->> 'plan_variation_id' when v_settings.yearly_variation_id then 'yearly' else 'monthly' end;
  -- Access lasts through the paid-through day; a subscription that has just started counts one period from its start.
  v_end := coalesce(
    ((p_subscription ->> 'charged_through_date')::date + 1)::timestamptz,
    ((p_subscription ->> 'start_date')::date + case v_plan when 'yearly' then interval '1 year' else interval '1 month' end + interval '1 day')::timestamptz
  );
  v_canceled := p_subscription ->> 'canceled_date' is not null or p_subscription ->> 'status' in ('CANCELED', 'DEACTIVATED');

  insert into public.subscriptions as s (user_id, plan, provider, current_period_end, external_id, canceled_at, updated_at)
  values (p_user, v_plan, 'square', v_end, p_subscription ->> 'id', case when v_canceled then now() end, now())
  on conflict (user_id) do update set
    plan = excluded.plan,
    provider = 'square',
    -- Time left from a promo code is kept.
    current_period_end = case when s.provider = 'promo' then greatest(s.current_period_end, excluded.current_period_end) else excluded.current_period_end end,
    external_id = excluded.external_id,
    canceled_at = case when v_canceled then coalesce(s.canceled_at, now()) else null end,
    updated_at = now();
end;
$$;

-- A Square payment link for the signed-in user's plan. Returns the URL of Square's checkout page.
create or replace function public.square_checkout(p_plan text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_settings private.square_settings;
  v_email text;
  v_body jsonb;
  v_link jsonb;
begin
  if v_user is null then
    raise exception 'not_signed_in';
  end if;
  if p_plan not in ('monthly', 'yearly') then
    raise exception 'invalid_plan';
  end if;
  select * into v_settings from private.square_settings where id;
  if not found then
    raise exception 'payments_not_configured';
  end if;
  select email into v_email from auth.users where id = v_user;

  v_body := jsonb_build_object(
    'idempotency_key', gen_random_uuid()::text,
    'quick_pay', jsonb_build_object(
      'name', case p_plan when 'monthly' then 'Ling subscription, 1 month' else 'Ling subscription, 1 year' end,
      'price_money', jsonb_build_object('amount', case p_plan when 'monthly' then v_settings.monthly_amount else v_settings.yearly_amount end, 'currency', v_settings.currency),
      'location_id', v_settings.location_id
    ),
    'checkout_options', jsonb_build_object(
      'subscription_plan_id', case p_plan when 'monthly' then v_settings.monthly_variation_id else v_settings.yearly_variation_id end,
      'redirect_url', v_settings.redirect_url
    )
  );
  -- The account's email links the Square customer back to the user.
  if v_email is not null and v_email !~* '\.(invalid|test|example)$' then
    v_body := v_body || jsonb_build_object('pre_populated_data', jsonb_build_object('buyer_email', v_email));
  end if;

  v_link := private.square('POST', '/v2/online-checkout/payment-links', v_body) -> 'payment_link';
  insert into private.square_checkouts (order_id, payment_link_id, user_id, plan)
  values (v_link ->> 'order_id', v_link ->> 'id', v_user, p_plan);
  return v_link ->> 'url';
end;
$$;

-- Brings the signed-in user's subscription up to date with Square and returns it (or null when there is none).
-- Square is asked only when needed: after a recent checkout, near the end of the paid period, or twice a day.
create or replace function public.square_sync()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_settings private.square_settings;
  v_subscription public.subscriptions;
  v_checkout private.square_checkouts;
  v_customers text[] := '{}';
  v_tender jsonb;
  v_customer text;
  v_email text;
  v_found jsonb;
begin
  if v_user is null then
    raise exception 'not_signed_in';
  end if;
  select * into v_settings from private.square_settings where id;
  select * into v_subscription from public.subscriptions where user_id = v_user;

  if v_settings.id is not null then
    if v_subscription.provider = 'square' and v_subscription.external_id is not null
      and (v_subscription.current_period_end < now() + interval '1 day' or v_subscription.updated_at < now() - interval '12 hours') then
      perform private.apply_square_subscription(v_user,
        private.square('GET', '/v2/subscriptions/' || v_subscription.external_id) -> 'subscription');
    elsif exists (select 1 from private.square_checkouts where user_id = v_user and linked_at is null and created_at > now() - interval '7 days') then
      -- The customer behind each recent payment, then any customer with the account's email.
      for v_checkout in select * from private.square_checkouts where user_id = v_user and linked_at is null and created_at > now() - interval '7 days' loop
        for v_tender in select jsonb_array_elements(coalesce(private.square('GET', '/v2/orders/' || v_checkout.order_id) -> 'order' -> 'tenders', '[]')) loop
          v_customer := coalesce(v_tender ->> 'customer_id',
            private.square('GET', '/v2/payments/' || (v_tender ->> 'id')) -> 'payment' ->> 'customer_id');
          if v_customer is not null then
            v_customers := array_append(v_customers, v_customer);
          end if;
        end loop;
      end loop;
      select email into v_email from auth.users where id = v_user;
      if v_email is not null then
        select v_customers || coalesce(array_agg(customer ->> 'id'), '{}') into v_customers
        from jsonb_array_elements(coalesce(private.square('POST', '/v2/customers/search', jsonb_build_object('query',
          jsonb_build_object('filter', jsonb_build_object('email_address', jsonb_build_object('exact', v_email))))) -> 'customers', '[]')) customer;
      end if;

      if cardinality(v_customers) > 0 then
        select subscription into v_found
        from jsonb_array_elements(coalesce(private.square('POST', '/v2/subscriptions/search', jsonb_build_object('query',
          jsonb_build_object('filter', jsonb_build_object('customer_ids', to_jsonb(v_customers), 'location_ids', jsonb_build_array(v_settings.location_id))))) -> 'subscriptions', '[]')) subscription
        where subscription ->> 'plan_variation_id' in (v_settings.monthly_variation_id, v_settings.yearly_variation_id)
          and subscription ->> 'status' in ('ACTIVE', 'PENDING')
        order by subscription ->> 'start_date' desc
        limit 1;
        if v_found is not null then
          perform private.apply_square_subscription(v_user, v_found);
          update private.square_checkouts set linked_at = now() where user_id = v_user and linked_at is null;
        end if;
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

-- Cancelling now covers Square too: the subscription is canceled in Square and access stays until the paid date.
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
    if v_subscription.provider = 'square' and v_subscription.external_id is not null then
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
  return v_subscription.current_period_end;
end;
$$;

revoke all on function private.square(text, text, jsonb) from public, anon, authenticated;
revoke all on function private.apply_square_subscription(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.square_checkout(text) from public, anon;
revoke all on function public.square_sync() from public, anon;
grant execute on function public.square_checkout(text) to authenticated;
grant execute on function public.square_sync() to authenticated;
