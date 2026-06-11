# Firestore Indexes Guide

This document lists the composite indexes required by the Cinephile application in Google Cloud Firestore.

## Automatic / Single-field Indexes
By default, Firestore automatically indexes every single field in a document. However, when combining multiple fields inside filter (`.where()`) or order (`.orderBy()`) queries, you must construct composite indexes.

---

## Required Composite Indexes

### 1. Social Activity Feed Index
Used to generate user feed streams combining follow restrictions with temporal sequencing.
* **Collection**: `activities`
* **Fields**:
  * `userId` (ASC)
  * `createdAt` (DESC)

### 2. Weekly Wrapped Summary Index
Used to aggregate logged ratings, watch logs, and watch times for weekly wrapped analytics inside `getWeeklyWrapped`.
* **Collection**: `watchTracking`
* **Fields**:
  * `status` (ASC)
  * `userId` (ASC)
  * `watchDate` (DESC)
  * `__name__` (ASC)

### 3. Public Lists Directory Indexes
Used to query community curations on the list directory portal, supporting tag categorization and sorting filters.

#### Index A (Trending Lists by Tag)
* **Collection**: `lists`
* **Fields**:
  * `visibility` (ASC)
  * `tags` (Array)
  * `likesCount` (DESC)

#### Index B (Recent Lists by Tag)
* **Collection**: `lists`
* **Fields**:
  * `visibility` (ASC)
  * `tags` (Array)
  * `createdAt` (DESC)

### 4. User Profiles Lists Tab Index
Used to display user curations filtered by visibility and sorted by date.
* **Collection**: `lists`
* **Fields**:
  * `ownerUsername` (ASC)
  * `visibility` (ASC)
  * `createdAt` (DESC)

---

## Index Creation Options

### Method A: Direct Link (Recommended)
If Cinephile encounters a missing index in development mode (`npm run dev`), Firestore throws a `9 FAILED_PRECONDITION` exception in the console. 
1. Open your terminal logs or developer console.
2. Click the unique firebase console link generated in the error message.
3. The fields will prefill automatically. Click **Create Index**.
4. Wait 1–3 minutes for index deployment status to become **Enabled**.

### Method B: Firebase CLI Index JSON
Alternatively, you can save index specifications inside a `firestore.indexes.json` file in your repository:
```json
{
  "indexes": [
    {
      "collectionGroup": "activities",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "watchTracking",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "watchDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "lists",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "visibility", "order": "ASCENDING" },
        { "fieldPath": "tags", "arrayConfig": "CONTAINS" },
        { "fieldPath": "likesCount", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "lists",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "visibility", "order": "ASCENDING" },
        { "fieldPath": "tags", "arrayConfig": "CONTAINS" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "lists",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ownerUsername", "order": "ASCENDING" },
        { "fieldPath": "visibility", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```
Deploy the rules using:
```bash
firebase deploy --only firestore:indexes
```
