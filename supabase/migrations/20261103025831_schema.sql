-- Slice 1 schema. Terms follow GLOSSARY.md; design in docs/technical-design.md §4.
-- Access rules (RLS, grants) live in the next migration.

create type public.user_role as enum ('team_leader', 'project_manager');
create type public.product_unit as enum ('each', 'cartridge', 'metre');
create type public.solution_shape as enum ('round', 'rectangular', 'linear', 'unknown');
create type public.escalation_state as enum ('open', 'resolved');
create type public.escalation_resolution as enum (
  'stock_arriving',
  'different_solution_nominated',
  'planned_work_rescheduled'
);
create type public.escalation_line_reason as enum (
  'shortage',
  'no_nominated_solution',
  'no_product_requirement',
  'no_stock_record'
);

-- People -------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 100),
  role public.user_role not null,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

-- Catalogue ----------------------------------------------------------------

create table public.solutions (
  id uuid primary key default gen_random_uuid(),
  internal_code text not null unique,
  -- Raw catalogue columns, kept unchanged for traceability.
  supplier_ref_code text not null,
  supplier text not null,
  orientation text not null,
  substrate_raw text not null,
  service_classification text not null,
  service_type_raw text not null,
  service_size_raw text not null,
  integrity_raw text not null,
  insulation_raw text not null,
  service_type_option text not null,
  substrate_option text not null,
  -- Cleaned fields.
  shape public.solution_shape not null default 'unknown',
  diameter_mm numeric(8, 2) check (diameter_mm > 0),
  width_mm numeric(8, 2) check (width_mm > 0),
  height_mm numeric(8, 2) check (height_mm > 0),
  substrate_type text,
  substrate_thickness_mm numeric(8, 2) check (substrate_thickness_mm > 0),
  integrity_minutes integer check (integrity_minutes > 0),
  insulation_minutes integer check (insulation_minutes > 0),
  parse_flags text[] not null default '{}'
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  unit public.product_unit not null,
  is_sample boolean not null default true
);

create table public.product_requirements (
  solution_id uuid not null references public.solutions (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity_per_penetration numeric(10, 3) not null check (quantity_per_penetration > 0),
  is_sample boolean not null default true,
  primary key (solution_id, product_id)
);

-- Sites and planning -------------------------------------------------------

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_sample boolean not null default true
);

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  label text not null,
  service_type text not null,
  service_size text not null,
  orientation text not null,
  substrate text not null,
  integrity_minutes integer check (integrity_minutes > 0),
  insulation_minutes integer check (insulation_minutes > 0)
);
create index scenarios_site_id_idx on public.scenarios (site_id);

-- A missing row means the scenario has no nominated solution.
create table public.nominated_solutions (
  scenario_id uuid primary key references public.scenarios (id) on delete cascade,
  solution_id uuid not null references public.solutions (id),
  nominated_at timestamptz not null default now()
);

create table public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_leader_id uuid not null references public.profiles (id)
);
create index crews_team_leader_id_idx on public.crews (team_leader_id);

create table public.planned_work (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews (id) on delete cascade,
  site_id uuid not null references public.sites (id),
  work_date date not null,
  created_at timestamptz not null default now()
);
create index planned_work_work_date_idx on public.planned_work (work_date, created_at);
create index planned_work_crew_id_idx on public.planned_work (crew_id);

create table public.planned_work_items (
  planned_work_id uuid not null references public.planned_work (id) on delete cascade,
  scenario_id uuid not null references public.scenarios (id),
  penetration_count integer not null check (penetration_count > 0),
  primary key (planned_work_id, scenario_id)
);

-- Supply -------------------------------------------------------------------

-- A missing row means there is no stock record for the product.
create table public.stock (
  product_id uuid primary key references public.products (id) on delete cascade,
  quantity integer not null check (quantity >= 0),
  updated_at timestamptz not null default now()
);

create table public.expected_deliveries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  expected_date date not null,
  received_at timestamptz
);
create index expected_deliveries_product_id_idx on public.expected_deliveries (product_id);

-- Escalation ---------------------------------------------------------------

create table public.escalations (
  -- Created on the device so offline retries are idempotent.
  id uuid primary key default gen_random_uuid(),
  planned_work_id uuid not null references public.planned_work (id) on delete cascade,
  raised_by uuid not null default auth.uid() references public.profiles (id),
  raised_at timestamptz not null default now(),
  state public.escalation_state not null default 'open',
  resolution public.escalation_resolution,
  resolution_comment text check (char_length(resolution_comment) <= 1000),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  shortage_cleared_at_sync boolean not null default false,
  constraint escalations_resolution_matches_state check (
    (state = 'open' and resolution is null and resolved_by is null and resolved_at is null)
    or (state = 'resolved' and resolution is not null and resolved_by is not null and resolved_at is not null)
  )
);
-- At most one Open escalation per planned work.
create unique index escalations_one_open_per_planned_work
  on public.escalations (planned_work_id) where state = 'open';

create table public.escalation_lines (
  id uuid primary key default gen_random_uuid(),
  escalation_id uuid not null references public.escalations (id) on delete cascade,
  product_id uuid references public.products (id),
  quantity_short numeric(10, 3) check (quantity_short >= 0),
  reason public.escalation_line_reason not null
);
create index escalation_lines_escalation_id_idx on public.escalation_lines (escalation_id);

create table public.escalation_notes (
  id uuid primary key default gen_random_uuid(),
  escalation_id uuid not null references public.escalations (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index escalation_notes_escalation_id_idx on public.escalation_notes (escalation_id);

-- Assistant ----------------------------------------------------------------

create table public.assistant_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  window_start timestamptz not null,
  message_count integer not null default 0 check (message_count >= 0),
  primary key (user_id, window_start)
);
