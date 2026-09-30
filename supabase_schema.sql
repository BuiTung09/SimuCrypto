-- PostgreSQL schema for SimuCryto (without Supabase-specific auth.* dependency)
-- Target: PostgreSQL 14+

create extension if not exists pgcrypto;

-- =============================
-- Utility
-- =============================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================
-- Enums
-- =============================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('user', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'experience_level') then
    create type public.experience_level as enum ('beginner', 'intermediate', 'advanced');
  end if;

  if not exists (select 1 from pg_type where typname = 'trade_side') then
    create type public.trade_side as enum ('buy', 'sell');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum ('active', 'expired', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'billing_cycle') then
    create type public.billing_cycle as enum ('monthly', 'semiannual', 'annual');
  end if;

  if not exists (select 1 from pg_type where typname = 'balance_ledger_entry_type') then
    create type public.balance_ledger_entry_type as enum (
      'trade_buy',
      'trade_sell',
      'manual_adjustment'
    );
  end if;
end $$;

-- =============================
-- Users / Auth
-- =============================
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  username text not null,
  display_name text,
  avatar_url text,
  role public.user_role not null default 'user',
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_format_chk check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  constraint users_username_len_chk check (char_length(trim(username)) between 3 and 40)
);

create unique index if not exists ux_users_email_ci on public.users (lower(email));
create unique index if not exists ux_users_username_ci on public.users (lower(username));

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  refresh_token_hash text not null,
  user_agent text,
  ip_address inet,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_sessions_user_id on public.user_sessions (user_id);
create index if not exists idx_user_sessions_expires_at on public.user_sessions (expires_at);

-- =============================
-- Membership Plans
-- =============================
create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  code public.billing_cycle not null unique,
  name text not null,
  duration_months integer not null,
  price numeric(12, 2) not null,
  currency char(3) not null default 'VND',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_plans_duration_chk check (duration_months in (1, 6, 12)),
  constraint membership_plans_price_non_negative_chk check (price >= 0),
  constraint membership_plans_currency_len_chk check (char_length(currency) = 3)
);

drop trigger if exists trg_membership_plans_updated_at on public.membership_plans;
create trigger trg_membership_plans_updated_at
before update on public.membership_plans
for each row execute function public.set_updated_at();

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_id uuid not null references public.membership_plans(id),
  status public.subscription_status not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz not null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_subscriptions_end_after_start_chk check (ended_at > started_at)
);

create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions (user_id);
create index if not exists idx_user_subscriptions_status on public.user_subscriptions (status);
create index if not exists idx_user_subscriptions_ended_at on public.user_subscriptions (ended_at);

create unique index if not exists ux_user_subscriptions_single_active
on public.user_subscriptions (user_id)
where status = 'active';

drop trigger if exists trg_user_subscriptions_updated_at on public.user_subscriptions;
create trigger trg_user_subscriptions_updated_at
before update on public.user_subscriptions
for each row execute function public.set_updated_at();

insert into public.membership_plans (code, name, duration_months, price, currency)
values
  ('monthly', 'Goi 1 thang', 1, 99000, 'VND'),
  ('semiannual', 'Goi 6 thang', 6, 499000, 'VND'),
  ('annual', 'Goi 12 thang', 12, 899000, 'VND')
on conflict (code) do update
set
  name = excluded.name,
  duration_months = excluded.duration_months,
  price = excluded.price,
  currency = excluded.currency,
  is_active = true;

-- =============================
-- Practice Trading / Portfolio
-- =============================
create table if not exists public.portfolio_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  initial_virtual_balance numeric(20, 8) not null default 10000,
  virtual_balance numeric(20, 8) not null default 10000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_balance_non_negative_chk check (virtual_balance >= 0),
  constraint portfolio_initial_balance_non_negative_chk check (initial_virtual_balance >= 0)
);

drop trigger if exists trg_portfolio_accounts_updated_at on public.portfolio_accounts;
create trigger trg_portfolio_accounts_updated_at
before update on public.portfolio_accounts
for each row execute function public.set_updated_at();

