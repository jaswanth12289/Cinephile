import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';

// ─── LOAD ENVIRONMENT VARIABLES ──────────────────────────────────────────────
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index === -1) return;
      const key = trimmed.substring(0, index).trim();
      let val = trimmed.substring(index + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    });
    console.log('Loaded environment variables from .env.local');
  }
} catch (e) {
  console.warn('Could not load .env.local file.', e);
}

// ─── INITIALIZE FIREBASE ADMIN ────────────────────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  console.log('Firebase Admin initialized.');
}

const db = admin.firestore();

// Mock user IDs that were seeded (20 users)
const MOCK_USER_IDS = Array.from({ length: 20 }, (_, i) => `mock_user_${i}`);

async function deleteCollection(colRef: admin.firestore.CollectionReference, batchSize = 100) {
  let deleted = 0;
  while (true) {
    const snap = await colRef.limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    deleted += snap.docs.length;
    console.log(`  Deleted ${deleted} docs from ${colRef.path}...`);
  }
}

async function deleteDocWithSubcollections(
  docRef: admin.firestore.DocumentReference,
  subcollections: string[]
) {
  for (const sub of subcollections) {
    await deleteCollection(docRef.collection(sub));
  }
  await docRef.delete();
}

async function cleanup() {
  console.log('\n🧹 Starting cleanup of all seeded fake data...\n');

  // ── 1. Delete mock users ──────────────────────────────────────────────────
  console.log('Step 1: Deleting mock users...');
  for (const uid of MOCK_USER_IDS) {
    await db.collection('users').doc(uid).delete();
    console.log(`  Deleted user: ${uid}`);
  }

  // ── 2. Delete watchTracking records for mock users ────────────────────────
  console.log('\nStep 2: Deleting watchTracking records...');
  for (const uid of MOCK_USER_IDS) {
    const snap = await db.collection('watchTracking')
      .where('userId', '==', uid)
      .get();
    if (!snap.empty) {
      const batch = db.batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      console.log(`  Deleted ${snap.size} watchTracking docs for ${uid}`);
    }
  }

  // ── 3. Delete activities (reviews + list_created) for mock users ──────────
  console.log('\nStep 3: Deleting activities (reviews + list_created)...');
  for (const uid of MOCK_USER_IDS) {
    const snap = await db.collection('activities')
      .where('userId', '==', uid)
      .get();
    for (const doc of snap.docs) {
      // Delete sub-collections: comments, reactions
      await deleteCollection(doc.ref.collection('comments'));
      await deleteCollection(doc.ref.collection('reactions'));
      await doc.ref.delete();
    }
    if (snap.size > 0) {
      console.log(`  Deleted ${snap.size} activities for ${uid}`);
    }
  }

  // ── 4. Delete lists owned by mock users ───────────────────────────────────
  console.log('\nStep 4: Deleting lists owned by mock users...');
  for (const uid of MOCK_USER_IDS) {
    const snap = await db.collection('lists')
      .where('ownerId', '==', uid)
      .get();
    for (const doc of snap.docs) {
      // Delete sub-collections: items, comments
      await deleteCollection(doc.ref.collection('items'));
      await deleteCollection(doc.ref.collection('comments'));
      await doc.ref.delete();
      console.log(`  Deleted list: ${doc.data().title}`);
    }
  }

  // ── 5. Delete notifications directed at or from mock users ────────────────
  console.log('\nStep 5: Cleaning up notifications for mock users...');
  for (const uid of MOCK_USER_IDS) {
    // Notifications where mock user is the recipient
    const recipientSnap = await db.collection('notifications')
      .where('recipientId', '==', uid)
      .get();
    if (!recipientSnap.empty) {
      const batch = db.batch();
      recipientSnap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      console.log(`  Deleted ${recipientSnap.size} notifications for recipient ${uid}`);
    }

    // Notifications triggered by mock user
    const senderSnap = await db.collection('notifications')
      .where('senderId', '==', uid)
      .get();
    if (!senderSnap.empty) {
      const batch = db.batch();
      senderSnap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      console.log(`  Deleted ${senderSnap.size} notifications from sender ${uid}`);
    }
  }

  console.log('\n✅ All seeded fake data has been removed successfully!');
  console.log('   - 20 mock users deleted');
  console.log('   - All their watchTracking records deleted');
  console.log('   - All their activities, reviews, and comments deleted');
  console.log('   - All their lists (+ items + comments) deleted');
  console.log('   - Related notifications cleaned up');
}

cleanup().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
