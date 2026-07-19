-- ============================================================================
-- Stable Manager — Dashboard views
--
-- All views use `security_invoker = true` so they run with the *caller's*
-- permissions and existing RLS policies apply transparently — no stable_id
-- parameter needed, and no risk of leaking cross-tenant data through a view.
-- ============================================================================

-- Aggregate counters for the main dashboard cards.
create view public.dashboard_stats
with (security_invoker = true) as
select
  (select count(*) from public.horses where active = true) as total_horses,
  (select count(*) from public.stalls where status = 'occupied') as occupied_stalls,
  (select count(*) from public.stalls where status = 'available') as available_stalls,
  (select count(*) from public.payments
     where status = 'due' and due_date between current_date and current_date + interval '7 days') as upcoming_payments,
  (select count(*) from public.payments
     where status = 'overdue' or (status = 'due' and due_date < current_date)) as overdue_payments,
  (select count(*) from public.tasks
     where completed = false and due_date = current_date) as today_tasks,
  (select count(*) from public.calendar_events
     where event_type = 'vet' and start_time between now() and now() + interval '14 days') as upcoming_vet_visits,
  (select count(*) from public.calendar_events
     where event_type = 'farrier' and start_time between now() and now() + interval '14 days') as upcoming_farrier_visits;

-- Row-level detail lists backing each dashboard card.
create view public.upcoming_payments_list
with (security_invoker = true) as
select p.*, h.name as horse_name, o.full_name as owner_name
from public.payments p
join public.contracts c on c.id = p.contract_id
join public.horses h on h.id = c.horse_id
join public.owners o on o.id = p.owner_id
where p.status = 'due' and p.due_date between current_date and current_date + interval '7 days'
order by p.due_date asc;

create view public.overdue_payments_list
with (security_invoker = true) as
select p.*, h.name as horse_name, o.full_name as owner_name
from public.payments p
join public.contracts c on c.id = p.contract_id
join public.horses h on h.id = c.horse_id
join public.owners o on o.id = p.owner_id
where p.status = 'overdue' or (p.status = 'due' and p.due_date < current_date)
order by p.due_date asc;

create view public.today_tasks_list
with (security_invoker = true) as
select t.*, h.name as horse_name
from public.tasks t
left join public.horses h on h.id = t.horse_id
where t.completed = false and t.due_date = current_date
order by t.priority desc, t.created_at asc;

create view public.upcoming_vet_visits_list
with (security_invoker = true) as
select e.*, h.name as horse_name
from public.calendar_events e
left join public.horses h on h.id = e.horse_id
where e.event_type = 'vet' and e.start_time between now() and now() + interval '14 days'
order by e.start_time asc;

create view public.upcoming_farrier_visits_list
with (security_invoker = true) as
select e.*, h.name as horse_name
from public.calendar_events e
left join public.horses h on h.id = e.horse_id
where e.event_type = 'farrier' and e.start_time between now() and now() + interval '14 days'
order by e.start_time asc;

-- Unified recent-activity feed across the most relevant tables.
create view public.recent_activity
with (security_invoker = true) as
select id, 'horse_added'::text as activity_type, name as summary, created_at from public.horses
union all
select id, 'owner_added'::text, full_name, created_at from public.owners
union all
select id, 'contract_created'::text, status::text, created_at from public.contracts
union all
select id, 'payment_recorded'::text, amount::text || ' (' || status::text || ')', created_at from public.payments
union all
select id, 'task_created'::text, title, created_at from public.tasks
union all
select id, 'medical_record_added'::text, coalesce(type, 'Medical record'), created_at from public.medical_records
order by created_at desc
limit 50;
