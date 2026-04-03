-- ============================================
-- Missing table migrations — 2026-04-03
-- Tables referenced in code but never migrated
-- ============================================

-- 1. wishlist — Idea/task capture with AI analysis
create table if not exists wishlist (
  id uuid primary key default gen_random_uuid(),
  raw_text text not null,
  type text default 'Tool Stack',
  project text,
  priority text default 'P3 — Nice to Have',
  status text default 'New Idea',
  integration_notes text,
  related_workflows text,
  analyzed boolean default false,
  linked_project_id uuid references internal_projects(id) on delete set null,
  agent_run_id uuid references agent_runs(id) on delete set null,
  created_at timestamp with time zone default now()
);

alter table wishlist enable row level security;
create policy "Employees can read wishlist" on wishlist for select
  using (auth.jwt() ->> 'email' like '%@labnolabs.com' or auth.jwt() ->> 'email' like '%@movement-solutions.com');
create policy "Employees can insert wishlist" on wishlist for insert
  with check (auth.jwt() ->> 'email' like '%@labnolabs.com' or auth.jwt() ->> 'email' like '%@movement-solutions.com');
create policy "Employees can update wishlist" on wishlist for update
  using (auth.jwt() ->> 'email' like '%@labnolabs.com' or auth.jwt() ->> 'email' like '%@movement-solutions.com');


-- 2. blog_posts — Clinical blog post storage
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  excerpt text,
  content text,
  author text default 'Lance Labno, DPT',
  category text default 'Clinical Pearls',
  status text default 'draft',
  published_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

alter table blog_posts enable row level security;
create policy "Employees can read blog_posts" on blog_posts for select
  using (auth.jwt() ->> 'email' like '%@labnolabs.com' or auth.jwt() ->> 'email' like '%@movement-solutions.com');
create policy "Lance can write blog_posts" on blog_posts for insert
  with check (auth.jwt() ->> 'email' in ('lance@labnolabs.com', 'lance.labno@movement-solutions.com'));
create policy "Lance can update blog_posts" on blog_posts for update
  using (auth.jwt() ->> 'email' in ('lance@labnolabs.com', 'lance.labno@movement-solutions.com'));
create policy "Lance can delete blog_posts" on blog_posts for delete
  using (auth.jwt() ->> 'email' in ('lance@labnolabs.com', 'lance.labno@movement-solutions.com'));


-- 3. reactivation_queue — Inactive patient outreach queue
create table if not exists reactivation_queue (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid,
  lead_name text,
  phone text,
  email text,
  priority_score integer default 0,
  outreach_method text default 'email',
  suggested_message text,
  scoring_reasons text,
  status text default 'pending',
  contact_attempts integer default 0,
  last_contact_date date,
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

alter table reactivation_queue enable row level security;
create policy "Lance only reactivation_queue" on reactivation_queue for all
  using (auth.jwt() ->> 'email' in ('lance@labnolabs.com', 'lance.labno@movement-solutions.com'));

create index if not exists idx_reactivation_queue_status on reactivation_queue(status);
create index if not exists idx_reactivation_queue_priority on reactivation_queue(priority_score desc);


-- 4. communication_log — Communication audit trail
create table if not exists communication_log (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid,
  lead_name text,
  comm_type text not null,
  direction text default 'outbound',
  subject text,
  body text,
  status text default 'sent',
  user_email text,
  created_at timestamp with time zone default now()
);

alter table communication_log enable row level security;
create policy "Employees can read communication_log" on communication_log for select
  using (auth.jwt() ->> 'email' like '%@labnolabs.com' or auth.jwt() ->> 'email' like '%@movement-solutions.com');
create policy "Employees can insert communication_log" on communication_log for insert
  with check (auth.jwt() ->> 'email' like '%@labnolabs.com' or auth.jwt() ->> 'email' like '%@movement-solutions.com');


-- 5. work_history — Work/task completion history
create table if not exists work_history (
  id uuid primary key default gen_random_uuid(),
  task_title text not null,
  project_name text,
  requested_by text,
  executed_by text,
  agent_or_mcp text,
  category text,
  status text default 'completed',
  duration_minutes integer,
  notes text,
  files_changed integer,
  lines_added integer,
  lines_removed integer,
  created_at timestamp with time zone default now()
);

alter table work_history enable row level security;
create policy "Employees can read work_history" on work_history for select
  using (auth.jwt() ->> 'email' like '%@labnolabs.com' or auth.jwt() ->> 'email' like '%@movement-solutions.com');
create policy "Employees can insert work_history" on work_history for insert
  with check (auth.jwt() ->> 'email' like '%@labnolabs.com' or auth.jwt() ->> 'email' like '%@movement-solutions.com');


-- 6. access_log — HIPAA data access compliance
create table if not exists access_log (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  page text,
  action text default 'view',
  record_count integer,
  created_at timestamp with time zone default now()
);

alter table access_log enable row level security;
-- Only Lance can read access logs (HIPAA)
create policy "Lance only access_log read" on access_log for select
  using (auth.jwt() ->> 'email' in ('lance@labnolabs.com', 'lance.labno@movement-solutions.com'));
-- Service role handles inserts (no user-facing insert policy needed)


-- 7. audit_log — HIPAA data modification trail
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text,
  field_name text,
  old_value text,
  new_value text,
  action text not null,
  user_email text,
  created_at timestamp with time zone default now()
);

alter table audit_log enable row level security;
-- Only Lance can read audit logs (HIPAA)
create policy "Lance only audit_log read" on audit_log for select
  using (auth.jwt() ->> 'email' in ('lance@labnolabs.com', 'lance.labno@movement-solutions.com'));

create index if not exists idx_audit_log_table on audit_log(table_name);
create index if not exists idx_audit_log_record on audit_log(record_id);


-- 8. moso_sync_log — MOSO agent output audit trail
create table if not exists moso_sync_log (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  output_type text,
  title text,
  content text,
  metadata jsonb default '{}',
  energy_state text,
  domains_active jsonb default '[]',
  synced_at timestamp with time zone default now()
);

alter table moso_sync_log enable row level security;
create policy "Employees can read moso_sync_log" on moso_sync_log for select
  using (auth.jwt() ->> 'email' like '%@labnolabs.com' or auth.jwt() ->> 'email' like '%@movement-solutions.com');

create index if not exists idx_moso_sync_agent on moso_sync_log(agent);
create index if not exists idx_moso_sync_at on moso_sync_log(synced_at desc);