create table if not exists public.portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.portfolio_accounts(id) on delete cascade,
  pair_symbol varchar(20) not null,
  amount numeric(30, 12) not null default 0,
  avg_buy_price numeric(30, 12) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_holdings_amount_non_negative_chk check (amount >= 0),
  constraint portfolio_holdings_avg_price_non_negative_chk check (avg_buy_price >= 0),
  unique (account_id, pair_symbol)
);

create index if not exists idx_portfolio_holdings_account_id on public.portfolio_holdings (account_id);
create index if not exists idx_portfolio_holdings_pair_symbol on public.portfolio_holdings (pair_symbol);

drop trigger if exists trg_portfolio_holdings_updated_at on public.portfolio_holdings;
create trigger trg_portfolio_holdings_updated_at
before update on public.portfolio_holdings
for each row execute function public.set_updated_at();

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.portfolio_accounts(id) on delete cascade,
  pair_symbol varchar(20) not null,
  side public.trade_side not null,
  quantity numeric(30, 12) not null,
  price numeric(30, 12) not null,
  total_value numeric(30, 12) generated always as (quantity * price) stored,
  fee_value numeric(30, 12) not null default 0,
  executed_at timestamptz not null default now(),
  constraint trades_quantity_positive_chk check (quantity > 0),
  constraint trades_price_positive_chk check (price > 0),
  constraint trades_fee_non_negative_chk check (fee_value >= 0)
);

create index if not exists idx_trades_account_id_executed_at on public.trades (account_id, executed_at desc);
create index if not exists idx_trades_pair_symbol on public.trades (pair_symbol);

create table if not exists public.balance_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.portfolio_accounts(id) on delete cascade,
  trade_id uuid references public.trades(id) on delete set null,
  entry_type public.balance_ledger_entry_type not null,
  amount_delta numeric(30, 12) not null,
  balance_before numeric(20, 8) not null,
  balance_after numeric(20, 8) not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_balance_ledger_account_id_created_at
on public.balance_ledger (account_id, created_at desc);

create index if not exists idx_balance_ledger_trade_id
on public.balance_ledger (trade_id);

-- =============================
-- Trading Execution (Buy / Sell)
-- =============================
create or replace function public.execute_buy_order(
  p_user_id uuid,
  p_account_id uuid,
  p_pair_symbol text,
  p_quantity numeric,
  p_price numeric,
  p_fee numeric default 0
)
returns table (
  trade_id uuid,
  account_balance numeric(20, 8),
  holding_amount numeric(30, 12),
  execution_price numeric(30, 12),
  executed_at timestamptz
)
language plpgsql
as $$
declare
  v_pair_symbol varchar(20);
  v_old_amount numeric(30, 12);
  v_old_avg_price numeric(30, 12);
  v_new_amount numeric(30, 12);
  v_new_avg_price numeric(30, 12);
  v_total_cost numeric(30, 12);
  v_balance_before numeric(20, 8);
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be > 0';
  end if;

  if p_price is null or p_price <= 0 then
    raise exception 'Price must be > 0';
  end if;

  if p_fee is null or p_fee < 0 then
    raise exception 'Fee must be >= 0';
  end if;

  v_pair_symbol := upper(trim(p_pair_symbol));
  if v_pair_symbol is null or v_pair_symbol = '' then
    raise exception 'Pair symbol is required';
  end if;

  v_total_cost := (p_quantity * p_price) + p_fee;

  update public.portfolio_accounts
  set virtual_balance = virtual_balance - v_total_cost
  where id = p_account_id
    and user_id = p_user_id
    and virtual_balance >= v_total_cost
  returning virtual_balance into account_balance;

  if not found then
    raise exception 'Insufficient balance or invalid account';
  end if;

  v_balance_before := account_balance + v_total_cost;

  insert into public.portfolio_holdings (account_id, pair_symbol, amount, avg_buy_price)
  values (p_account_id, v_pair_symbol, 0, 0)
  on conflict (account_id, pair_symbol) do nothing;

  select h.amount, h.avg_buy_price
  into v_old_amount, v_old_avg_price
  from public.portfolio_holdings h
  where h.account_id = p_account_id
    and h.pair_symbol = v_pair_symbol
  for update;

  v_new_amount := v_old_amount + p_quantity;
  v_new_avg_price := case
    when v_new_amount = 0 then 0
    else ((v_old_amount * v_old_avg_price) + (p_quantity * p_price)) / v_new_amount
  end;

  update public.portfolio_holdings
  set amount = v_new_amount,
      avg_buy_price = v_new_avg_price
  where account_id = p_account_id
    and pair_symbol = v_pair_symbol
  returning amount into holding_amount;

  insert into public.trades (account_id, pair_symbol, side, quantity, price, fee_value)
  values (p_account_id, v_pair_symbol, 'buy', p_quantity, p_price, p_fee)
  returning id, price, executed_at
  into trade_id, execution_price, executed_at;

  insert into public.balance_ledger (
    account_id,
    trade_id,
    entry_type,
    amount_delta,
    balance_before,
    balance_after,
    description
  )
  values (
    p_account_id,
    trade_id,
    'trade_buy',
    -v_total_cost,
    v_balance_before,
    account_balance,
    concat('BUY ', v_pair_symbol, ' qty=', p_quantity::text, ' price=', p_price::text)
  );

  return next;
