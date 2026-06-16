"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { db } from "@/lib/firebase/clientApp";
import { doc, getDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { setupProfile, checkUsernameUnique, getCurrentUserProfile, uploadAvatarServer, searchTMDBSocial } from "@/actions/user.actions";
import { deleteAccount } from "@/actions/auth.actions";
import { auth } from "@/lib/firebase/clientApp";
import { signOut } from "firebase/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ArrowRight, Check, Film, Tv, Sparkles, User, Upload, Trash2, AlertTriangle, Search } from "lucide-react";
import Image from "next/image";
import { SafeAvatar } from "@/components/shared/SafeAvatar";


const GENRES = [
  "Action", "Adventure", "Sci-Fi", "Thriller", 
  "Drama", "Comedy", "Horror", "Romance", 
  "Animation", "Anime", "Documentary", "Fantasy"
];

const ACCOUNT_TYPES = [
  {
    id: "viewer",
    icon: "🎬",
    title: "Viewer",
    description: "Tracks movies and watchlists.",
  },
  {
    id: "reviewer",
    icon: "⭐",
    title: "Reviewer",
    description: "Writes reviews and ratings.",
  },
  {
    id: "curator",
    icon: "📚",
    title: "Curator",
    description: "Builds lists and custom collections.",
  },
  {
    id: "creator",
    icon: "🎥",
    title: "Creator",
    description: "Creates discussions, news, and posts.",
  },
] as const;

function SetupProfileForm() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";

  // Step state
  const [step, setStep] = useState(1);
  const [fetchingData, setFetchingData] = useState(true);

  // Form values
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [initialUsername, setInitialUsername] = useState("");
  const [bio, setBio] = useState("");
  const [accountType, setAccountType] = useState<"viewer" | "reviewer" | "curator" | "creator" | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Avatar states
  const [selectedOption, setSelectedOption] = useState<"google" | "upload" | "initials" | "skip">("initials");
  const [uploadedPhotoURL, setUploadedPhotoURL] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation / check states
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // New onboarding states for favorite movie selection
  const [favoriteMovie, setFavoriteMovie] = useState<{ tmdbId: number; title: string; posterPath: string | null } | null>(null);
  const [movieSearchQuery, setMovieSearchQuery] = useState("");
  const [movieSearchResults, setMovieSearchResults] = useState<any[]>([]);
  const [searchingMovies, setSearchingMovies] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Initialize photo option on user load
  useEffect(() => {
    if (user?.photoURL) {
      setSelectedOption("google");
    } else {
      setSelectedOption("initials");
    }
  }, [user]);

  // Load existing values or redirect if complete
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    const checkExistingProfile = async () => {
      try {
        const res = await getCurrentUserProfile();
        if (res.success && res.exists && res.data) {
          const data = res.data;
          // Only auto-redirect to feed if NOT in edit mode
          if (data.profileCompleted === true && !isEditMode) {
            router.push("/feed");
            return;
          }
          // Pre-populate draft values if any
          if (data.username) {
            setUsername(data.username);
            setInitialUsername(data.username);
          }
          if (data.displayName) setDisplayName(data.displayName);
          if (data.bio) setBio(data.bio);
          if (data.accountType) setAccountType(data.accountType);
          if (data.preferences?.favoriteGenres) setSelectedGenres(data.preferences.favoriteGenres);

          if (data.photoURL) {
            if (data.photoURL === user?.photoURL) {
              setSelectedOption("google");
            } else {
              setUploadedPhotoURL(data.photoURL);
              setSelectedOption("upload");
            }
          }
        } else {
          // Pre-populate from Firebase Auth defaults
          if (user.displayName) {
            setDisplayName(user.displayName);
            // Derive a basic username
            const derived = user.displayName.replace(/\s+/g, "").toLowerCase().slice(0, 20);
            setUsername(derived);
          }
        }
      } catch (err) {
        console.warn("Error checking profile:", err);
      } finally {
        setFetchingData(false);
      }
    };

    checkExistingProfile();
  }, [user, authLoading, router]);

  // Username validation and debounced uniqueness check
  useEffect(() => {
    if (!username) {
      setUsernameError("");
      setUsernameAvailable(false);
      return;
    }

    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      setUsernameAvailable(false);
      return;
    }
    if (trimmed.length > 20) {
      setUsernameError("Username cannot exceed 20 characters");
      setUsernameAvailable(false);
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameError("Only alphanumeric characters and underscores are allowed");
      setUsernameAvailable(false);
      return;
    }

    if (trimmed.toLowerCase() === initialUsername.toLowerCase()) {
      setUsernameAvailable(true);
      setUsernameError("");
      setCheckingUsername(false);
      return;
    }

    setCheckingUsername(true);
    setUsernameError("");
    setUsernameAvailable(false);

    const checkUnique = setTimeout(async () => {
      try {
        const isUnique = await checkUsernameUnique(trimmed);
        if (isUnique) {
          setUsernameAvailable(true);
          setUsernameError("");
        } else {
          setUsernameError("This username is already taken");
          setUsernameAvailable(false);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(checkUnique);
  }, [username, initialUsername]);

  // Favorite movie search query debounce
  useEffect(() => {
    if (!movieSearchQuery || movieSearchQuery.trim().length < 2) {
      setMovieSearchResults([]);
      return;
    }

    setSearchingMovies(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const results = await searchTMDBSocial(movieSearchQuery);
        setMovieSearchResults(results || []);
      } catch (err) {
        console.warn("Error searching movies:", err);
      } finally {
        setSearchingMovies(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [movieSearchQuery]);

  // Welcome splash auto-redirect
  useEffect(() => {
    if (isFinished) {
      const timer = setTimeout(() => {
        router.push("/feed");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isFinished, router]);

  if (authLoading || fetchingData) {
    return (
      <div className="min-h-screen bg-[#0F0F1A] text-white flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="mt-4 text-sm text-muted-foreground">Preparing Cinephile Setup...</p>
      </div>
    );
  }

  if (isFinished) {
    const moviePosterUrl = favoriteMovie?.posterPath 
      ? `https://image.tmdb.org/t/p/w500${favoriteMovie.posterPath}`
      : null;

    return (
      <div className="min-h-screen bg-[#0F0F1A] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
        {/* Movie Poster as blurred ambient backing */}
        {moviePosterUrl && (
          <div className="absolute inset-0 z-0 opacity-25 scale-110 pointer-events-none filter blur-[80px]">
            <Image
              src={moviePosterUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        {/* Additional gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F0F1A]/40 via-[#0F0F1A]/80 to-[#0F0F1A] z-0 pointer-events-none" />

        <div className="text-center space-y-6 max-w-md relative z-10">
          <div className="inline-flex p-4 bg-primary/10 rounded-2xl border border-primary/20 text-primary shadow-[0_0_30px_rgba(233,69,96,0.25)]">
            <Sparkles className="h-10 w-10 animate-spin duration-[10s]" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight font-display text-white">
              Welcome, {displayName}.
            </h1>
            <p className="text-lg text-zinc-400 font-medium">
              Let's build your cinema world.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Genre selection handler
  const handleGenreToggle = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    } else {
      if (selectedGenres.length >= 3) return; // limit to 3
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!displayName.trim() || !username.trim() || !bio.trim()) {
        setSubmitError("All identity fields are required.");
        return;
      }
      if (usernameError || !usernameAvailable) {
        setSubmitError("Please choose an available username.");
        return;
      }
      if (bio.length > 150) {
        setSubmitError("Bio must be 150 characters or less.");
        return;
      }
    }
    if (step === 2) {
      if (!accountType) {
        setSubmitError("Please select an account type.");
        return;
      }
    }
    setSubmitError("");
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setSubmitError("");
    setStep(step - 1);
  };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reject files > 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert("File size exceeds 2MB limit.");
      setSubmitError("File size exceeds 2MB limit.");
      return;
    }

    // Reject unsupported formats
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Supported file formats are: JPG, PNG, WEBP.");
      setSubmitError("Supported file formats are: JPG, PNG, WEBP.");
      return;
    }

    setUploading(true);
    setSubmitError("");

    try {
      // Convert file to base64 to send to server action
      const reader = new FileReader();
      const readPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });

      const base64 = await readPromise;
      const base64Data = base64.split(",")[1];

      const res = await uploadAvatarServer(base64Data, file.type);
      if (res.success && res.downloadURL) {
        setUploadedPhotoURL(res.downloadURL);
        setSelectedOption("upload");
      } else {
        throw new Error(res.error || "Upload failed");
      }
    } catch (error) {
      console.error("[Avatar Upload Error]", error);
      alert("Avatar upload failed.");
      setSubmitError("Failed to upload avatar.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!accountType) {
      setSubmitError("Please go back and select an account type.");
      return;
    }
    if (!displayName.trim() || !username.trim() || !bio.trim()) {
      setSubmitError("Identity fields are required.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    let finalPhotoURL = "";
    if (selectedOption === "google") {
      finalPhotoURL = user?.photoURL || "";
    } else if (selectedOption === "upload") {
      finalPhotoURL = uploadedPhotoURL;
    } else if (selectedOption === "initials" || selectedOption === "skip") {
      finalPhotoURL = "";
    }

    try {
      const res = await setupProfile({
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        accountType,
        favoriteGenres: selectedGenres,
        favoriteMovie: favoriteMovie,
        photoURL: finalPhotoURL,
      });

      if (res.success) {
        setIsFinished(true);
      } else {
        setSubmitError(res.error || "Failed to finalize profile.");
      }
    } catch (err: any) {
      setSubmitError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow animations */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-primary/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        {/* Top brand header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black tracking-tight uppercase flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            Cinephile
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Setup your cinematic identity</p>
        </div>

        <Card className="border-white/5 bg-card/60 backdrop-blur-xl shadow-2xl rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Step {step} of 5
              </span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                      s <= step ? "bg-primary" : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>

            {step === 1 && (
              <>
                <CardTitle className="text-xl font-black uppercase text-white">Welcome to Cinephile</CardTitle>
                <CardDescription>How will you be known in the Cinephile community?</CardDescription>
              </>
            )}

            {step === 2 && (
              <>
                <CardTitle className="text-xl font-black uppercase text-white">Select account type</CardTitle>
                <CardDescription>This customizes your profile experience and features.</CardDescription>
              </>
            )}

            {step === 3 && (
              <>
                <CardTitle className="text-xl font-black uppercase text-white">Your favorite genres</CardTitle>
                <CardDescription>Select up to 3 genres that define your taste (optional).</CardDescription>
              </>
            )}

            {step === 4 && (
              <>
                <CardTitle className="text-xl font-black uppercase text-white">Favorite movie</CardTitle>
                <CardDescription>Search and select your absolute favorite movie (optional).</CardDescription>
              </>
            )}

            {step === 5 && (
              <>
                <CardTitle className="text-xl font-black uppercase text-white">Avatar configuration</CardTitle>
                <CardDescription>Use your linked avatar or set a custom image.</CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {submitError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-lg font-medium">
                {submitError}
              </div>
            )}

            {/* STEP 1: IDENTITY */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                    Display Name
                  </Label>
                  <Input
                    id="displayName"
                    placeholder="e.g. Jane Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                    className="border-white/10 bg-white/5 focus-visible:ring-primary rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                    Username
                  </Label>
                  <div className="relative">
                    <Input
                      id="username"
                      placeholder="e.g. janedoe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={20}
                      className={`border-white/10 bg-white/5 focus-visible:ring-primary rounded-xl pr-10 ${
                        usernameAvailable ? "border-emerald-500/50" : usernameError ? "border-rose-500/50" : ""
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      {checkingUsername && <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />}
                      {!checkingUsername && usernameAvailable && <Check className="h-4 w-4 text-emerald-500" />}
                    </div>
                  </div>
                  {usernameError && <p className="text-xs text-rose-500">{usernameError}</p>}
                  {!usernameError && usernameAvailable && (
                    <p className="text-xs text-emerald-500">Username is available!</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="bio" className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                      Bio
                    </Label>
                    <span className="text-[10px] text-zinc-500 font-bold">{bio.length}/150</span>
                  </div>
                  <textarea
                    id="bio"
                    placeholder="Tell the community about your cinematic tastes..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={150}
                    rows={4}
                    className="flex w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-colors resize-none"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: ACCOUNT TYPE */}
            {step === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ACCOUNT_TYPES.map((type) => {
                  const isSelected = accountType === type.id;
                  return (
                    <div
                      key={type.id}
                      onClick={() => {
                        setAccountType(type.id);
                        setSubmitError("");
                      }}
                      className={`border px-4 py-2.5 rounded-xl cursor-pointer select-none transition-all duration-200 flex items-center gap-3 h-20 hover:scale-[1.01] active:scale-[0.99] ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-[0_0_10px_rgba(233,69,96,0.15)]"
                          : "border-white/5 bg-white/5 hover:border-white/10"
                      }`}
                    >
                      <span className="text-2xl shrink-0">{type.icon}</span>
                      <div className="min-w-0 leading-tight flex flex-col justify-center">
                        <h3 className="text-xs font-black uppercase tracking-wider text-white">{type.title}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* STEP 3: FAVORITE GENRES */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold uppercase text-zinc-400">
                  <span>Select up to 3</span>
                  <span className={selectedGenres.length === 3 ? "text-primary" : ""}>
                    {selectedGenres.length}/3 Selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {GENRES.map((genre) => {
                    const isSelected = selectedGenres.includes(genre);
                    const disabled = !isSelected && selectedGenres.length >= 3;
                    return (
                      <button
                        key={genre}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleGenreToggle(genre)}
                        className={`text-xs px-3.5 py-2 rounded-full border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary text-white font-bold"
                            : disabled
                            ? "border-white/5 bg-white/2 text-zinc-600 cursor-not-allowed"
                            : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/30"
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 4: FAVORITE MOVIE SEARCH */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="movieSearch" className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                    Search Movies
                  </Label>
                  <div className="relative">
                    <Input
                      id="movieSearch"
                      placeholder="Type a movie title..."
                      value={movieSearchQuery}
                      onChange={(e) => setMovieSearchQuery(e.target.value)}
                      className="border-white/10 bg-white/5 focus-visible:ring-primary rounded-xl pl-10 pr-4"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
                      {searchingMovies ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Selected Movie Preview Card */}
                {favoriteMovie && (
                  <div className="cine-card bg-primary/5 border-primary/30 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-8 overflow-hidden rounded-md border border-white/10 shrink-0">
                        {favoriteMovie.posterPath ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w92${favoriteMovie.posterPath}`}
                            alt={favoriteMovie.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="h-full w-full bg-zinc-800 flex items-center justify-center text-[10px]">🎬</div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-primary font-black uppercase tracking-wider">Your Favorite Movie</p>
                        <p className="text-sm font-bold text-white leading-tight mt-0.5">{favoriteMovie.title}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFavoriteMovie(null)}
                      className="text-xs text-zinc-500 hover:text-white px-2.5 py-1 rounded-md bg-white/5 border border-white/5 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {/* Search Results List */}
                <div className="max-h-[200px] overflow-y-auto space-y-2.5 pr-1 scrollbar-hide">
                  {movieSearchResults.length > 0 ? (
                    movieSearchResults.map((m) => {
                      const isSelected = favoriteMovie?.tmdbId === m.id;
                      const year = m.release_date ? m.release_date.split("-")[0] : "";
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            setFavoriteMovie({
                              tmdbId: m.id,
                              title: m.title || m.name,
                              posterPath: m.poster_path || null,
                            });
                          }}
                          className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all border ${
                            isSelected 
                              ? "border-primary bg-primary/10" 
                              : "border-white/5 bg-white/3 hover:border-white/20"
                          }`}
                        >
                          <div className="relative h-10 w-7 overflow-hidden rounded bg-zinc-800 shrink-0">
                            {m.poster_path ? (
                              <Image
                                src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                                alt={m.title || m.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[8px]">🎬</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{m.title || m.name}</p>
                            {year && <p className="text-[10px] text-zinc-500 font-extrabold mt-0.5">{year}</p>}
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-primary shrink-0 mr-2" />}
                        </div>
                      );
                    })
                  ) : (
                    movieSearchQuery.trim().length >= 2 && !searchingMovies && (
                      <p className="text-xs text-zinc-500 text-center py-4">No matching movies found.</p>
                    )
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: PROFILE PHOTO */}
            {step === 5 && (
              <div className="flex flex-col items-center space-y-6">
                {/* Large Circular Avatar Preview */}
                <div className="relative w-32 h-32 rounded-full border-2 border-primary/45 p-1 select-none">
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-zinc-900 flex items-center justify-center">
                    {selectedOption === "google" && user?.photoURL && (
                      <SafeAvatar
                        src={user.photoURL}
                        alt="Google avatar preview"
                        name={displayName || user.displayName || "C"}
                        size={120}
                        className="border-none"
                      />
                    )}
                    {selectedOption === "upload" && (
                      uploadedPhotoURL ? (
                        <SafeAvatar
                          src={uploadedPhotoURL}
                          alt="Uploaded avatar preview"
                          name={displayName || "C"}
                          size={120}
                          className="border-none"
                        />
                      ) : (
                        <div className="flex flex-col items-center text-zinc-500">
                          <Upload className="h-8 w-8 animate-pulse" />
                          <span className="text-[10px] mt-1">Ready</span>
                        </div>
                      )
                    )}
                    {selectedOption === "initials" && (
                      <div className="h-full w-full bg-primary/20 flex items-center justify-center text-5xl font-black text-primary uppercase select-none">
                        {displayName?.[0] || "C"}
                      </div>
                    )}
                    {selectedOption === "skip" && (
                      <div className="h-full w-full bg-zinc-800/80 flex items-center justify-center select-none">
                        <User className="h-14 w-14 text-zinc-600" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtitle */}
                <div className="text-center">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Profile Photo</h3>
                  <p className="text-xs text-muted-foreground mt-1">Choose how you'd like your profile picture to appear.</p>
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Four Card Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  {/* Option 1: Google Photo */}
                  <div
                    onClick={() => {
                      if (user?.photoURL) {
                        setSelectedOption("google");
                        setSubmitError("");
                      }
                    }}
                    className={`border p-4 rounded-xl select-none transition-all duration-200 flex flex-col h-full ${
                      !user?.photoURL
                        ? "border-white/2 bg-white/1 opacity-40 cursor-not-allowed"
                        : selectedOption === "google"
                        ? "border-primary bg-primary/10 cursor-pointer hover:scale-[1.01]"
                        : "border-white/5 bg-white/5 cursor-pointer hover:border-white/20 hover:scale-[1.01]"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg">🌐</span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Google Photo</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal flex-1">
                      Use your linked Google account picture.
                    </p>
                  </div>

                  {/* Option 2: Upload From Gallery */}
                  <div
                    onClick={() => {
                      if (!uploading) {
                        fileInputRef.current?.click();
                      }
                    }}
                    className={`border p-4 rounded-xl cursor-pointer select-none transition-all duration-200 flex flex-col h-full hover:scale-[1.01] ${
                      selectedOption === "upload"
                        ? "border-primary bg-primary/10"
                        : "border-white/5 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      {uploading ? (
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      ) : (
                        <span className="text-lg">📤</span>
                      )}
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">
                        {uploading ? "Uploading..." : "Upload Image"}
                      </h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal flex-1">
                      Choose a file from your device (JPG, PNG, WEBP, max 2MB).
                    </p>
                  </div>

                  {/* Option 3: Initials Fallback */}
                  <div
                    onClick={() => {
                      setSelectedOption("initials");
                      setSubmitError("");
                    }}
                    className={`border p-4 rounded-xl cursor-pointer select-none transition-all duration-200 flex flex-col h-full hover:scale-[1.01] ${
                      selectedOption === "initials"
                        ? "border-primary bg-primary/10"
                        : "border-white/5 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg">🔠</span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Initials Avatar</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal flex-1">
                      Generate a clean avatar from your display name initials.
                    </p>
                  </div>

                  {/* Option 4: Skip For Now */}
                  <div
                    onClick={() => {
                      setSelectedOption("skip");
                      setSubmitError("");
                    }}
                    className={`border p-4 rounded-xl cursor-pointer select-none transition-all duration-200 flex flex-col h-full hover:scale-[1.01] ${
                      selectedOption === "skip"
                        ? "border-primary bg-primary/10"
                        : "border-white/5 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg">⏭️</span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Skip For Now</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal flex-1">
                      Continue with dynamic fallback avatar. Can update later.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between border-t border-white/5 pt-6">
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={handlePrevStep}
                disabled={submitting}
                className="border-white/10 hover:bg-white/5 text-zinc-300 font-bold uppercase tracking-wider text-xs px-5 py-4 rounded-xl cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <Button
                onClick={handleNextStep}
                className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider text-xs px-5 py-4 rounded-xl cursor-pointer"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider text-xs px-6 py-4 rounded-xl cursor-pointer shadow-[0_0_20px_rgba(233,69,96,0.3)] hover:shadow-[0_0_35px_rgba(233,69,96,0.5)] transition-all duration-200"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* ── Danger Zone ─────────────────────────────────────────── */}
      <div className="w-full max-w-xl relative z-10 mt-6 mb-24">
        <div className="border border-red-900/40 rounded-2xl bg-red-950/10 backdrop-blur p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-black uppercase tracking-wider text-red-400">Danger Zone</h3>
          </div>
          <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
            Permanently delete your account and all associated data — reviews, lists, watch history, and notifications. This cannot be undone.
          </p>
          <Button
            variant="outline"
            id="delete-account-btn"
            onClick={() => { setShowDeleteModal(true); setDeleteError(""); setDeleteConfirmText(""); }}
            className="border-red-800/50 text-red-400 hover:bg-red-900/20 hover:text-red-300 text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Delete My Account
          </Button>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-zinc-950 border border-red-900/50 rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-red-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Delete Account</h3>
                <p className="text-xs text-zinc-500">This action is permanent and irreversible.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              All your <span className="text-white font-semibold">reviews, lists, watch history, and notifications</span> will be permanently erased.
              Type <span className="font-black text-red-400 tracking-widest">DELETE</span> below to confirm.
            </p>

            <Input
              id="delete-confirm-input"
              placeholder="Type DELETE to confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              disabled={deleting}
              className="border-red-900/40 bg-white/5 focus-visible:ring-red-500 text-white mb-3 rounded-xl"
            />

            {deleteError && (
              <p className="text-xs text-red-400 mb-3 font-medium">{deleteError}</p>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 border-zinc-800 text-zinc-400 hover:bg-zinc-900 text-xs font-bold uppercase cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                id="confirm-delete-btn"
                onClick={async () => {
                  if (deleteConfirmText !== "DELETE") {
                    setDeleteError('Please type DELETE exactly to confirm.');
                    return;
                  }
                  setDeleting(true);
                  setDeleteError("");
                  const res = await deleteAccount();
                  if (res.success) {
                    // Sign out locally then redirect
                    await signOut(auth).catch(() => {});
                    router.push("/");
                  } else {
                    setDeleteError(res.error || "Failed to delete account. Try again.");
                    setDeleting(false);
                  }
                }}
                disabled={deleting || deleteConfirmText !== "DELETE"}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="h-3.5 w-3.5 mr-1.5" /> Confirm Delete</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SetupProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="mt-4 text-sm text-muted-foreground font-semibold">Preparing Setup...</p>
      </div>
    }>
      <SetupProfileForm />
    </Suspense>
  );
}
