-- Project members + owner/member access model

-- 1) Project members table
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member')),
  created_at timestamp with time zone not null default now(),
  unique(project_id, user_id)
);

comment on table public.project_members is 'Project membership assignments (project, user)';

create index if not exists idx_project_members_project_id on public.project_members(project_id);
create index if not exists idx_project_members_user_id on public.project_members(user_id);

alter table public.project_members enable row level security;

-- 2) Helper for owner/member checks
create or replace function public.is_project_member(p_project_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = p_user_id
  );
$$;

-- 3) Project members policies
drop policy if exists project_members_select on public.project_members;
create policy project_members_select on public.project_members
  for select using (
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = project_members.project_id
        and p.user_id = auth.uid()
    )
    or public.is_project_member(project_members.project_id)
  );

drop policy if exists project_members_insert on public.project_members;
create policy project_members_insert on public.project_members
  for insert with check (
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = project_members.project_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists project_members_delete on public.project_members;
create policy project_members_delete on public.project_members
  for delete using (
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = project_members.project_id
        and p.user_id = auth.uid()
    )
  );

-- 4) Projects policies: owner/member visibility
-- Keep visibility='public' readable as before, and add member access explicitly.
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select using (
    visibility = 'public'
    or user_id = auth.uid()
    or public.is_project_member(id)
    or public.is_admin()
  );

-- 5) Task policies: owner/member/admin access to project tasks
-- (project stages table is not present in current schema; apply same pattern when introduced)
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select using (
    exists (
      select 1
      from public.projects pr
      where pr.id = tasks.project_id
        and (
          pr.user_id = auth.uid()
          or public.is_project_member(pr.id)
          or public.is_admin()
        )
    )
  );

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert with check (
    exists (
      select 1
      from public.projects pr
      where pr.id = tasks.project_id
        and (
          pr.user_id = auth.uid()
          or public.is_project_member(pr.id)
          or public.is_admin()
        )
    )
  );

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update using (
    exists (
      select 1
      from public.projects pr
      where pr.id = tasks.project_id
        and (
          pr.user_id = auth.uid()
          or public.is_project_member(pr.id)
          or public.is_admin()
        )
    )
  );

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete using (
    exists (
      select 1
      from public.projects pr
      where pr.id = tasks.project_id
        and (
          pr.user_id = auth.uid()
          or public.is_project_member(pr.id)
          or public.is_admin()
        )
    )
  );

-- 6) Project file + update policies: owner/member/admin access to project assets

drop policy if exists project_files_select on public.project_files;
create policy project_files_select on public.project_files
  for select using (
    exists (
      select 1
      from public.projects pr
      where pr.id = project_files.project_id
        and (
          pr.user_id = auth.uid()
          or public.is_project_member(pr.id)
          or public.is_admin()
        )
    )
  );

drop policy if exists project_files_insert on public.project_files;
create policy project_files_insert on public.project_files
  for insert with check (
    exists (
      select 1
      from public.projects pr
      where pr.id = project_files.project_id
        and (
          pr.user_id = auth.uid()
          or public.is_project_member(pr.id)
          or public.is_admin()
        )
    )
  );

drop policy if exists project_files_update on public.project_files;
create policy project_files_update on public.project_files
  for update using (
    exists (
      select 1
      from public.projects pr
      where pr.id = project_files.project_id
        and (
          pr.user_id = auth.uid()
          or public.is_project_member(pr.id)
          or public.is_admin()
        )
    )
  );

drop policy if exists project_files_delete on public.project_files;
create policy project_files_delete on public.project_files
  for delete using (
    exists (
      select 1
      from public.projects pr
      where pr.id = project_files.project_id
        and (
          pr.user_id = auth.uid()
          or public.is_project_member(pr.id)
          or public.is_admin()
        )
    )
  );

drop policy if exists project_updates_select on public.project_updates;
create policy project_updates_select on public.project_updates
  for select using (
    exists (
      select 1
      from public.projects pr
      where pr.id = project_updates.project_id
        and (
          pr.user_id = auth.uid()
          or public.is_project_member(pr.id)
          or public.is_admin()
        )
    )
  );

drop policy if exists project_updates_insert on public.project_updates;
create policy project_updates_insert on public.project_updates
  for insert with check (
    exists (
      select 1
      from public.projects pr
      where pr.id = project_updates.project_id
        and (
          pr.user_id = auth.uid()
          or public.is_project_member(pr.id)
          or public.is_admin()
        )
    )
  );

-- 7) Storage policies for project files bucket

drop policy if exists project_files_storage_select on storage.objects;
create policy project_files_storage_select on storage.objects
  for select using (
    bucket_id = 'project-files'
    and exists (
      select 1
      from public.projects p
      where p.id::text = split_part(name, '/', 2)
        and (
          p.user_id = auth.uid()
          or public.is_project_member(p.id)
          or public.is_admin()
        )
    )
  );

drop policy if exists project_files_storage_insert on storage.objects;
create policy project_files_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'project-files'
    and exists (
      select 1
      from public.projects p
      where p.id::text = split_part(name, '/', 2)
        and (
          p.user_id = auth.uid()
          or public.is_project_member(p.id)
          or public.is_admin()
        )
    )
  );

drop policy if exists project_files_storage_update on storage.objects;
create policy project_files_storage_update on storage.objects
  for update using (
    bucket_id = 'project-files'
    and exists (
      select 1
      from public.projects p
      where p.id::text = split_part(name, '/', 2)
        and (
          p.user_id = auth.uid()
          or public.is_project_member(p.id)
          or public.is_admin()
        )
    )
  );

drop policy if exists project_files_storage_delete on storage.objects;
create policy project_files_storage_delete on storage.objects
  for delete using (
    bucket_id = 'project-files'
    and exists (
      select 1
      from public.projects p
      where p.id::text = split_part(name, '/', 2)
        and (
          p.user_id = auth.uid()
          or public.is_project_member(p.id)
          or public.is_admin()
        )
    )
  );