end;
$$;

create or replace function public.execute_sell_order(
  p_user_id uuid,
  p_account_id uuid,
  p_pair_symbol text,
  p_quantity numeric,
  p_price numeric,
  p_fee numeric default 0
)
returns table (
  trade_id uuid,
  account_balance numeric(20, 8),
  holding_amount numeric(30, 12),
  execution_price numeric(30, 12),
  executed_at timestamptz
)
language plpgsql
as $$
declare
  v_pair_symbol varchar(20);
  v_old_amount numeric(30, 12);
  v_new_amount numeric(30, 12);
  v_total_credit numeric(30, 12);
  v_balance_before numeric(20, 8);
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be > 0';
  end if;

  if p_price is null or p_price <= 0 then
    raise exception 'Price must be > 0';
  end if;

  if p_fee is null or p_fee < 0 then
    raise exception 'Fee must be >= 0';
  end if;

  v_pair_symbol := upper(trim(p_pair_symbol));
  if v_pair_symbol is null or v_pair_symbol = '' then
    raise exception 'Pair symbol is required';
  end if;

  v_total_credit := (p_quantity * p_price) - p_fee;
  if v_total_credit < 0 then
    raise exception 'Fee exceeds trade value';
  end if;

  perform 1
  from public.portfolio_accounts a
  where a.id = p_account_id
    and a.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Invalid account';
  end if;

  select h.amount
  into v_old_amount
  from public.portfolio_holdings h
  where h.account_id = p_account_id
    and h.pair_symbol = v_pair_symbol
  for update;

  if v_old_amount is null or v_old_amount < p_quantity then
    raise exception 'Insufficient coin amount';
  end if;

  v_new_amount := v_old_amount - p_quantity;

  update public.portfolio_holdings
  set amount = v_new_amount,
      avg_buy_price = case when v_new_amount = 0 then 0 else avg_buy_price end
  where account_id = p_account_id
    and pair_symbol = v_pair_symbol
  returning amount into holding_amount;

  update public.portfolio_accounts
  set virtual_balance = virtual_balance + v_total_credit
  where id = p_account_id
  returning virtual_balance into account_balance;

  v_balance_before := account_balance - v_total_credit;

  insert into public.trades (account_id, pair_symbol, side, quantity, price, fee_value)
  values (p_account_id, v_pair_symbol, 'sell', p_quantity, p_price, p_fee)
  returning id, price, executed_at
  into trade_id, execution_price, executed_at;

  insert into public.balance_ledger (
    account_id,
    trade_id,
    entry_type,
    amount_delta,
    balance_before,
    balance_after,
    description
  )
  values (
    p_account_id,
    trade_id,
    'trade_sell',
    v_total_credit,
    v_balance_before,
    account_balance,
    concat('SELL ', v_pair_symbol, ' qty=', p_quantity::text, ' price=', p_price::text)
  );

  return next;
