-- ProjectHub schema migration
-- Defines profiles, projects, tasks, project_files, project_updates with RLS policies and indexes.

-- Ensure extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Profiles table extends auth.users
create table if not exists public.profiles (
	id uuid primary key references auth.users(id) on delete cascade,
	email text unique not null,
	full_name text,
	avatar_url text,
	bio text,
	role text default 'user' check (role in ('user', 'admin')),
	created_at timestamp with time zone default now(),
	updated_at timestamp with time zone default now()
);

comment on table public.profiles is 'User profile data extending auth.users';
comment on column public.profiles.role is 'Application role: user or admin';

-- RBAC tables
create table if not exists public.roles (
	id smallserial primary key,
	name text unique not null,
	description text,
	created_at timestamp with time zone default now()
);

create table if not exists public.user_roles (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.profiles(id) on delete cascade,
	role_id smallint not null references public.roles(id) on delete cascade,
	assigned_by uuid references public.profiles(id) on delete set null,
	assigned_at timestamp with time zone default now(),
	unique(user_id, role_id)
);

comment on table public.roles is 'System roles for RBAC';
comment on table public.user_roles is 'Role assignments per user';

insert into public.roles(name, description)
values
	('user', 'Normal application user'),
	('admin', 'Administrator with elevated access')
on conflict (name) do nothing;

-- Projects table
create table if not exists public.projects (
	id uuid primary key default uuid_generate_v4(),
	user_id uuid not null references public.profiles(id) on delete cascade,
	title text not null,
	description text,
	project_type text not null check (project_type in ('Academic & Research', 'Corporate/Business', 'EU-Funded Project', 'Public Initiative', 'Personal/Other')),
	status text default 'planning' check (status in ('planning', 'active', 'completed', 'paused', 'archived')),
	visibility text default 'private' check (visibility in ('public', 'private')),
	start_date date,
	end_date date,
	budget decimal(12,2),
	funding_source text,
	cover_image_url text,
	progress_percentage integer default 0 check (progress_percentage >= 0 and progress_percentage <= 100),
	created_at timestamp with time zone default now(),
	updated_at timestamp with time zone default now()
);

comment on table public.projects is 'Projects owned by profiles';
comment on column public.projects.visibility is 'public or private';

-- Tasks table
create table if not exists public.tasks (
	id uuid primary key default uuid_generate_v4(),
	project_id uuid not null references public.projects(id) on delete cascade,
	title text not null,
	description text,
	status text default 'todo' check (status in ('todo', 'in_progress', 'done')),
	priority text default 'medium' check (priority in ('low', 'medium', 'high')),
	due_date date,
	assigned_to uuid references public.profiles(id) on delete set null,
	created_at timestamp with time zone default now(),
	updated_at timestamp with time zone default now()
);

comment on table public.tasks is 'Tasks belonging to projects';

-- Project files table
create table if not exists public.project_files (
	id uuid primary key default uuid_generate_v4(),
	project_id uuid not null references public.projects(id) on delete cascade,
	task_id uuid references public.tasks(id) on delete set null,
	file_url text not null,
	file_name text not null,
	file_type text not null,
	file_size bigint,
	category text default 'other' check (category in ('image', 'document', 'deliverable', 'report', 'other')),
	caption text,
	uploaded_by uuid references public.profiles(id) on delete set null,
	uploaded_at timestamp with time zone default now()
);

comment on table public.project_files is 'Uploaded files for projects and tasks';

-- Project updates table
create table if not exists public.project_updates (
	id uuid primary key default uuid_generate_v4(),
	project_id uuid not null references public.projects(id) on delete cascade,
	user_id uuid not null references public.profiles(id) on delete set null,
	update_type text default 'general' check (update_type in ('general', 'milestone', 'task_completed', 'file_uploaded', 'status_changed')),
	update_text text not null,
	metadata jsonb,
	created_at timestamp with time zone default now()
);

comment on table public.project_updates is 'Activity feed for project events';

-- Updated at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
	new.updated_at = now();
	return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_on_profiles on public.profiles;
create trigger set_updated_at_on_profiles
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_on_projects on public.projects;
create trigger set_updated_at_on_projects
before update on public.projects
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_on_tasks on public.tasks;
create trigger set_updated_at_on_tasks
before update on public.tasks
for each row execute procedure public.set_updated_at();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.project_files enable row level security;
alter table public.project_updates enable row level security;

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean
language sql stable
as $$
	select exists (
		select 1
		from public.user_roles ur
		join public.roles r on r.id = ur.role_id
		where ur.user_id = auth.uid()
			and r.name = 'admin'
	) or exists (
		select 1 from public.profiles p
		where p.id = auth.uid() and p.role = 'admin'
	);
$$;

-- Create profile row when auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_role_id smallint;
begin
	insert into public.profiles (id, email, full_name)
	values (
		new.id,
		new.email,
		coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
	)
	on conflict (id) do update
	set
		email = excluded.email,
		full_name = coalesce(excluded.full_name, public.profiles.full_name),
		updated_at = now();

	select id into v_user_role_id from public.roles where name = 'user';

	if v_user_role_id is not null then
		insert into public.user_roles (user_id, role_id)
		values (new.id, v_user_role_id)
		on conflict (user_id, role_id) do nothing;
	end if;

	return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
	after insert on auth.users
	for each row execute procedure public.handle_new_user();

-- Profiles policies
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
	for select using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
	for update using (auth.uid() = id);

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
	for update using (public.is_admin());

