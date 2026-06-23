
export interface UserDocument {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
  bio: string;
  preferences: {
    favoriteGenres: string[];
    regionalFocus: string[];
  };
  favorites: {
    movies: string[];
    tv: string[];
  };
  stats: {
    moviesWatched: number;
    episodesWatched: number;
    totalHours: number;
    longestStreak: number;
  };
  achievements: string[];
  role: "user" | "moderator" | "admin";
  subscription: {
    isPremium: boolean;
    planType: string;
  };
  createdAt: Date | string;
}

export interface ReviewDocument {
  id: string;
  userId: string;
  mediaId: string;
  mediaType: "movie" | "tv";
  rating: number;
  content: string;
  aiSummary?: string;
  hasSpoilers: boolean;
  likesCount: number;
  createdAt: Date | string;
}

export interface WatchTrackingDocument {
  id: string; // userId_mediaId
  userId: string;
  mediaId: string;
  mediaType: "movie" | "tv";
  status: "watched" | "watching" | "want_to_watch" | "dropped";
  progress?: {
    season: number;
    episode: number;
  };
  rewatchCount: number;
  watchDate: Date | string;
}

export interface ActivityDocument {
  id: string;
  actorId: string;
  type: "review" | "rate" | "list_create" | "watch";
  targetId: string;
  mediaId: string;
  createdAt: Date | string;
}

export interface FeedDocument {
  id: string;
  userId: string;
  activityId: string;
  actorId: string;
  createdAt: Date | string;
}

export interface ListDocument {
  id: string;
  userId: string;
  title: string;
  description: string;
  isPublic: boolean;
  likesCount: number;
  createdAt: Date | string;
}

export interface ListItemDocument {
  id: string;
  listId: string;
  mediaId: string;
  mediaType: "movie" | "tv";
  order: number;
  notes: string;
}

export interface NotificationDocument {
  id: string;
  userId: string;
  type: "follow" | "review_like" | "comment" | "list_like";
  actorId: string;
  data: Record<string, any>;
  isRead: boolean;
  createdAt: Date | string;
}
