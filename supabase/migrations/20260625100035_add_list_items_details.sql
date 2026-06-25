alter table public.list_items
  add column if not exists title text,
  add column if not exists poster_path text,
  add column if not exists release_year text,
  add column if not exists note text;