-- Pop In: friend requests migration
-- Paste this into Supabase → SQL Editor → Run. Safe to run multiple times.

-- 1. Add a status column; existing rows are already accepted friendships.
alter table friends add column if not exists status text;
update friends set status = 'accepted' where status is null;
alter table friends alter column status set default 'pending';
alter table friends alter column status set not null;

do $$ begin
  alter table friends add constraint friends_status_check check (status in ('pending', 'accepted'));
exception when duplicate_object then null; end $$;

-- 2. The recipient (friend_id) can update a row's status — i.e. approve a request.
drop policy if exists "friends_update" on friends;
create policy "friends_update" on friends
  for update to authenticated
  using (friend_id = auth.uid())
  with check (friend_id = auth.uid());

-- 3. Either party can delete (remove friend, cancel request, decline).
drop policy if exists "friends_delete" on friends;
create policy "friends_delete" on friends
  for delete to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());