end;
$$;

-- =============================
-- Learning Module
-- =============================
create table if not exists public.learning_lessons (
  id bigserial primary key,
  slug text not null unique,
  title text not null,
  description text,
  level public.experience_level not null default 'beginner',
  duration_minutes integer not null default 10,
  topic_tags text[] not null default '{}',
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_lessons_duration_positive_chk check (duration_minutes > 0)
);

create index if not exists idx_learning_lessons_level on public.learning_lessons (level, sort_order);

drop trigger if exists trg_learning_lessons_updated_at on public.learning_lessons;
create trigger trg_learning_lessons_updated_at
before update on public.learning_lessons
for each row execute function public.set_updated_at();

-- =============================
-- Community
-- =============================
create table if not exists public.community_posts (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  content text not null,
  category text not null default 'Thao luan',
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_posts_title_chk check (char_length(trim(title)) > 0),
  constraint community_posts_content_chk check (char_length(trim(content)) > 0),
  constraint community_posts_likes_non_negative_chk check (likes_count >= 0),
  constraint community_posts_comments_non_negative_chk check (comments_count >= 0)
);

create index if not exists idx_community_posts_created_at on public.community_posts (created_at desc);
create index if not exists idx_community_posts_category_created_at on public.community_posts (category, created_at desc);

drop trigger if exists trg_community_posts_updated_at on public.community_posts;
create trigger trg_community_posts_updated_at
before update on public.community_posts
for each row execute function public.set_updated_at();

create table if not exists public.community_post_tags (
  post_id bigint not null references public.community_posts(id) on delete cascade,
  tag text not null,
  primary key (post_id, tag),
  constraint community_post_tags_tag_not_empty_chk check (char_length(trim(tag)) > 0)
);

create index if not exists idx_community_post_tags_tag on public.community_post_tags (tag);

create table if not exists public.community_comments (
  id bigserial primary key,
  post_id bigint not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_comments_content_chk check (char_length(trim(content)) > 0)
);

create index if not exists idx_community_comments_post_id_created_at on public.community_comments (post_id, created_at asc);

drop trigger if exists trg_community_comments_updated_at on public.community_comments;
create trigger trg_community_comments_updated_at
before update on public.community_comments
for each row execute function public.set_updated_at();

create table if not exists public.community_post_likes (
  user_id uuid not null references public.users(id) on delete cascade,
  post_id bigint not null references public.community_posts(id) on delete cascade,
  primary key (user_id, post_id)
);

create index if not exists idx_community_post_likes_post_id on public.community_post_likes (post_id);

create table if not exists public.community_follows (
  follower_id uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  primary key (follower_id, following_id),
  constraint community_follows_no_self_follow_chk check (follower_id <> following_id)
);

create index if not exists idx_community_follows_following_id on public.community_follows (following_id);

-- =============================
-- Aggregate Counters (community)
-- =============================
create or replace function public.sync_post_likes_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts
    set likes_count = likes_count + 1
    where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.community_posts
    set likes_count = greatest(likes_count - 1, 0)
    where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_post_likes_count on public.community_post_likes;
create trigger trg_sync_post_likes_count
after insert or delete on public.community_post_likes
for each row execute function public.sync_post_likes_count();

create or replace function public.sync_post_comments_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts
    set comments_count = comments_count + 1
    where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.community_posts
    set comments_count = greatest(comments_count - 1, 0)
    where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_post_comments_count on public.community_comments;
create trigger trg_sync_post_comments_count
after insert or delete on public.community_comments
for each row execute function public.sync_post_comments_count();
