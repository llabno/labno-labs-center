-- Rate limit log table for per-user, per-endpoint rate limiting
create table if not exists rate_limit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  identifier text not null,
  endpoint text not null,
  request_count int not null default 1
);

-- Index for fast lookups by identifier + endpoint within a time window
create index idx_rate_limit_log_lookup
  on rate_limit_log (identifier, endpoint, created_at desc);

-- Enable RLS — service_role only (no user-facing policies)
alter table rate_limit_log enable row level security;

-- Function: check_rate_limit
-- Returns true if the request is allowed, false if rate limited.
-- Always inserts the current request into the log.
create or replace function check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_limit int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_count int;
  v_window_start timestamptz;
begin
  v_window_start := now() - (p_window_seconds || ' seconds')::interval;

  -- Count existing requests in window
  select coalesce(sum(request_count), 0) into v_count
  from rate_limit_log
  where identifier = p_identifier
    and endpoint = p_endpoint
    and created_at >= v_window_start;

  -- Always log the current request
  insert into rate_limit_log (identifier, endpoint)
  values (p_identifier, p_endpoint);

  -- Return whether this request is within the limit
  return v_count < p_limit;
end;
$$;

-- Function: cleanup_rate_limits
-- Deletes entries older than 1 hour to keep the table small.
create or replace function cleanup_rate_limits()
returns void
language plpgsql
security definer
as $$
begin
  delete from rate_limit_log
  where created_at < now() - interval '1 hour';
end;
$$;
