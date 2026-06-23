-- ============================================================
-- Cinephile RC16 — Triggers, Functions & Indexes
-- 003_triggers_indexes.sql
-- Run AFTER 002_rls.sql
-- ============================================================


-- ─── UTILITY: updated_at auto-update ─────────────────────────

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply to every table with an updated_at column
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger trg_activities_updated_at
  before update on public.activities
  for each row execute function public.update_updated_at_column();

create trigger trg_notifications_updated_at
  before update on public.notifications
  for each row execute function public.update_updated_at_column();

create trigger trg_lists_updated_at
  before update on public.lists
  for each row execute function public.update_updated_at_column();

create trigger trg_watch_tracking_updated_at
  before update on public.watch_tracking
  for each row execute function public.update_updated_at_column();

create trigger trg_reviews_updated_at
  before update on public.reviews
  for each row execute function public.update_updated_at_column();

create trigger trg_user_stats_updated_at
  before update on public.user_stats
  for each row execute function public.update_updated_at_column();


-- ─── handle_new_user: auto-create profile row ────────────────
-- Fires when a new auth.users row is created (sign up).
-- Creates a matching public.profiles row and public.user_stats row.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, username_lower, display_name, email_ref)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', 'Cinephile User'),
    new.email
  )
  on conflict (id) do nothing;

  insert into public.user_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Note: profiles.email_ref is not in our schema — the trigger above inserts
-- only columns that exist. The username will be refined during setup-profile.
-- We use a simplified insert here; setup-profile does the full upsert.

-- Replace the above with a clean version that matches the actual schema:
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_username text;
  v_display_name text;
begin
  v_username := coalesce(
    new.raw_user_meta_data->>'username',
    regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')
  );
  v_display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'display_name',
    v_username,
    'Cinephile User'
  );

  insert into public.profiles (
    id,
    username,
    username_lower,
    display_name,
    display_name_lower,
    profile_completed
  )
  values (
    new.id,
    v_username,
    lower(v_username),
    v_display_name,
    lower(v_display_name),
    false
  )
  on conflict (id) do nothing;

  insert into public.user_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─── follow counts: update on follows INSERT / DELETE ────────

create or replace function public.update_follow_counts()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
  elsif (tg_op = 'DELETE') then
    update public.profiles set followers_count = greatest(0, followers_count - 1) where id = old.following_id;
    update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
  end if;
  return null;
end;
$$;

create trigger trg_follows_update_counts
  after insert or delete on public.follows
  for each row execute function public.update_follow_counts();


-- ─── activity likes_count: update on reactions INSERT / DELETE

create or replace function public.update_activity_likes_count()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    update public.activities
    set
      likes_count = likes_count + 1,
      reactions = jsonb_set(
        reactions,
        array[new.reaction_type],
        to_jsonb(coalesce((reactions->>new.reaction_type)::int, 0) + 1)
      )
    where id = new.activity_id;
  elsif (tg_op = 'DELETE') then
    update public.activities
    set
      likes_count = greatest(0, likes_count - 1),
      reactions = jsonb_set(
        reactions,
        array[old.reaction_type],
        to_jsonb(greatest(0, coalesce((reactions->>old.reaction_type)::int, 0) - 1))
      )
    where id = old.activity_id;
  end if;
  return null;
end;
$$;

create trigger trg_reactions_update_likes
  after insert or delete on public.activity_reactions
  for each row execute function public.update_activity_likes_count();


-- ─── activity comments_count: update on comments INSERT / DELETE

create or replace function public.update_activity_comments_count()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    update public.activities set comments_count = comments_count + 1 where id = new.activity_id;
  elsif (tg_op = 'DELETE') then
    update public.activities set comments_count = greatest(0, comments_count - 1) where id = old.activity_id;
  end if;
  return null;
end;
$$;

create trigger trg_comments_update_count
  after insert or delete on public.activity_comments
  for each row execute function public.update_activity_comments_count();


-- ─── profiles posts_count: update on post-type activities ────