-- RBAC policies
drop policy if exists roles_select_authenticated on public.roles;
create policy roles_select_authenticated on public.roles
	for select using (auth.role() = 'authenticated');

drop policy if exists user_roles_select_self_or_admin on public.user_roles;
create policy user_roles_select_self_or_admin on public.user_roles
	for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists user_roles_insert_admin on public.user_roles;
create policy user_roles_insert_admin on public.user_roles
	for insert with check (public.is_admin());

drop policy if exists user_roles_update_admin on public.user_roles;
create policy user_roles_update_admin on public.user_roles
	for update using (public.is_admin());

drop policy if exists user_roles_delete_admin on public.user_roles;
create policy user_roles_delete_admin on public.user_roles
	for delete using (public.is_admin());

-- Projects policies
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
	for select using (
		visibility = 'public' or user_id = auth.uid() or public.is_admin()
	);

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
	for insert with check (
		user_id = auth.uid() or public.is_admin()
	);

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
	for update using (
		user_id = auth.uid() or public.is_admin()
	);

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
	for delete using (
		user_id = auth.uid() or public.is_admin()
	);

-- Tasks policies
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
	for select using (
		exists (
			select 1 from public.projects pr
			where pr.id = tasks.project_id
				and (pr.visibility = 'public' or pr.user_id = auth.uid() or public.is_admin())
		)
	);

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
	for insert with check (
		exists (
			select 1 from public.projects pr
			where pr.id = project_id
				and (pr.user_id = auth.uid() or public.is_admin())
		)
	);

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
	for update using (
		exists (
			select 1 from public.projects pr
			where pr.id = tasks.project_id
				and (pr.user_id = auth.uid() or public.is_admin())
		)
	);

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
	for delete using (
		exists (
			select 1 from public.projects pr
			where pr.id = tasks.project_id
				and (pr.user_id = auth.uid() or public.is_admin())
		)
	);

-- Project files policies
drop policy if exists project_files_select on public.project_files;
create policy project_files_select on public.project_files
	for select using (
		exists (
			select 1 from public.projects pr
			where pr.id = project_files.project_id
				and (pr.visibility = 'public' or pr.user_id = auth.uid() or public.is_admin())
		)
	);

drop policy if exists project_files_insert on public.project_files;
create policy project_files_insert on public.project_files
	for insert with check (
		exists (
			select 1 from public.projects pr
			where pr.id = project_id
				and (pr.user_id = auth.uid() or public.is_admin())
		)
	);

drop policy if exists project_files_update on public.project_files;
create policy project_files_update on public.project_files
	for update using (
		exists (
			select 1 from public.projects pr
			where pr.id = project_files.project_id
				and (pr.user_id = auth.uid() or public.is_admin())
		)
	);

drop policy if exists project_files_delete on public.project_files;
create policy project_files_delete on public.project_files
	for delete using (
		exists (
			select 1 from public.projects pr
			where pr.id = project_files.project_id
				and (pr.user_id = auth.uid() or public.is_admin())
		)
	);

-- Project updates policies
drop policy if exists project_updates_select on public.project_updates;
create policy project_updates_select on public.project_updates
	for select using (
		exists (
			select 1 from public.projects pr
			where pr.id = project_updates.project_id
				and (pr.visibility = 'public' or pr.user_id = auth.uid() or public.is_admin())
		)
	);

drop policy if exists project_updates_insert on public.project_updates;
create policy project_updates_insert on public.project_updates
	for insert with check (
		exists (
			select 1 from public.projects pr
			where pr.id = project_id
				and (pr.user_id = auth.uid() or public.is_admin())
		)
	);

-- Indexes on foreign keys and frequent query columns
create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_visibility on public.projects(visibility);
create index if not exists idx_projects_project_type on public.projects(project_type);
create index if not exists idx_projects_created_at on public.projects(created_at);

create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_assigned_to on public.tasks(assigned_to);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_created_at on public.tasks(created_at);

create index if not exists idx_project_files_project_id on public.project_files(project_id);
create index if not exists idx_project_files_task_id on public.project_files(task_id);
create index if not exists idx_project_files_uploaded_by on public.project_files(uploaded_by);
create index if not exists idx_project_files_uploaded_at on public.project_files(uploaded_at);

create index if not exists idx_project_updates_project_id on public.project_updates(project_id);
create index if not exists idx_project_updates_user_id on public.project_updates(user_id);
create index if not exists idx_project_updates_created_at on public.project_updates(created_at);
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role_id on public.user_roles(role_id);

-- Storage bucket + RLS policies for project files
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', true)
on conflict (id) do nothing;

drop policy if exists project_files_storage_select on storage.objects;
create policy project_files_storage_select on storage.objects
	for select using (
		bucket_id = 'project-files'
		and exists (
			select 1
			from public.projects p
			where p.id::text = split_part(name, '/', 2)
				and (
					p.visibility = 'public'
					or p.user_id = auth.uid()
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
				and (p.user_id = auth.uid() or public.is_admin())
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
				and (p.user_id = auth.uid() or public.is_admin())
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
				and (p.user_id = auth.uid() or public.is_admin())
		)
	);

-- Ensure default privileges allow RLS policies to govern access
revoke all on public.profiles from public;
revoke all on public.roles from public;
revoke all on public.user_roles from public;
revoke all on public.projects from public;
revoke all on public.tasks from public;
revoke all on public.project_files from public;
revoke all on public.project_updates from public;

