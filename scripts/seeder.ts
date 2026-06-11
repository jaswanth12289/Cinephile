import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';
import dns from 'dns';

// Prefer IPv4 to avoid IPv6 routing failures to TMDB
dns.setDefaultResultOrder("ipv4first");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  console.warn("Failed to set DNS resolvers in seeder script:", e);
}

const originalLookup = dns.lookup;
// @ts-ignore
dns.lookup = (hostname, options, callback) => {
  let cb = callback;
  let opts: any = options;
  if (typeof options === "function") {
    cb = options;
    opts = {};
  } else if (typeof options === "number") {
    opts = { family: options };
  }

  if (hostname === "api.themoviedb.org") {
    dns.resolve4(hostname, (err, addresses) => {
      if (!err && addresses && addresses.length > 0) {
        const callbackFn = cb as any;
        if (opts && opts.all) {
          const results = addresses.map((addr) => ({ address: addr, family: 4 }));
          callbackFn(null, results);
        } else {
          callbackFn(null, addresses[0], 4);
        }
      } else {
        originalLookup(hostname, opts, cb as any);
      }
    });
  } else {
    originalLookup(hostname, opts, callback as any);
  }
};

// ─── LOAD ENVIRONMENT VARIABLES ──────────────────────────────────────────
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
    console.log("Loaded environment variables from .env.local");
  }
} catch (e) {
  console.warn("Could not load .env.local file. Relying on system environment variables.", e);
}

// ─── INITIALIZE FIREBASE ADMIN ─────────────────────────────────────────────
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    console.log("Firebase Admin initialized successfully.");
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    process.exit(1);
  }
}

const db = admin.firestore();

