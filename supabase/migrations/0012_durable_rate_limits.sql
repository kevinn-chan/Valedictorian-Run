-- The login endpoint sends a real email to a real person's inbox, and until now
-- the only thing standing in front of it was an in-memory, per-IP counter
-- (src/lib/rate-limit.ts: 5 per 60s). That was sized for the stated assumption
-- — "this app has two users" — which stops holding the moment the URL is shared
-- publicly. Three separate holes:
--
--   1. Keyed by IP, so rotating source addresses resets the counter for free.
--   2. Held in a per-instance Map, so every warm serverless instance has its
--      own allowance and a cold start wipes it.
--   3. It caps the wrong noun. The thing that needs protecting is a specific
--      mailbox, and a per-IP cap cannot bound sends to a fixed address.
--
-- The failure that matters is not inbox spam, it is lockout: Supabase caps auth
-- emails per project, so an attacker who exhausts the quota stops the real
-- users signing in at all.
--
-- This gives the limiter shared, durable storage using the Postgres already
-- here — no new service, no new dependency.

create table if not exists public.rate_limits (
  id bigserial primary key,
  key text not null,
  at timestamptz not null default now()
);

create index if not exists rate_limits_key_at_idx on public.rate_limits (key, at desc);
create index if not exists rate_limits_at_idx on public.rate_limits (at);

-- RLS on with no policies at all: this table has exactly one legitimate
-- caller, the security-definer function below, reached only by service_role
-- (which bypasses RLS). anon and authenticated get nothing.
alter table public.rate_limits enable row level security;

-- Reports whether `p_key` has already used its `p_max` attempts inside
-- `p_window_seconds`, and records the attempt only when it is allowed.
-- Counting and inserting happen under a per-key transaction lock, so two
-- concurrent requests cannot both read an under-limit count and both pass.
create or replace function public.check_rate_limit(
  p_key text,
  p_max int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n int;
begin
  -- Serialize callers of the same key; released at transaction end.
  perform pg_advisory_xact_lock(hashtext(p_key));

  -- Under an attack with rotating IPs the key space grows quickly, so sweep
  -- globally rather than only for this key. Indexed range delete, and the
  -- horizon is comfortably longer than the longest window any caller uses.
  delete from public.rate_limits where at < now() - interval '2 hours';

  delete from public.rate_limits
   where key = p_key
     and at < now() - make_interval(secs => p_window_seconds);

  select count(*) into n from public.rate_limits where key = p_key;

  -- Record only attempts that are let through. Inserting refusals too meant a
  -- key under the limit could be held shut forever: one request per window
  -- from anywhere kept a profile unable to sign in, which is the very lockout
  -- this migration exists to prevent.
  if n >= p_max then
    return true;
  end if;

  insert into public.rate_limits (key) values (p_key);
  return false;
end;
$$;

-- 0009 and 0010 deliberately stripped EXECUTE from public/anon/authenticated
-- across this schema. Nothing here reopens that: the only caller is a
-- server-side route holding the service-role key.
revoke execute on function public.check_rate_limit(text, int, int) from public;
revoke execute on function public.check_rate_limit(text, int, int) from anon;
revoke execute on function public.check_rate_limit(text, int, int) from authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;
