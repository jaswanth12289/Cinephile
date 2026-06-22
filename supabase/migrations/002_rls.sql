-- ============================================================
-- Cinephile RC16 — Row Level Security Policies
-- 002_rls.sql
-- Run AFTER 001_schema.sql
-- ============================================================

-- Enable RLS on every table
alter table public.profiles          enable row level security;
alter table public.favorite_movies   enable row level security;
alter table public.activities        enable row level security;
alter table public.activity_reactions enable row level security;
alter table public.activity_comments enable row level security;
alter table public.follows           enable row level security;
alter table public.notifications     enable row level security;
alter table public.hashtags          enable row level security;
alter table public.activity_hashtags enable row level security;
alter table public.mentions          enable row level security;
alter table public.reviews           enable row level security;
alter table public.watch_tracking    enable row level security;
alter table public.lists             enable row level security;
alter table public.list_items        enable row level security;
alter table public.saved_activities  enable row level security;
alter table public.blocked_users     enable row level security;
alter table public.muted_users       enable row level security;
alter table public.user_badges       enable row level security;
alter table public.user_stats        enable row level security;
alter table public.user_heatmap      enable row level security;
alter table public.poll_votes        enable row level security;
alter table public.reports           enable row level security;

-- ─── profiles ────────────────────────────────────────────────
create policy "profiles: public read"
  on public.profiles for select using (true);

create policy "profiles: owner update"
  on public.profiles for update
  using (id = auth.uid());

create policy "profiles: owner insert"
  on public.profiles for insert
  with check (id = auth.uid());

-- ─── favorite_movies ─────────────────────────────────────────
create policy "favorite_movies: owner read"
  on public.favorite_movies for select
  using (user_id = auth.uid());

create policy "favorite_movies: public read"
  on public.favorite_movies for select using (true);

create policy "favorite_movies: owner write"
  on public.favorite_movies for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── activities ──────────────────────────────────────────────
create policy "activities: public read"
  on public.activities for select
  using (deleted_at is null);

create policy "activities: authenticated insert"
  on public.activities for insert
  with check (auth.uid() = user_id);

create policy "activities: owner update"
  on public.activities for update
  using (auth.uid() = user_id);

create policy "activities: owner delete (soft)"
  on public.activities for update
  using (auth.uid() = user_id);

-- ─── activity_reactions ──────────────────────────────────────
create policy "activity_reactions: public read"
  on public.activity_reactions for select using (true);

create policy "activity_reactions: authenticated insert"
  on public.activity_reactions for insert
  with check (auth.uid() = user_id);

create policy "activity_reactions: owner delete"
  on public.activity_reactions for delete
  using (auth.uid() = user_id);

-- ─── activity_comments ───────────────────────────────────────
create policy "activity_comments: public read"
  on public.activity_comments for select using (true);

create policy "activity_comments: authenticated insert"
  on public.activity_comments for insert
  with check (auth.uid() = user_id);

create policy "activity_comments: owner delete"
  on public.activity_comments for delete
  using (auth.uid() = user_id);

-- ─── follows ─────────────────────────────────────────────────
create policy "follows: public read"
  on public.follows for select using (true);

create policy "follows: authenticated insert"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "follows: owner delete"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- ─── notifications ───────────────────────────────────────────
create policy "notifications: recipient read"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "notifications: recipient update (mark read)"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Insert done via service role (server actions) only — no client insert policy

-- ─── hashtags ────────────────────────────────────────────────
create policy "hashtags: public read"
  on public.hashtags for select using (true);

-- ─── activity_hashtags ───────────────────────────────────────
create policy "activity_hashtags: public read"
  on public.activity_hashtags for select using (true);

-- ─── mentions ────────────────────────────────────────────────
create policy "mentions: public read"
  on public.mentions for select using (true);

-- ─── reviews ─────────────────────────────────────────────────
create policy "reviews: public read"
  on public.reviews for select using (true);

create policy "reviews: authenticated insert"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "reviews: owner update"
  on public.reviews for update
  using (auth.uid() = user_id);

create policy "reviews: owner delete"
  on public.reviews for delete
  using (auth.uid() = user_id);

-- ─── watch_tracking ──────────────────────────────────────────
create policy "watch_tracking: owner read"
  on public.watch_tracking for select
  using (auth.uid() = user_id);

create policy "watch_tracking: owner write"
  on public.watch_tracking for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── lists ───────────────────────────────────────────────────
create policy "lists: public read"
  on public.lists for select
  using (visibility = 'public' or auth.uid() = owner_id);

create policy "lists: owner write"
  on public.lists for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ─── list_items ──────────────────────────────────────────────
create policy "list_items: public read"
  on public.list_items for select using (true);

create policy "list_items: owner write"
  on public.list_items for all
  using (
    auth.uid() = (select owner_id from public.lists where id = list_id)
  )
  with check (
    auth.uid() = (select owner_id from public.lists where id = list_id)
  );

-- ─── saved_activities ────────────────────────────────────────
create policy "saved_activities: owner read"
  on public.saved_activities for select
  using (auth.uid() = user_id);

create policy "saved_activities: owner write"
  on public.saved_activities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── blocked_users ───────────────────────────────────────────
create policy "blocked_users: owner read"
  on public.blocked_users for select
  using (auth.uid() = user_id);

create policy "blocked_users: owner write"
  on public.blocked_users for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── muted_users ─────────────────────────────────────────────
create policy "muted_users: owner read"
  on public.muted_users for select
  using (auth.uid() = user_id);

create policy "muted_users: owner write"
  on public.muted_users for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── user_badges ─────────────────────────────────────────────
create policy "user_badges: public read"
  on public.user_badges for select using (true);

-- writes done via service role only (badge engine runs server-side)

-- ─── user_stats ──────────────────────────────────────────────
create policy "user_stats: public read"
  on public.user_stats for select using (true);

-- writes done via service role only

-- ─── user_heatmap ────────────────────────────────────────────
create policy "user_heatmap: owner read"
  on public.user_heatmap for select
  using (auth.uid() = user_id);

-- writes done via service role only

-- ─── poll_votes ──────────────────────────────────────────────
create policy "poll_votes: public read"
  on public.poll_votes for select using (true);

create policy "poll_votes: authenticated insert"
  on public.poll_votes for insert
  with check (auth.uid() = user_id);

-- ─── reports ─────────────────────────────────────────────────
create policy "reports: authenticated insert"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

-- reads restricted to service role only (admin panel)


-- ─── STORAGE POLICIES ────────────────────────────────────────
-- Applied to storage.objects

-- avatars: only owner can upload to their own folder
create policy "avatars: owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: owner update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- post-images: only owner can upload to their folder
create policy "post-images: owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post-images: owner update"
  on storage.objects for update
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- list-covers: only owner can upload
create policy "list-covers: owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'list-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- All storage buckets: public read
create policy "storage: public read"
  on storage.objects for select using (true);