// Fetch single movie from TMDB
async function fetchRealMovie(id: string) {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const response = await fetch(`https://api.themoviedb.org/3/movie/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });
    if (response.ok) {
      const data = await response.json();
      return {
        id: id,
        title: data.title,
        posterPath: data.poster_path,
        backdropPath: data.backdrop_path,
        releaseYear: data.release_date ? new Date(data.release_date).getFullYear().toString() : "2000",
        mediaType: "movie" as const
      };
    }
  } catch (err) {
    console.warn(`Failed to fetch TMDB movie ${id}:`, err);
  }
  return null;
}

// ─── SEED DATA DEFINITIONS ────────────────────────────────────────────────
let movieDb = [
  { id: "157336", title: "Interstellar", posterPath: "/gEU2QvEOmfcFgawjJySy67J4nUI.jpg", backdropPath: "/xJHokZbljvjCzoq7bfJEUEZSafe.jpg", releaseYear: "2014", mediaType: "movie" as const },
  { id: "680", title: "Pulp Fiction", posterPath: "/d5iIlvfjmzcO0gFAfs5qq45UrUz.jpg", backdropPath: "/sua75n43n230m2cxzcxZ.jpg", releaseYear: "1994", mediaType: "movie" as const },
  { id: "769", title: "Goodfellas", posterPath: "/aKuFiLV4FGvty8TT2J77jz2vOI0.jpg", backdropPath: "/sua8218asj210asdnas12.jpg", releaseYear: "1990", mediaType: "movie" as const },
  { id: "346", title: "Seven Samurai", posterPath: "/8Gxv2Z7HqD6hwN0jRcZ6kyiW7zS.jpg", backdropPath: "/kurosawaBackdrop.jpg", releaseYear: "1954", mediaType: "movie" as const },
  { id: "62", title: "2001: A Space Odyssey", posterPath: "/907f495147891361.jpg", backdropPath: "/spaceodyssey.jpg", releaseYear: "1968", mediaType: "movie" as const },
  { id: "329", title: "Jurassic Park", posterPath: "/b1xCNmc21XqZ48qz4W76hx.jpg", backdropPath: "/jurassicpark.jpg", releaseYear: "1993", mediaType: "movie" as const },
  { id: "426", title: "Vertigo", posterPath: "/vertigoposter.jpg", backdropPath: "/vertigoback.jpg", releaseYear: "1958", mediaType: "movie" as const },
  { id: "550", title: "Fight Club", posterPath: "/pB8Jhd4ser4421asda.jpg", backdropPath: "/fightclubback.jpg", releaseYear: "1999", mediaType: "movie" as const },
  { id: "129", title: "Spirited Away", posterPath: "/spiritedaway.jpg", backdropPath: "/spiritedback.jpg", releaseYear: "2001", mediaType: "movie" as const },
  { id: "597", title: "Titanic", posterPath: "/titanic.jpg", backdropPath: "/titanicback.jpg", releaseYear: "1997", mediaType: "movie" as const },
  { id: "693134", title: "Dune: Part Two", posterPath: "/czemb574OI8K1QJ5545tQ6BfHth.jpg", backdropPath: "/dunepart2back.jpg", releaseYear: "2024", mediaType: "movie" as const },
  { id: "1417", title: "Pan's Labyrinth", posterPath: "/pans.jpg", backdropPath: "/pansback.jpg", releaseYear: "2006", mediaType: "movie" as const },
  { id: "1018", title: "Mulholland Drive", posterPath: "/mulholland.jpg", backdropPath: "/mulhollandback.jpg", releaseYear: "2001", mediaType: "movie" as const },
  { id: "275", title: "Fargo", posterPath: "/fargo.jpg", backdropPath: "/fargoback.jpg", releaseYear: "1996", mediaType: "movie" as const },
  { id: "120467", title: "The Grand Budapest Hotel", posterPath: "/budapest.jpg", backdropPath: "/budapestback.jpg", releaseYear: "2014", mediaType: "movie" as const },
  { id: "391713", title: "Lady Bird", posterPath: "/ladybird.jpg", backdropPath: "/ladybirdback.jpg", releaseYear: "2017", mediaType: "movie" as const },
  { id: "419430", title: "Get Out", posterPath: "/getout.jpg", backdropPath: "/getoutback.jpg", releaseYear: "2017", mediaType: "movie" as const },
  { id: "496243", title: "Parasite", posterPath: "/gD49W5x55vyFCabKSyJGaIQ8m24Ju.jpg", backdropPath: "/parasiteback.jpg", releaseYear: "2019", mediaType: "movie" as const },
  { id: "747", title: "Shaun of the Dead", posterPath: "/shaun.jpg", backdropPath: "/shaunback.jpg", releaseYear: "2004", mediaType: "movie" as const },
  { id: "44214", title: "Black Swan", posterPath: "/blackswan.jpg", backdropPath: "/blackswanback.jpg", releaseYear: "2010", mediaType: "movie" as const },
];

const profiles = [
  { username: "nolan_fanatic", displayName: "Nolan Fanatic", bio: "Inception is a documentary. Pinned: Interstellar, Memento, The Prestige.", location: "Chicago, IL", favorites: [10, 4, 1, 0] },
  { username: "tarantino_footwear", displayName: "Quentin's Sole", bio: "Feet, trunk shots, and nonlinear narratives. Pulp Fiction is my bible.", location: "Los Angeles, CA", favorites: [1, 2, 7, 18] },
  { username: "scorsese_mafia", displayName: "Goodfella Marty", bio: "As far back as I can remember, I always wanted to be a cinephile.", location: "New York, NY", favorites: [2, 1, 7, 3] },
  { username: "kurosawa_samurai", displayName: "Seven Samurai", bio: "Wind, rain, and human drama. Exploring the golden age of Japanese cinema.", location: "Tokyo, Japan", favorites: [3, 8, 2, 1] },
  { username: "kubrick_stare", displayName: "Kubrick Stare", bio: "One-point perspective enthusiast. Hal 9000 did nothing wrong.", location: "London, UK", favorites: [4, 6, 12, 17] },
  { username: "spielberg_magic", displayName: "Spielberg Kid", bio: "Chasing wonder, dinosaurs, and aliens. Movie magic is real.", location: "Cincinnati, OH", favorites: [5, 9, 3, 0] },
  { username: "hitchcock_vertigo", displayName: "Alfred Vertigo", bio: "Master of suspense. Murder, mystery, and blondes.", location: "San Francisco, CA", favorites: [6, 2, 4, 12] },
  { username: "fincher_grid", displayName: "David Fincher", bio: "Locked down camera movements, green-yellow tint, 90 takes minimum.", location: "Denver, CO", favorites: [7, 1, 10, 16] },
  { username: "miyazaki_sky", displayName: "Ghibli Dreamer", bio: "Lost in the clouds and quiet hand-drawn animations.", location: "Kyoto, Japan", favorites: [8, 11, 14, 3] },
  { username: "cameron_abyss", displayName: "Jim Abyss", bio: "Under the sea, on Pandora, or terminal systems. Box office king.", location: "Miami, FL", favorites: [9, 5, 0, 1] },
  { username: "villeneuve_dune", displayName: "Denis Sandworm", bio: "Chasing spice on Arrakis. Bass-heavy synths and orange horizons.", location: "Montreal, Canada", favorites: [10, 4, 16, 7] },
  { username: "del_toro_beast", displayName: "Guillermo Monsters", bio: "Fairytales, clockworks, and empathetic monsters.", location: "Guadalajara, Mexico", favorites: [11, 8, 17, 13] },
  { username: "lynch_dream", displayName: "Lynchian Dreamer", bio: "Damn good coffee. Blue velvet, red rooms, and dreams within dreams.", location: "Missoula, MT", favorites: [12, 1, 6, 8] },
  { username: "coen_brother", displayName: "Coen Kin", bio: "No country for old movies. Quirky dialogue and dark comedy.", location: "Minneapolis, MN", favorites: [13, 2, 17, 1] },
  { username: "anderson_symmetry", displayName: "Wes Symmetry", bio: "Pastel color palettes, Futura bold font, and centered framing.", location: "Austin, TX", favorites: [14, 12, 8, 17] },
  { username: "gerwig_pink", displayName: "Gerwig Lady", bio: "Coming of age stories, pink sets, and female autonomy.", location: "Sacramento, CA", favorites: [15, 14, 17, 10] },
  { username: "peele_shadow", displayName: "Jordan Shadow", bio: "Modern social horror and mind-bending thrillers.", location: "Seattle, WA", favorites: [16, 17, 1, 7] },
  { username: "bong_parasite", displayName: "Director Bong", bio: "Stairs, rain, class struggle, and peach fuzz.", location: "Seoul, South Korea", favorites: [17, 3, 13, 1] },
  { username: "wright_cornetto", displayName: "Edgar Cornetto", bio: "Whip pans, quick cuts, and ice cream cones. Genre parody master.", location: "Bristol, UK", favorites: [18, 7, 1, 5] },
  { username: "aronofsky_spiral", displayName: "Aronofsky Spiral", bio: "Obsession, extreme close-ups, and psychological spiral.", location: "Brooklyn, NY", favorites: [19, 7, 4, 12] },
];

const mockReviews = [
  "An absolute cinematic masterpiece. The direction, visual scope, and pacing set a new benchmark for the genre. Hans Zimmer's score hits deep.",
  "Engaging from start to finish. The dialogue is snappy, raw, and incredibly memorable. One of those films you can watch on repeat.",
  "Superb performance by the entire cast. The cinematography uses camera locks and angles beautifully to frame absolute tension.",
  "Poetic, slow-paced, and deeply philosophical. Every frame looks like a painting. This is cinema in its purest, rawest form.",
  "Mind-bending and intellectually challenging. A film that respects the audience's intelligence and demands multiple viewings.",
  "Pure wonder and magic. Spielberg knows how to tug at the heartstrings and deliver outstanding blockbuster adventure.",
];

async function loadRealMovieData() {
  console.log("Fetching real movie metadata from TMDB API...");
  const fetched: any[] = [];
  for (const m of movieDb) {
    const data = await fetchRealMovie(m.id);
    if (data) {
      fetched.push(data);
      console.log(`Fetched real TMDB details: ${data.title}`);
    } else {
      fetched.push(m); // fallback
    }
  }
  movieDb = fetched;
  console.log("Movie database metadata resolved.");
}

async function seed() {
  console.log("Starting DB seeding...");
  await loadRealMovieData();

  // 1. Seed Users
  const userIds = profiles.map((_, idx) => `mock_user_${idx}`);
  
  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    const uid = userIds[i];

    // Build favorites object
    const resolvedFavorites = profile.favorites.map(idx => {
      const movie = movieDb[idx];
      return {
        tmdbId: parseInt(movie.id),
        mediaType: movie.mediaType,
        title: movie.title,
        posterPath: movie.posterPath,
        backdropPath: movie.backdropPath,
        year: movie.releaseYear,
      };
    });

    // Make each user follow 3-5 users to build social graphs
    const following = [];
    for (let f = 0; f < 4; f++) {
      const followIdx = (i + f + 1) % profiles.length;
      following.push(userIds[followIdx]);
    }
    const followers = [];
    for (let f = 0; f < 4; f++) {
      const followerIdx = (i - f - 1 + profiles.length) % profiles.length;
      followers.push(userIds[followerIdx]);
    }

    const userData = {
      uid,
      displayName: profile.displayName,
      displayNameLower: profile.displayName.toLowerCase(),
      username: profile.username,
      usernameLower: profile.username.toLowerCase(),
      bio: profile.bio,
      location: profile.location,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`,
      followers,
      following,
      followersCount: followers.length,
      followingCount: following.length,
      favorites: resolvedFavorites,
      createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - i * 24 * 3600 * 1000)),
    };

    await db.collection("users").doc(uid).set(userData);
    console.log(`Seeded user: @${profile.username}`);
  }

  // 2. Seed Watch logs & ratings (watchTracking)
  console.log("Seeding watch tracking data...");
  for (let i = 0; i < userIds.length; i++) {
    const uid = userIds[i];
    // Each user watches 5 random movies
    const watchedIndexes = new Set<number>();
    while (watchedIndexes.size < 6) {
      watchedIndexes.add(Math.floor(Math.random() * movieDb.length));
    }

    const arrIdx = Array.from(watchedIndexes);
    for (let j = 0; j < arrIdx.length; j++) {
      const movie = movieDb[arrIdx[j]];
      const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars
      const trackingId = `${uid}_${movie.id}`;
      
      await db.collection("watchTracking").doc(trackingId).set({
        userId: uid,
        mediaId: movie.id,
        mediaType: movie.mediaType,
        status: "watched",
        watchDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() - j * 12 * 3600 * 1000)),
        rating,
        rewatchCount: Math.random() > 0.7 ? 1 : 0
      });
    }
  }

  // 3. Seed Activities & Reviews
  console.log("Seeding social activities feed...");
  const activityIds: string[] = [];
  for (let i = 0; i < userIds.length; i++) {
    const uid = userIds[i];
    const profile = profiles[i];
    
    // Create a review activity
    const movieIdx = profile.favorites[0];
    const movie = movieDb[movieIdx];
    const reviewText = mockReviews[i % mockReviews.length];
    const rating = 5;

    const activityRef = db.collection("activities").doc();
    const activityData = {
      id: activityRef.id,
      userId: uid,
      type: "reviewed" as const,
      movieId: movie.id,
      tvId: null,
      rating,
      reviewText,
      containsSpoilers: false,
      commentsCount: 2,
      createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - i * 6 * 3600 * 1000)),
      mediaSnapshot: {
        id: movie.id,
        title: movie.title,
        posterPath: movie.posterPath,
        backdropPath: movie.backdropPath,
        rating: 4.8,
        releaseYear: movie.releaseYear,
        mediaType: movie.mediaType
      }
    };

    await activityRef.set(activityData);
    activityIds.push(activityRef.id);

    // Seed 2 comments under each review activity
    const commentUser1 = userIds[(i + 1) % userIds.length];
    const commentUser2 = userIds[(i + 2) % userIds.length];

    await activityRef.collection("comments").add({
      id: `comment_${Date.now()}_1`,
      userId: commentUser1,
      content: "Couldn't agree more! Spot on review.",
      createdAt: admin.firestore.Timestamp.fromDate(new Date())
    });

    await activityRef.collection("comments").add({
      id: `comment_${Date.now()}_2`,
      userId: commentUser2,
      content: "Interesting perspective. Added this to my watchlist!",
      createdAt: admin.firestore.Timestamp.fromDate(new Date())
    });

    // Seed 3 reactions
    const reactUsers = [userIds[(i + 3) % userIds.length], userIds[(i + 4) % userIds.length], userIds[(i + 5) % userIds.length]];
    const reactTypes = ["love", "peak", "applause"] as const;
    for (let r = 0; r < 3; r++) {
      await activityRef.collection("reactions").doc(reactUsers[r]).set({
        type: reactTypes[r],
        userId: reactUsers[r],
        createdAt: admin.firestore.Timestamp.fromDate(new Date())
      });
    }
  }

  // 4. Seed Lists
  console.log("Seeding custom curation lists...");
  const listThemes = [
    { title: "Nolan Masterpieces Ranked", tag: "sci-fi", desc: "My personal ranking of Christopher Nolan films. Subject to change upon rewatches." },
    { title: "Peak Cinema Bible", tag: "masterpiece", desc: "Films that redefined the medium. Absolute 5-star rating essentials." },
    { title: "Spirited & Magical Animations", tag: "ghibli", desc: "Warm animations that capture childhood wonder and beautiful horizons." },
    { title: "Tense Crime & Mafia Thrillers", tag: "thriller", desc: "Fast-talking, blood-splattered, crime-focused masterworks." },
  ];

  for (let i = 0; i < listThemes.length; i++) {
    const theme = listThemes[i];
    const ownerIdx = i % userIds.length;
    const ownerUid = userIds[ownerIdx];
    const ownerProfile = profiles[ownerIdx];

    const listRef = db.collection("lists").doc();
    const slug = theme.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    
    // Pick 4 movies for the list items
    const listMovieIndexes = [(i) % movieDb.length, (i + 1) % movieDb.length, (i + 2) % movieDb.length, (i + 3) % movieDb.length];
    const listMovies = listMovieIndexes.map(idx => movieDb[idx]);

    const listData = {
      id: listRef.id,
      ownerId: ownerUid,
      ownerUsername: ownerProfile.username,
      title: theme.title,
      slug,
      description: theme.desc,
      visibility: "public" as const,
      containsSpoilers: false,
      coverMediaId: listMovies[0].id,
      coverMediaType: listMovies[0].mediaType,
      collaborators: [],
      tags: [theme.tag, "curated", "essentials"],
      likesCount: 15 - i,
      commentsCount: 1,
      savesCount: 8 - i,
      viewsCount: 120 + i * 10,
      forksCount: i,
      itemsCount: listMovies.length,
      estimatedWatchTimeHours: listMovies.length * 2,
      isPinned: i === 0,
      originalListId: null,
      featuredItems: listMovies.map(m => ({ title: m.title, posterPath: m.posterPath })),
      createdAt: admin.firestore.Timestamp.fromDate(new Date()),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
      lastEditedBy: { uid: ownerUid, username: ownerProfile.username }
    };

    await listRef.set(listData);

    // Add list items subcollection
    for (let l = 0; l < listMovies.length; l++) {
      const m = listMovies[l];
      await listRef.collection("items").doc(m.id).set({
        id: m.id,
        mediaId: m.id,
        mediaType: m.mediaType,
        title: m.title,
        posterPath: m.posterPath,
        releaseYear: m.releaseYear,
        notes: `Cinephile recommendation detail note for ${m.title}. Perfect pacing and tone.`,
        noteImageUrl: null,
        addedAt: admin.firestore.Timestamp.fromDate(new Date()),
        orderIndex: l
      });
    }

    // Add a comment
    const commenter = userIds[(ownerIdx + 1) % userIds.length];
    const commenterProfile = profiles[(ownerIdx + 1) % userIds.length];
    await listRef.collection("comments").add({
      id: `list_comment_${Date.now()}`,
      userId: commenter,
      content: "Amazing list selection! Added a few of these to my watchlist.",
      createdAt: admin.firestore.Timestamp.fromDate(new Date()),
      userName: commenterProfile.displayName,
      userPhoto: `https://api.dicebear.com/7.x/bottts/svg?seed=${commenterProfile.username}`
    });

    // Also register list_created activity
    const activityRef = db.collection("activities").doc();
    await activityRef.set({
      id: activityRef.id,
      userId: ownerUid,
      type: "list_created" as const,
      movieId: null,
      tvId: null,
      rating: null,
      reviewText: null,
      containsSpoilers: false,
      commentsCount: 0,
      createdAt: admin.firestore.Timestamp.fromDate(new Date()),
      listTitle: theme.title,
      listId: listRef.id,
      activitySnapshot: {
        title: theme.title,
        description: theme.desc,
        type: "collection" as const,
        tags: [theme.tag, "curated", "essentials"],
        posterIds: listMovies.map(m => m.posterPath || ""),
        featuredItems: listMovies.map(m => ({ title: m.title, posterPath: m.posterPath })),
        itemsCount: listMovies.length
      }
    });
  }

  console.log("DB Seeding completed successfully!");
}

seed().catch(err => {
  console.error("Seeding crashed with error:", err);
  process.exit(1);
});
