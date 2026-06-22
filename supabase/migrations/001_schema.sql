-- ============================================================
-- Cinephile RC16 — Supabase Schema Migration
-- 001_schema.sql
-- ============================================================

-- ─── PROFILES ────────────────────────────────────────────────
-- Replaces Firestore `users` collection.
-- Row is auto-created by the handle_new_user() trigger.

create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  username            text unique not null,
  username_lower      text unique,
  display_name        text,
  display_name_lower  text,
  bio                 text,
  avatar_url          text,
  banner_url          text,
  favorite_genre      text,
  account_type        text not null default 'viewer',
  -- counts (denormalized for profile header speed)
  followers_count     integer not null default 0,
  following_count     integer not null default 0,
  posts_count         integer not null default 0,
  reviews_count       integer not null default 0,
  -- social settings
  following_tags      text[] not null default '{}',
  preferences         jsonb not null default '{}',
  -- onboarding
  profile_completed   boolean not null default false,
  -- moderation
  role                text not null default 'user',
  -- timestamps
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── FAVORITE MOVIES ─────────────────────────────────────────
-- Replaces `favorites jsonb` in Firestore user doc.
-- Top 4 pinned movies/shows (sort_order 0-3).

create table if not exists public.favorite_movies (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  tmdb_id       integer not null,
  media_type    text not null,
  title         text,
  poster_path   text,
  backdrop_path text,
  year          text,
  sort_order    integer not null default 0,
  unique(user_id, sort_order)
);

-- ─── ACTIVITIES ───────────────────────────────────────────────
-- Single unified table (Letterboxd-style).
-- Replaces Firestore `activities` collection.
-- type: 'post' | 'reviewed' | 'watched' | 'rewatched' | 'watchlist_added' | 'list_created'