create or replace function public.update_profile_posts_count()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT' and new.type = 'post') then
    update public.profiles set posts_count = posts_count + 1 where id = new.user_id;
  elsif (tg_op = 'DELETE' and old.type = 'post') then
    update public.profiles set posts_count = greatest(0, posts_count - 1) where id = old.user_id;
  end if;
  return null;
end;
$$;

create trigger trg_activities_update_posts_count
  after insert or delete on public.activities
  for each row execute function public.update_profile_posts_count();


-- ─── profiles reviews_count: update on review-type activities ─

create or replace function public.update_profile_reviews_count()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles set reviews_count = reviews_count + 1 where id = new.user_id;
  elsif (tg_op = 'DELETE') then
    update public.profiles set reviews_count = greatest(0, reviews_count - 1) where id = old.user_id;
  end if;
  return null;
end;
$$;

create trigger trg_reviews_update_count
  after insert or delete on public.reviews
  for each row execute function public.update_profile_reviews_count();


-- ─── hashtag post_count: update on activity_hashtags INSERT / DELETE

create or replace function public.update_hashtag_post_count()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    update public.hashtags set post_count = post_count + 1 where id = new.hashtag_id;
  elsif (tg_op = 'DELETE') then
    update public.hashtags set post_count = greatest(0, post_count - 1) where id = old.hashtag_id;
  end if;
  return null;
end;
$$;

create trigger trg_hashtags_update_count
  after insert or delete on public.activity_hashtags
  for each row execute function public.update_hashtag_post_count();


-- ─── INDEXES ─────────────────────────────────────────────────

-- Feed: primary feed query by followed users, newest first
create index if not exists idx_activities_user_created
  on public.activities(user_id, created_at desc);

-- Feed: soft-delete filter (partial index — only non-deleted rows)
create index if not exists idx_activities_not_deleted
  on public.activities(created_at desc)
  where deleted_at is null;

-- Feed: type filter (for profile activity tabs)
create index if not exists idx_activities_user_type
  on public.activities(user_id, type, created_at desc);

-- Follows: reverse lookup (who follows a given user)
create index if not exists idx_follows_following
  on public.follows(following_id);

-- Follows: forward lookup (who a user follows)
create index if not exists idx_follows_follower
  on public.follows(follower_id);

-- Notifications: inbox query
create index if not exists idx_notifications_user_created
  on public.notifications(user_id, created_at desc);

-- Notifications: unread count
create index if not exists idx_notifications_unread
  on public.notifications(user_id, read)
  where read = false;

-- Watch tracking: status queries (watchlist, watched)
create index if not exists idx_watchtracking_user_status
  on public.watch_tracking(user_id, status);

-- Username search: case-insensitive prefix queries
create index if not exists idx_profiles_username_lower
  on public.profiles(username_lower text_pattern_ops);

-- Display name search
create index if not exists idx_profiles_display_name_lower
  on public.profiles(display_name_lower text_pattern_ops);

-- Followers count ordering (suggested users)
create index if not exists idx_profiles_followers_count
  on public.profiles(followers_count desc);

-- Hashtag feed: join through activity_hashtags
create index if not exists idx_activity_hashtags_hashtag
  on public.activity_hashtags(hashtag_id);

-- Reviews: by media
create index if not exists idx_reviews_media
  on public.reviews(media_id, created_at desc);

-- Reviews: by user
create index if not exists idx_reviews_user
  on public.reviews(user_id, created_at desc);

-- Mentions: find which activities mention a user
create index if not exists idx_mentions_user
  on public.mentions(mentioned_user_id);

-- Activity hashtags array search (GIN for @> queries)
create index if not exists idx_activities_hashtags_gin
  on public.activities using gin(hashtags);

-- Activity image urls (GIN, for filtering posts with images)
create index if not exists idx_activities_image_urls_gin
  on public.activities using gin(image_urls);

-- Comments: by activity (for fast chronological loading)
create index if not exists idx_comments_activity_created
  on public.activity_comments(activity_id, created_at desc);
