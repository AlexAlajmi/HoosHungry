create table if not exists public.marketplace_users (
    id text primary key,
    name text not null,
    role text not null check (role in ('Seller', 'Buyer')),
    meal_exchange_available boolean not null default false,
    wallet_balance numeric(10, 2) not null default 0,
    headline text not null default '',
    created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.offers (
    id text primary key,
    request_group_id text not null,
    buyer_id text not null references public.marketplace_users(id),
    seller_id text not null references public.marketplace_users(id),
    price numeric(10, 2) not null,
    status text not null check (status in ('Pending', 'Accepted', 'Declined')),
    created_at timestamptz not null
);

create table if not exists public.orders (
    id text primary key,
    offer_id text not null references public.offers(id),
    request_group_id text not null,
    invoice_id text not null,
    buyer_id text not null references public.marketplace_users(id),
    seller_id text not null references public.marketplace_users(id),
    offered_price numeric(10, 2) not null,
    grubhub_confirmed boolean not null default false,
    funds_released_to_seller boolean not null default false,
    status text not null check (status in ('AwaitingConfirmation', 'Preparing', 'ReadySoon', 'ReadyForPickup', 'Completed', 'Declined')),
    created_at timestamptz not null,
    estimated_ready_at_utc timestamptz null
);

create table if not exists public.tracking_events (
    id text primary key,
    order_id text not null references public.orders(id) on delete cascade,
    status text not null check (status in ('AwaitingConfirmation', 'Preparing', 'ReadySoon', 'ReadyForPickup', 'Completed', 'Declined')),
    label text not null,
    detail text not null,
    created_at timestamptz not null,
    estimated_ready_at_utc timestamptz null
);

create table if not exists public.notifications (
    id text primary key,
    user_id text not null references public.marketplace_users(id) on delete cascade,
    title text not null,
    message text not null,
    created_at timestamptz not null
);

create table if not exists public.withdrawals (
    id text primary key,
    seller_id text not null references public.marketplace_users(id),
    amount numeric(10, 2) not null,
    created_at timestamptz not null
);

insert into public.marketplace_users (id, name, role, meal_exchange_available, wallet_balance, headline)
values
    ('seller-1', 'Ava Carter', 'Seller', true, 18.50, 'Usually near Newcomb Hall until 6:30 PM'),
    ('seller-2', 'Noah Kim', 'Seller', false, 27.00, 'Prefers quick handoff at O''Hill'),
    ('seller-3', 'Jules Park', 'Seller', true, 9.75, 'Often accepts dinner requests after 5:00 PM'),
    ('buyer-1', 'Riley Moss', 'Buyer', false, 0, 'Needs quick lunch turnaround'),
    ('buyer-2', 'Sam Rivera', 'Buyer', false, 0, 'Usually buying dinner on late lab nights')
on conflict (id) do nothing;

alter table public.marketplace_users enable row level security;
alter table public.offers enable row level security;
alter table public.orders enable row level security;
alter table public.tracking_events enable row level security;
alter table public.notifications enable row level security;
alter table public.withdrawals enable row level security;
