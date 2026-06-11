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
    console.log('✅ Loaded .env.local');
  }
} catch (e) {
  console.warn('Could not load .env.local:', e);
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
  console.log('✅ Firebase Admin initialized\n');
}

const db = admin.firestore();
const authAdmin = admin.auth();

// ─── HELPER: Delete all docs in a sub-collection ─────────────────────────────
async function deleteSubCollection(
  colRef: admin.firestore.CollectionReference,
  batchSize = 200
) {
  while (true) {
    const snap = await colRef.limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

// ─── HELPER: Full cascade delete for a single uid ────────────────────────────
async function deleteAllDataForUser(uid: string, username?: string) {
  // 1. Activities + sub-collections
  const activitiesSnap = await db.collection('activities').where('userId', '==', uid).get();
  for (const actDoc of activitiesSnap.docs) {
    await deleteSubCollection(actDoc.ref.collection('comments'));
    await deleteSubCollection(actDoc.ref.collection('reactions'));
    await actDoc.ref.delete();
  }

  // 2. Lists + sub-collections
  const listsSnap = await db.collection('lists').where('ownerId', '==', uid).get();
  for (const listDoc of listsSnap.docs) {
    await deleteSubCollection(listDoc.ref.collection('items'));
    await deleteSubCollection(listDoc.ref.collection('comments'));
    await listDoc.ref.delete();
  }

  // 3. watchTracking
  const trackingSnap = await db.collection('watchTracking').where('userId', '==', uid).get();
  if (!trackingSnap.empty) {
    const batch = db.batch();
    trackingSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // 4. Notifications (as recipient AND as sender)
  for (const field of ['recipientId', 'senderId']) {
    const snap = await db.collection('notifications').where(field, '==', uid).get();
    if (!snap.empty) {
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  // 5. Username reservation
  const usernameLower = username?.toLowerCase();
  if (usernameLower) {
    await db.collection('usernames').doc(usernameLower).delete();
  }

  // 6. User document
  await db.collection('users').doc(uid).delete();
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function cleanOrphans() {
  console.log('🔍 Scanning Firestore users for orphaned accounts...\n');

  const usersSnap = await db.collection('users').get();
  console.log(`   Found ${usersSnap.size} Firestore user document(s) total.\n`);

  const orphans: { uid: string; username?: string; displayName?: string }[] = [];

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const data = userDoc.data();

    try {
      // If this succeeds, the Auth account still exists — skip
      await authAdmin.getUser(uid);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        orphans.push({
          uid,
          username: data.username || data.usernameLower,
          displayName: data.displayName,
        });
      } else {
        console.warn(`   ⚠️  Could not check uid ${uid}:`, err.message);
      }
    }
  }

  if (orphans.length === 0) {
    console.log('✅ No orphaned users found. Firestore is clean!');
    return;
  }

  console.log(`🗑️  Found ${orphans.length} orphaned user(s) to clean up:\n`);
  orphans.forEach((o) =>
    console.log(`   • uid=${o.uid}  username=@${o.username || 'n/a'}  name="${o.displayName || 'n/a'}"`)
  );
  console.log('');

  let cleaned = 0;
  for (const orphan of orphans) {
    try {
      await deleteAllDataForUser(orphan.uid, orphan.username);
      console.log(`   ✅ Cleaned: ${orphan.uid} (@${orphan.username || 'n/a'})`);
      cleaned++;
    } catch (err: any) {
      console.error(`   ❌ Failed for ${orphan.uid}:`, err.message);
    }
  }

  console.log(`\n🎉 Done! Cleaned ${cleaned}/${orphans.length} orphaned user(s).`);
  console.log('   Deleted: user doc, username reservation, activities, lists, watchTracking, notifications.');
}

cleanOrphans().catch((err) => {
  console.error('Script crashed:', err);
  process.exit(1);
});