create table if not exists public.activities (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  type              text not null,

  -- Thought/post fields
  post_text         text,
  image_urls        text[] not null default '{}',
  poll              jsonb,
  quote_activity_id uuid references public.activities(id) on delete set null,
  quote_snapshot    jsonb,

  -- Media snapshot (embedded to avoid TMDB calls on feed load)
  media_snapshot    jsonb,
  movie_id          text,
  tv_id             text,

  -- Review fields
  rating            numeric(3,1),
  review_text       text,
  contains_spoilers boolean not null default false,

  -- List fields
  list_id           uuid,
  list_title        text,

  -- Club fields (reserved)
  club_id           uuid,
  club_name         text,

  -- Social counts (denormalized)
  likes_count       integer not null default 0,
  comments_count    integer not null default 0,
  reactions         jsonb not null default '{"love":0,"peak":0,"emotional":0,"mindblown":0,"applause":0}',

  -- Hashtag + mention data
  hashtags          text[] not null default '{}',
  mentions          jsonb not null default '[]',

  -- Soft delete
  deleted_at        timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── ACTIVITY REACTIONS ──────────────────────────────────────
-- Replaces Firestore `activities/{id}/reactions/{uid}` subcollections.

create table if not exists public.activity_reactions (
  id            uuid primary key default gen_random_uuid(),
  activity_id   uuid not null references public.activities(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null,
  created_at    timestamptz not null default now(),
  unique(activity_id, user_id)
);

-- ─── ACTIVITY COMMENTS ───────────────────────────────────────
-- Replaces Firestore `activities/{id}/comments` subcollections.

create table if not exists public.activity_comments (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);

-- ─── FOLLOWS ─────────────────────────────────────────────────
-- Replaces Firestore users/{uid}/followers + following subcollections.

create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id)
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────

create table if not exists public.notifications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  actor_id         uuid references public.profiles(id) on delete cascade,
  type             text not null,
  activity_id      uuid references public.activities(id) on delete cascade,
  reaction_type    text,
  comment_text     text,
  additional_count integer not null default 0,
  sender_ids       uuid[] not null default '{}',
  read             boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── HASHTAGS ────────────────────────────────────────────────

create table if not exists public.hashtags (
  id         uuid primary key default gen_random_uuid(),
  tag        text unique not null,
  post_count integer not null default 0
);

-- ─── ACTIVITY HASHTAGS ───────────────────────────────────────

create table if not exists public.activity_hashtags (
  activity_id uuid not null references public.activities(id) on delete cascade,
  hashtag_id  uuid not null references public.hashtags(id) on delete cascade,
  primary key (activity_id, hashtag_id)
);

-- ─── MENTIONS ────────────────────────────────────────────────

create table if not exists public.mentions (
  id                uuid primary key default gen_random_uuid(),
  activity_id       uuid not null references public.activities(id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at        timestamptz not null default now()
);

-- ─── REVIEWS ─────────────────────────────────────────────────
-- Standalone reviews for movie/TV detail pages.

create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  media_id     text not null,
  media_type   text not null,
  rating       numeric(3,1),
  content      text,
  has_spoilers boolean not null default false,
  likes_count  integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(user_id, media_id)
);

-- ─── WATCH TRACKING ──────────────────────────────────────────
-- Replaces Firestore `watchTracking` + `watchlist` collections.

create table if not exists public.watch_tracking (
  id            text primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  media_id      text not null,
  media_type    text not null,
  status        text,
  rating        numeric(3,1),
  rewatch_count integer not null default 0,
  watch_date    timestamptz,
  added_at      timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(user_id, media_id)
);

-- ─── LISTS ───────────────────────────────────────────────────

create table if not exists public.lists (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  title          text not null,
  description    text,
  slug           text unique,
  visibility     text not null default 'public',
  items_count    integer not null default 0,
  likes_count    integer not null default 0,
  featured_items jsonb not null default '[]',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ─── LIST ITEMS ──────────────────────────────────────────────

create table if not exists public.list_items (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.lists(id) on delete cascade,
  media_id   text not null,
  media_type text not null,
  sort_order integer not null default 0,
  added_at   timestamptz not null default now()
);

-- ─── SAVED ACTIVITIES ────────────────────────────────────────
-- Replaces Firestore `users/{uid}/savedActivities` subcollection.

create table if not exists public.saved_activities (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  saved_at    timestamptz not null default now(),
  primary key (user_id, activity_id)
);

-- ─── BLOCKED USERS ───────────────────────────────────────────
-- Replaces `blockedUserIds` JSON array in Firestore user doc.

create table if not exists public.blocked_users (
  user_id         uuid not null references public.profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (user_id, blocked_user_id)
);

-- ─── MUTED USERS ─────────────────────────────────────────────
-- Replaces `mutedUserIds` JSON array in Firestore user doc.

create table if not exists public.muted_users (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  muted_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, muted_user_id)
);

-- ─── USER BADGES ─────────────────────────────────────────────
-- Replaces `badges[]` array in Firestore user doc.

create table if not exists public.user_badges (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  badge_id  text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ─── USER STATS ──────────────────────────────────────────────
-- Replaces Firestore `users/{uid}/stats/summary` subcollection.

create table if not exists public.user_stats (
  user_id                  uuid primary key references public.profiles(id) on delete cascade,
  movies_watched           integer not null default 0,
  tv_watched               integer not null default 0,
  total_hours              numeric not null default 0,
  average_rating           numeric(3,2) not null default 0,
  reviews_count            integer not null default 0,
  favorite_genre           text,
  favorite_decade          text,
  favorite_language        text,
  top_actor                text,
  top_director             text,
  current_streak           integer not null default 0,
  longest_streak           integer not null default 0,
  last_activity_at         timestamptz,
  last_streak_increment_at timestamptz,
  updated_at               timestamptz not null default now()
);

-- ─── USER HEATMAP ────────────────────────────────────────────
-- Replaces Firestore `users/{uid}/stats/heatmap` subcollection.

create table if not exists public.user_heatmap (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date    date not null,
  count   integer not null default 1,
  primary key (user_id, date)
);

-- ─── POLL VOTES ──────────────────────────────────────────────
-- Replaces Firestore `activities/{id}/pollVotes` subcollections.

create table if not exists public.poll_votes (
  activity_id  uuid not null references public.activities(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  option_index integer not null,
  created_at   timestamptz not null default now(),
  primary key (activity_id, user_id)
);

-- ─── REPORTS ─────────────────────────────────────────────────

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete cascade,
  reason      text,
  status      text not null default 'pending',
  created_at  timestamptz not null default now()
);
