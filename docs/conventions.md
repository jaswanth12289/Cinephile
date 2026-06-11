# Cinephile Code Conventions

This document outlines the coding standards, naming conventions, and file structure rules for the Cinephile codebase to prevent architectural regression and maintain modular growth.

---

## 1. Naming Conventions

### Variable & Database Identifiers
Always use camelCase for identifiers. To ensure consistency across TMDB records and Firestore IDs, use the following exact suffix mappings:

* **Movie IDs**: `movieId` (string representation of TMDB ID)
* **TV/Series IDs**: `tvId` (string representation of TMDB ID)
* **User Accounts**: `userId` (equivalent to Firebase Auth UID)
* **Curation Lists**: `listId` (Firestore list document ID)
* **Feed Timelines**: `activityId` (Firestore activity document ID)

*Example*:
```typescript
const trackingId = `${userId}_${movieId}`;
```

---

## 2. Component Naming Guidelines

All React components should use PascalCase and clear, predictable suffixes to identify their functional type:

* **Core Presentation Views**: `[Name].tsx` (e.g., `FeedCard.tsx`, `MediaCard.tsx`)
* **Skeleton Placeholders**: `[Name]Skeleton.tsx` (e.g., `FeedCardSkeleton.tsx`, `MediaCardSkeleton.tsx`)
* **Interactive / Action Handles**: `[Name]Actions.tsx` or `[Name]ActionBar.tsx` (e.g., `ListActionBar.tsx`)
* **Complex Feature Panels**: `[Name]Editor.tsx` or `[Name]Selector.tsx` (e.g., `ListEditor.tsx`)

---

## 3. Directory Layout Rules

Cinephile follows a strict layer division inside `src/` to prevent circular dependencies and spaghetti imports:

```text
src/
├── actions/      # Pure Server Actions. No React components allowed. Handlers for DB queries.
├── components/   # App-wide, reusable UI elements. Divided into layout, providers, and shared.
├── features/     # Feature-scoped components and logic blocks. Organized by domain (auth, lists, etc.)
├── hooks/        # Reusable client hooks (e.g. useDebounce, useInfiniteScroll).
└── lib/          # Proxy integrations (TMDB, firebase admin configuration, animations presets).
```

### Folder Responsibilities:
1. **`actions/`**: Server-only operations tagged with `"use server"`. Interfaces directly with Firebase Admin SDK or TMDB proxy.
2. **`components/`**: Standard shared React components (e.g., `EmptyState.tsx`, `ErrorBoundary.tsx`).
3. **`features/`**: Domain specific modules (e.g. `src/features/auth/` contains AuthProvider, `src/features/social/` contains FollowButton).
4. **`hooks/`**: Custom general-purpose hooks to separate presentation from state mechanics.
5. **`lib/`**: Direct third-party wrappers, client initialization configurations, and utility assets.
