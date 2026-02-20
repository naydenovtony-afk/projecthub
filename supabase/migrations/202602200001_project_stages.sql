-- Project stages table + RLS access model (owner/member/admin)

create table if not exists public.project_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'planning' check (status in ('planning', 'active', 'completed', 'paused')),
  sort_order integer not null default 0,
  start_date date,
  end_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

comment on table public.project_stages is 'Project stages/milestones within a project';

create index if not exists idx_project_stages_project_id on public.project_stages(project_id);
create index if not exists idx_project_stages_status on public.project_stages(status);
create index if not exists idx_project_stages_sort_order on public.project_stages(project_id, sort_order);

-- updated_at trigger
create or replace function public.set_project_stages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_on_project_stages on public.project_stages;
create trigger set_updated_at_on_project_stages
before update on public.project_stages
for each row execute procedure public.set_project_stages_updated_at();

alter table public.project_stages enable row level security;

drop policy if exists project_stages_select on public.project_stages;
create policy project_stages_select on public.project_stages
for select using (
  exists (
    select 1
    from public.projects p
    where p.id = project_stages.project_id
      and (
        p.user_id = auth.uid()
        or public.is_admin()
        or (
          exists (
            select 1
            from public.project_members pm
            where pm.project_id = p.id
              and pm.user_id = auth.uid()
          )
        )
      )
  )
);

drop policy if exists project_stages_insert on public.project_stages;
create policy project_stages_insert on public.project_stages
for insert with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_stages.project_id
      and (
        p.user_id = auth.uid()
        or public.is_admin()
        or (
          exists (
            select 1
            from public.project_members pm
            where pm.project_id = p.id
              and pm.user_id = auth.uid()
          )
        )
      )
  )
);

drop policy if exists project_stages_update on public.project_stages;
create policy project_stages_update on public.project_stages
for update using (
  exists (
    select 1
    from public.projects p
    where p.id = project_stages.project_id
      and (
        p.user_id = auth.uid()
        or public.is_admin()
        or (
          exists (
            select 1
            from public.project_members pm
            where pm.project_id = p.id
              and pm.user_id = auth.uid()
          )
        )
      )
  )
);

drop policy if exists project_stages_delete on public.project_stages;
create policy project_stages_delete on public.project_stages
for delete using (
  exists (
    select 1
    from public.projects p
    where p.id = project_stages.project_id
      and (
        p.user_id = auth.uid()
        or public.is_admin()
        or (
          exists (
            select 1
            from public.project_members pm
            where pm.project_id = p.id
              and pm.user_id = auth.uid()
          )
        )
      )
  )
);
