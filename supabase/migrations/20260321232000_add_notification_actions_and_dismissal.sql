alter table if exists public.notifications
    add column if not exists action_type text null,
    add column if not exists action_target_id text null,
    add column if not exists dismissed boolean not null default false;
