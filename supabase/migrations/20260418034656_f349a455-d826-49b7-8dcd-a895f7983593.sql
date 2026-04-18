-- Paddle subscriptions table
create table if not exists public.paddle_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  paddle_subscription_id text not null unique,
  paddle_customer_id text not null,
  product_id text not null,
  price_id text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'sandbox',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, environment)
);

create index if not exists idx_paddle_subs_user_id on public.paddle_subscriptions(user_id);
create index if not exists idx_paddle_subs_paddle_id on public.paddle_subscriptions(paddle_subscription_id);

alter table public.paddle_subscriptions enable row level security;

drop policy if exists "Users view own paddle subscription" on public.paddle_subscriptions;
create policy "Users view own paddle subscription"
  on public.paddle_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Service role manages paddle subscriptions" on public.paddle_subscriptions;
create policy "Service role manages paddle subscriptions"
  on public.paddle_subscriptions for all
  using (auth.role() = 'service_role');

-- Helper function
create or replace function public.has_active_paddle_subscription(
  user_uuid uuid,
  check_env text default 'live'
)
returns boolean language sql security definer
set search_path = public
as $$
  select exists (
    select 1 from public.paddle_subscriptions
    where user_id = user_uuid
      and environment = check_env
      and status in ('active', 'trialing')
      and (current_period_end is null or current_period_end > now())
  );
$$;

-- Track paddle transaction IDs to ensure idempotency for credit grants
create table if not exists public.paddle_processed_events (
  event_id text primary key,
  event_type text not null,
  user_id uuid,
  processed_at timestamptz default now()
);

alter table public.paddle_processed_events enable row level security;

drop policy if exists "Service role manages processed events" on public.paddle_processed_events;
create policy "Service role manages processed events"
  on public.paddle_processed_events for all
  using (auth.role() = 'service_role');