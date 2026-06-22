/**
 * Supabase Database type definitions for Cinephile RC16.
 *
 * These are hand-written to match 001_schema.sql exactly.
 * After the Supabase project is live, regenerate with:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ActivityType =
  | "post"
  | "reviewed"
  | "watched"
  | "rewatched"
  | "watchlist_added"
  | "list_created";

export type NotificationType = "like" | "comment" | "follow" | "mention" | "reaction";

export type ReactionType = "love" | "peak" | "emotional" | "mindblown" | "applause";

export type MediaType = "movie" | "tv";

export type WatchStatus = "watched" | "want_to_watch" | "watching" | "dropped";

export type AccountType = "viewer" | "reviewer" | "curator" | "creator";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          username_lower: string | null;
          display_name: string | null;
          display_name_lower: string | null;
          bio: string | null;
          avatar_url: string | null;
          banner_url: string | null;
          favorite_genre: string | null;
          account_type: AccountType;
          followers_count: number;
          following_count: number;
          posts_count: number;
          reviews_count: number;
          following_tags: string[];
          preferences: Json;
          profile_completed: boolean;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };

      favorite_movies: {
        Row: {
          id: string;
          user_id: string;
          tmdb_id: number;
          media_type: MediaType;
          title: string | null;
          poster_path: string | null;
          backdrop_path: string | null;
          year: string | null;
          sort_order: number;
        };
        Insert: Omit<Database["public"]["Tables"]["favorite_movies"]["Row"], "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["favorite_movies"]["Insert"]>;
      };

      activities: {
        Row: {
          id: string;
          user_id: string;
          type: ActivityType;
          post_text: string | null;
          image_urls: string[];
          poll: Json | null;
          quote_activity_id: string | null;
          quote_snapshot: Json | null;
          media_snapshot: Json | null;
          movie_id: string | null;
          tv_id: string | null;
          rating: number | null;
          review_text: string | null;
          contains_spoilers: boolean;
          list_id: string | null;
          list_title: string | null;
          club_id: string | null;
          club_name: string | null;
          likes_count: number;
          comments_count: number;
          reactions: Json;
          hashtags: string[];
          mentions: Json;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activities"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["activities"]["Insert"]>;
      };

      activity_reactions: {
        Row: {
          id: string;
          activity_id: string;
          user_id: string;
          reaction_type: ReactionType;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activity_reactions"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_reactions"]["Insert"]>;
      };

      activity_comments: {
        Row: {
          id: string;
          activity_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activity_comments"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_comments"]["Insert"]>;
      };

      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["follows"]["Row"], "created_at"> & { created_at?: string };
        Update: Partial<Database["public"]["Tables"]["follows"]["Insert"]>;
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string | null;
          type: NotificationType;
          activity_id: string | null;
          reaction_type: ReactionType | null;
          comment_text: string | null;
          additional_count: number;
          sender_ids: string[];
          read: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };

      hashtags: {
        Row: { id: string; tag: string; post_count: number };
        Insert: Omit<Database["public"]["Tables"]["hashtags"]["Row"], "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["hashtags"]["Insert"]>;
      };

      activity_hashtags: {
        Row: { activity_id: string; hashtag_id: string };
        Insert: Database["public"]["Tables"]["activity_hashtags"]["Row"];
        Update: Partial<Database["public"]["Tables"]["activity_hashtags"]["Row"]>;
      };

      mentions: {
        Row: {
          id: string;
          activity_id: string;
          mentioned_user_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["mentions"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mentions"]["Insert"]>;
      };

      reviews: {
        Row: {
          id: string;
          user_id: string;
          media_id: string;
          media_type: MediaType;
          rating: number | null;
          content: string | null;
          has_spoilers: boolean;
          likes_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reviews"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
      };

      watch_tracking: {
        Row: {
          id: string;
          user_id: string;
          media_id: string;
          media_type: MediaType;
          status: WatchStatus | null;
          rating: number | null;
          rewatch_count: number;
          watch_date: string | null;
          added_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["watch_tracking"]["Row"], "added_at" | "updated_at"> & {
          added_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["watch_tracking"]["Insert"]>;
      };

      lists: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          slug: string | null;
          visibility: string;
          items_count: number;
          likes_count: number;
          featured_items: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["lists"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lists"]["Insert"]>;
      };

      list_items: {
        Row: {
          id: string;
          list_id: string;
          media_id: string;
          media_type: MediaType;
          sort_order: number;
          added_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["list_items"]["Row"], "id" | "added_at"> & {
          id?: string;
          added_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["list_items"]["Insert"]>;
      };

      saved_activities: {
        Row: { user_id: string; activity_id: string; saved_at: string };
        Insert: Omit<Database["public"]["Tables"]["saved_activities"]["Row"], "saved_at"> & { saved_at?: string };
        Update: Partial<Database["public"]["Tables"]["saved_activities"]["Insert"]>;
      };

      blocked_users: {
        Row: { user_id: string; blocked_user_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["blocked_users"]["Row"], "created_at"> & { created_at?: string };
        Update: Partial<Database["public"]["Tables"]["blocked_users"]["Insert"]>;
      };

      muted_users: {
        Row: { user_id: string; muted_user_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["muted_users"]["Row"], "created_at"> & { created_at?: string };
        Update: Partial<Database["public"]["Tables"]["muted_users"]["Insert"]>;
      };

      user_badges: {
        Row: { user_id: string; badge_id: string; earned_at: string };
        Insert: Omit<Database["public"]["Tables"]["user_badges"]["Row"], "earned_at"> & { earned_at?: string };
        Update: Partial<Database["public"]["Tables"]["user_badges"]["Insert"]>;
      };

      user_stats: {
        Row: {
          user_id: string;
          movies_watched: number;
          tv_watched: number;
          total_hours: number;
          average_rating: number;
          reviews_count: number;
          favorite_genre: string | null;
          favorite_decade: string | null;
          favorite_language: string | null;
          top_actor: string | null;
          top_director: string | null;
          current_streak: number;
          longest_streak: number;
          last_activity_at: string | null;
          last_streak_increment_at: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_stats"]["Row"], "updated_at"> & { updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["user_stats"]["Insert"]>;
      };

      user_heatmap: {
        Row: { user_id: string; date: string; count: number };
        Insert: Database["public"]["Tables"]["user_heatmap"]["Row"];
        Update: Partial<Database["public"]["Tables"]["user_heatmap"]["Row"]>;
      };

      poll_votes: {
        Row: { activity_id: string; user_id: string; option_index: number; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["poll_votes"]["Row"], "created_at"> & { created_at?: string };
        Update: Partial<Database["public"]["Tables"]["poll_votes"]["Insert"]>;
      };

      reports: {
        Row: {
          id: string;
          reporter_id: string;
          activity_id: string | null;
          reason: string | null;
          status: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reports"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
      };
    };

    Views: {};
    Functions: {};
    Enums: {};
  };
}

// ─── Helper types ─────────────────────────────────────────────
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Activity = Database["public"]["Tables"]["activities"]["Row"];
export type ActivityReaction = Database["public"]["Tables"]["activity_reactions"]["Row"];
export type ActivityComment = Database["public"]["Tables"]["activity_comments"]["Row"];
export type Follow = Database["public"]["Tables"]["follows"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Hashtag = Database["public"]["Tables"]["hashtags"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type WatchTracking = Database["public"]["Tables"]["watch_tracking"]["Row"];
export type List = Database["public"]["Tables"]["lists"]["Row"];
export type ListItem = Database["public"]["Tables"]["list_items"]["Row"];
export type UserStats = Database["public"]["Tables"]["user_stats"]["Row"];
export type FavoriteMovie = Database["public"]["Tables"]["favorite_movies"]["Row"];
