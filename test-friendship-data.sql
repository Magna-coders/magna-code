-- 1. PROFILES
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text not null,
  avatar_url text,
  bio text,
  is_online boolean default false,
  created_at timestamp default now()
);

alter table profiles enable row level security;

-- RLS Policies
create policy "Profiles are viewable by everyone"
on profiles for select
to authenticated using (true);

create policy "Users can update own profile"
on profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);


-- 2. FRIEND REQUESTS
create table if not exists friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id) on delete cascade,
  receiver_id uuid references profiles(id) on delete cascade,
  message text,
  status text check (status in ('pending', 'accepted', 'declined')) default 'pending',
  created_at timestamp default now(),
  unique(sender_id, receiver_id)
);

alter table friend_requests enable row level security;

-- RLS Policies
create policy "Users can send friend requests"
on friend_requests for insert
to authenticated
with check (auth.uid() = sender_id);

create policy "Sender and receiver can view requests"
on friend_requests for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Receiver can respond to requests"
on friend_requests for update
to authenticated
using (auth.uid() = receiver_id);


-- 3. FRIENDS
create table if not exists friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  friend_id uuid references profiles(id) on delete cascade,
  connected_at timestamp default now(),
  unique(user_id, friend_id)
);

alter table friends enable row level security;

-- RLS Policies
create policy "Users can see their own friends"
on friends for select
to authenticated
using (auth.uid() = user_id);

create policy "No direct inserts by clients"
on friends for insert
to authenticated
with check (false);


-- 4. VIEWS

-- View: user_friends
create or replace view user_friends as
select
  f.user_id,
  f.friend_id,
  f.connected_at,
  p.username,
  p.email,
  p.avatar_url,
  p.bio,
  p.is_online
from friends f
join profiles p on f.friend_id = p.id;

-- View: pending_friend_requests
create or replace view pending_friend_requests as
select
  r.id,
  r.receiver_id,
  r.sender_id,
  r.message,
  r.created_at,
  p.username as sender_username,
  p.email as sender_email,
  p.avatar_url as sender_avatar_url,
  p.bio as sender_bio
from friend_requests r
join profiles p on r.sender_id = p.id
where r.status = 'pending';


-- 5. FUNCTIONS (RPC)

-- Accept request
create or replace function accept_friend_request(request_id uuid)
returns void as $$
declare
  req record;
begin
  select * into req from friend_requests where id = request_id and status = 'pending';

  if not found then
    raise exception 'Request not found or not pending';
  end if;

  -- update request status
  update friend_requests set status = 'accepted' where id = request_id;

  -- insert reciprocal friendships
  insert into friends (user_id, friend_id) values (req.sender_id, req.receiver_id)
  on conflict do nothing;

  insert into friends (user_id, friend_id) values (req.receiver_id, req.sender_id)
  on conflict do nothing;
end;
$$ language plpgsql security definer;

-- Decline request
create or replace function decline_friend_request(request_id uuid)
returns void as $$
begin
  update friend_requests
  set status = 'declined'
  where id = request_id and status = 'pending';
end;
$$ language plpgsql security definer;
