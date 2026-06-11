# Firestore Database Schema

This document defines the schema models and subcollection paths used in the Cinephile Firestore database.

---

## 1. Users Collection
Stores user profile information, stats counters, and pinned favorite slots.
* **Path**: `/users/{uid}`
* **Document Schema**:
```typescript
interface UserDocument {
  uid: string; // Firebase Auth UID
  displayName: string;
  displayNameLower: string; // Lowercase search query index
  username: string;
  usernameLower: string; // Lowercase uniqueness/search index
  photoURL: string | null;
  bio: string | null;
  location: string | null;
  followers: string[]; // List of follower UIDs (max 1000 items)
  following: string[]; // List of followed UIDs (max 1000 items)
  followersCount: number;
  followingCount: number;
  favorites: (FavoriteItem | null)[]; // Array of size 4 representing pinned film spots
  createdAt: Timestamp;
}

interface FavoriteItem {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: string;
}
```

---

## 2. Watch Tracking Collection
Tracks status of movies/shows watched, rating assessments, and want-to-watch bookmark entries.
* **Path**: `/watchTracking/{uid}_{mediaId}`
* **Document Schema**:
```typescript
interface WatchTrackingDocument {
  userId: string;
  mediaId: string;
  mediaType: "movie" | "tv";
  status: "watched" | "watching" | "want_to_watch" | "dropped" | null;
  watchDate: Timestamp;
  rating: number | null; // 1 to 5 rating star score
  rewatchCount: number;
}
```

---

## 3. Activities Collection
Stores timeline logs shown inside the social feeds.
* **Path**: `/activities/{activityId}`
* **Document Schema**:
```typescript
interface ActivityDocument {
  id: string;
  userId: string;
  type: "watched" | "reviewed" | "rewatched" | "finished_series" | "watchlist_added" | "list_created";
  movieId: string | null;
  tvId: string | null;
  rating: number | null;
  reviewText: string | null;
  containsSpoilers: boolean;
  commentsCount: number;
  createdAt: Timestamp;
  listTitle?: string | null; // Present if list_created
  listId?: string | null;    // Present if list_created
  activitySnapshot?: {       // Cached details for immediate feed rendering
    title: string;
    description: string | null;
    type: "ranking" | "collection" | "watchlist";
    tags: string[];
    posterIds: string[];
    featuredItems: { title: string; posterPath: string | null }[];
    itemsCount: number;
  } | null;
  mediaSnapshot?: {
    id: string;
    title: string;
    posterPath: string | null;
    backdropPath: string | null;
    rating: number;
    releaseYear: string;
    mediaType: "movie" | "tv";
  } | null;
}
```

### Activity Subcollections

#### A. Reactions Subcollection
* **Path**: `/activities/{activityId}/reactions/{userId}`
* **Schema**:
```typescript
interface ReactionDocument {
  userId: string;
  type: "love" | "peak" | "emotional" | "mindblown" | "applause";
  createdAt: Timestamp;
}
```

#### B. Comments Subcollection
* **Path**: `/activities/{activityId}/comments/{commentId}`
* **Schema**:
```typescript
interface CommentDocument {
  id: string;
  userId: string;
  content: string; // Max 280 characters
  createdAt: Timestamp;
}
```

---

## 4. Custom Lists Collection
Stores curated curations, collages, and settings.
* **Path**: `/lists/{listId}`
* **Document Schema**:
```typescript
interface ListDocument {
  id: string;
  ownerId: string;
  ownerUsername: string;
  title: string;
  slug: string; // Unique URL slug
  description: string | null;
  visibility: "public" | "unlisted" | "private";
  containsSpoilers: boolean;
  coverMediaId: string | null;
  coverMediaType: "movie" | "tv" | null;
  collaborators: { uid: string; displayName: string; username: string }[];
  tags: string[];
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  viewsCount: number;
  forksCount: number;
  itemsCount: number;
  estimatedWatchTimeHours: number;
  isPinned: boolean;
  originalListId: string | null; // Tracks original list if forked
  featuredItems: { title: string; posterPath: string | null }[]; // Cache of first 4 items
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastEditedBy: { uid: string; username: string } | null;
}
```

### Lists Subcollections

#### A. List Items Subcollection
* **Path**: `/lists/{listId}/items/{itemId}`
* **Schema**:
```typescript
interface ListItemDocument {
  id: string; // Usually tmdbId
  mediaId: string;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseYear: string;
  notes: string | null; // Personal notes for this list item
  noteImageUrl: string | null; // Custom uploaded image path for the note
  addedAt: Timestamp;
  orderIndex: number; // Order index for sorting list items
}
```

#### B. List Likes Subcollection
* **Path**: `/lists/{listId}/likes/{userId}`
* **Schema**:
```typescript
interface ListLikeDocument {
  userId: string;
  createdAt: Timestamp;
}
```

#### C. List Comments Subcollection
* **Path**: `/lists/{listId}/comments/{commentId}`
* **Schema**:
```typescript
interface ListCommentDocument {
  id: string;
  userId: string;
  content: string;
  createdAt: Timestamp;
  userName: string;
  userPhoto: string | null;
}
```

---

## 5. Saved Lists Subcollection (User Specific)
Tracks user bookmarked lists.
* **Path**: `/users/{uid}/savedLists/{listId}`
* **Document Schema**:
```typescript
interface SavedListDocument {
  listId: string;
  savedAt: Timestamp;
}
```
