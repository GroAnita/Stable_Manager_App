-- ============================================================================
-- Stable Manager — Operational tables: tasks, calendar_events, medical_records,
-- feeding_plans, documents, notifications
-- ============================================================================

-- ----------------------------------------------------------------------------
-- tasks
-- ----------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  stable_id uuid not null references public.stables(id) on delete cascade,
  horse_id uuid references public.horses(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  priority public.task_priority not null default 'medium',
  due_date date,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_stable_id on public.tasks(stable_id);
create index idx_tasks_horse_id on public.tasks(horse_id);
create index idx_tasks_assigned_to on public.tasks(assigned_to);
create index idx_tasks_due_date on public.tasks(due_date);
create index idx_tasks_completed on public.tasks(completed);

create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- calendar_events
-- ----------------------------------------------------------------------------
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  stable_id uuid not null references public.stables(id) on delete cascade,
  horse_id uuid references public.horses(id) on delete cascade,
  owner_id uuid references public.owners(id) on delete set null,
  title text not null,
  description text,
  event_type public.calendar_event_type not null,
  start_time timestamptz not null,
  end_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_calendar_events_stable_id on public.calendar_events(stable_id);
create index idx_calendar_events_horse_id on public.calendar_events(horse_id);
create index idx_calendar_events_start_time on public.calendar_events(start_time);
create index idx_calendar_events_event_type on public.calendar_events(event_type);

create trigger trg_calendar_events_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- medical_records
-- ----------------------------------------------------------------------------
create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  stable_id uuid not null references public.stables(id) on delete cascade,
  horse_id uuid not null references public.horses(id) on delete cascade,
  type text,
  date date not null default current_date,
  veterinarian text,
  description text,
  medication text,
  next_due date,
  document_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_medical_records_stable_id on public.medical_records(stable_id);
create index idx_medical_records_horse_id on public.medical_records(horse_id);
create index idx_medical_records_next_due on public.medical_records(next_due);

create trigger trg_medical_records_updated_at
  before update on public.medical_records
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- feeding_plans — one horse has exactly one feeding plan.
-- ----------------------------------------------------------------------------
create table public.feeding_plans (
  id uuid primary key default gen_random_uuid(),
  stable_id uuid not null references public.stables(id) on delete cascade,
  horse_id uuid not null unique references public.horses(id) on delete cascade,
  morning_hay text,
  morning_feed text,
  morning_supplements text,
  lunch text,
  evening_hay text,
  evening_feed text,
  evening_supplements text,
  special_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_feeding_plans_stable_id on public.feeding_plans(stable_id);

create trigger trg_feeding_plans_updated_at
  before update on public.feeding_plans
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- documents — metadata rows pointing at files in Supabase Storage.
-- ----------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  stable_id uuid not null references public.stables(id) on delete cascade,
  horse_id uuid references public.horses(id) on delete cascade,
  owner_id uuid references public.owners(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete cascade,
  document_type public.document_type not null,
  file_url text not null,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_documents_stable_id on public.documents(stable_id);
create index idx_documents_horse_id on public.documents(horse_id);
create index idx_documents_owner_id on public.documents(owner_id);
create index idx_documents_contract_id on public.documents(contract_id);
create index idx_documents_document_type on public.documents(document_type);

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  stable_id uuid not null references public.stables(id) on delete cascade,
  title text not null,
  message text,
  notification_type public.notification_type not null,
  horse_id uuid references public.horses(id) on delete cascade,
  owner_id uuid references public.owners(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_stable_id on public.notifications(stable_id);
create index idx_notifications_is_read on public.notifications(is_read);
create index idx_notifications_created_at on public.notifications(created_at);
