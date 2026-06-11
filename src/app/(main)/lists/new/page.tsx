"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createList } from "@/actions/list.actions";
import { searchTMDBSocial, searchUsers } from "@/actions/user.actions";
import { Button } from "@/components/ui/button";
import { 
  Search, X, Loader2, ArrowUp, ArrowDown, 
  Trash, Users, Eye, EyeOff, ShieldAlert,
  HelpCircle, Settings, CheckCircle2
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";

interface ListItem {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: string;
  noteText: string;
}

interface Collaborator {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string | null;
}

export default function NewListPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private" | "unlisted">("public");
  const [type, setType] = useState<"ranking" | "collection" | "watchlist">("collection");
  const [tagsInput, setTagsInput] = useState("");
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Items State
  const [items, setItems] = useState<ListItem[]>([]);
  const [coverItemIdx, setCoverItemIdx] = useState<number | null>(null);

  // TMDB Media Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingMedia, setSearchingMedia] = useState(false);

  // Collaborators State
  const [collabQuery, setCollabQuery] = useState("");
  const [collabResults, setCollabResults] = useState<any[]>([]);
  const [searchingCollabs, setSearchingCollabs] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  // Search Media Trigger
  const handleMediaSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchingMedia(true);
    try {
      const results = await searchTMDBSocial(val);
      const filtered = results.filter((item: any) => item.media_type === "movie" || item.media_type === "tv");
      setSearchResults(filtered);
    } catch (e) {
      console.warn("[Lists/New] Media search error:", e);
    } finally {
      setSearchingMedia(false);
    }
  };

  // Add Item to List
  const handleAddItem = (item: any) => {
    const tmdbId = item.id;
    const mediaType = item.media_type as "movie" | "tv";
    
    // Duplicate Prevention Check
    const exists = items.some((i) => i.tmdbId === tmdbId && i.mediaType === mediaType);
    if (exists) {
      alert(`"${item.title || item.name}" is already in your list!`);
      return;
    }

    const title = item.title || item.name;
    const date = item.release_date || item.first_air_date || "";
    const releaseYear = date ? date.split("-")[0] : "";

    const newItem: ListItem = {
      tmdbId,
      mediaType,
      title,
      posterPath: item.poster_path || null,
      backdropPath: item.backdrop_path || null,
      releaseYear,
      noteText: "",
    };

    setItems((prev) => [...prev, newItem]);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Move Item Order
  const handleMove = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= items.length) return;

    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = temp;

    // Adjust cover index if affected
    if (coverItemIdx === index) {
      setCoverItemIdx(nextIndex);
    } else if (coverItemIdx === nextIndex) {
      setCoverItemIdx(index);
    }

    setItems(updated);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    if (coverItemIdx === index) {
      setCoverItemIdx(null);
    } else if (coverItemIdx !== null && coverItemIdx > index) {
      setCoverItemIdx(coverItemIdx - 1);
    }
  };

  // Collaborator Search Trigger
  const handleCollabSearch = async (val: string) => {
    setCollabQuery(val);
    if (val.trim().length < 2) {
      setCollabResults([]);
      return;
    }
    setSearchingCollabs(true);
    try {
      const results = await searchUsers(val);
      // Filter out self
      const filtered = results.filter((c: any) => c.uid !== user?.uid);
      setCollabResults(filtered);
    } catch (e) {
      console.warn("[Lists/New] Collaborators search error:", e);
    } finally {
      setSearchingCollabs(false);
    }
  };

  // Add Collaborator
  const handleAddCollab = (c: any) => {
    if (collaborators.some((collab) => collab.uid === c.uid)) {
      setCollabQuery("");
      setCollabResults([]);
      return;
    }
    setCollaborators((prev) => [
      ...prev,
      {
        uid: c.uid,
        username: c.username,
        displayName: c.displayName,
        photoURL: c.photoURL,
      },
    ]);
    setCollabQuery("");
    setCollabResults([]);
  };

  // Remove Collaborator
  const handleRemoveCollab = (uid: string) => {
    setCollaborators((prev) => prev.filter((c) => c.uid !== uid));
  };

  // Form Submit Action
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("List title is required.");
      return;
    }
    if (items.length === 0) {
      setErrorMsg("Please add at least one film or show to the list.");
      return;
    }

    setErrorMsg("");
    
    // Parse tags input (split by comma and clean)
    const tags = tagsInput
      .split(",")
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0);

    // Selected cover options
    const selectedCover = coverItemIdx !== null ? items[coverItemIdx] : null;
    const coverItem = selectedCover 
      ? {
          tmdbId: selectedCover.tmdbId,
          mediaType: selectedCover.mediaType,
          title: selectedCover.title,
          backdropPath: selectedCover.backdropPath,
        }
      : null;

    // Map items to subcollection list item format
    const mappedItems = items.map((i) => ({
      tmdbId: i.tmdbId,
      mediaType: i.mediaType,
      title: i.title,
      posterPath: i.posterPath,
      releaseYear: i.releaseYear,
      note: i.noteText.trim(),
    }));

    startTransition(async () => {
      const res = await createList({
        title: title.trim(),
        description: description.trim(),
        visibility,
        type,
        tags,
        collaborators,
        containsSpoilers,
        coverItem,
        items: mappedItems,
      });

      if (res.success && res.slug) {
        router.push(`/list/${res.slug}`);
      } else {
        setErrorMsg(res.error || "Failed to create list. Try again.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#0F0F1A] py-8 pb-16 text-white select-none">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Header */}
        <div className="border-b border-white/5 pb-4 mb-6">
          <h1 className="text-2xl font-black uppercase tracking-tight">Create Custom List</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Build, caption, and share custom movie selections with friends.</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive font-bold text-[13px] flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Columns: Form Fields & Search */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Title & Description */}
            <div className="bg-card/20 border border-white/5 rounded-2xl p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground">List Title</label>
                <input 
                  type="text"
                  maxLength={100}
                  placeholder="e.g., Nolan Ranked, Top Sci-Fi Thrillers..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-input/10 border border-white/10 rounded-xl px-4 py-2.5 text-[14px] focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary h-auto transition-all text-white placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground">Description</label>
                <textarea 
                  rows={3}
                  maxLength={2000}
                  placeholder="Tell people what this list is about..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-input/10 border border-white/10 rounded-xl px-4 py-2.5 text-[14px] focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary h-auto transition-all text-white placeholder:text-muted-foreground resize-none"
                />
              </div>
            </div>

            {/* Movie/TV Search & Add Panel */}
            <div className="bg-card/20 border border-white/5 rounded-2xl p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground flex items-center gap-1">
                  Add Films & Shows <span className="text-primary">*</span>
                </label>
                <div className="relative flex items-center">
                  <Search className="h-4.5 w-4.5 text-muted-foreground absolute left-3.5" />
                  <input 
                    type="text"
                    placeholder="Search movies or TV shows to add..."
                    value={searchQuery}
                    onChange={(e) => handleMediaSearch(e.target.value)}
                    className="w-full bg-input/10 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-[14px] focus-visible:outline-none focus-visible:border-primary h-auto transition-all text-white placeholder:text-muted-foreground"
                  />
                  {searchingMedia && (
                    <Loader2 className="h-4.5 w-4.5 animate-spin text-primary absolute right-3.5" />
                  )}
                </div>
              </div>

              {/* Suggestions Dropdown Shelf */}
              {searchResults.length > 0 && (
                <div className="bg-background/95 border border-white/10 rounded-xl p-1.5 max-h-[260px] overflow-y-auto space-y-0.5">
                  {searchResults.slice(0, 10).map((item) => {
                    const title = item.title || item.name;
                    const date = item.release_date || item.first_air_date || "";
                    const year = date ? date.split("-")[0] : "";
                    const isAdded = items.some((i) => i.tmdbId === item.id && i.mediaType === item.media_type);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isAdded}
                        onClick={() => handleAddItem(item)}
                        className="w-full flex items-center justify-between text-left p-1.5 px-2.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer group disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.poster_path ? (
                            <div className="relative h-8 w-5.5 rounded overflow-hidden bg-muted/20 border border-white/5 shrink-0">
                              <Image
                                src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                                alt={title}
                                fill
                                sizes="22px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-8 w-5.5 rounded bg-white/5 border border-white/5 shrink-0 flex items-center justify-center text-[7px] text-gray-500 font-bold uppercase">
                              N/A
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-[13px] font-bold text-white group-hover:text-primary transition-colors truncate">
                              {title}
                            </h4>
                            <p className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                              {year && <span>{year}</span>}
                              {year && <span>·</span>}
                              <span className="text-[9px] uppercase tracking-wider bg-white/5 px-1 rounded-sm">{item.media_type}</span>
                            </p>
                          </div>
                        </div>
                        
                        {isAdded ? (
                          <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 select-none">
                            <CheckCircle2 className="h-3.5 w-3.5 text-gray-500" />
                            Added
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-primary group-hover:underline">Add</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Items List Shelf */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-wider select-none">
                List Items ({items.length})
              </h3>
              
              {items.length === 0 ? (
                <div className="py-12 border border-dashed border-white/10 rounded-2xl text-center text-muted-foreground text-xs select-none">
                  Add movies/shows using the search box above.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div 
                      key={`${item.mediaType}_${item.tmdbId}`}
                      className="bg-card/20 border border-white/5 rounded-2xl p-3.5 flex gap-3.5 transition-all hover:border-white/10 shadow-sm"
                    >
                      {/* Film Order Rank */}
                      <div className="flex flex-col items-center justify-center font-black text-lg select-none text-muted-foreground shrink-0 w-8">
                        {type === "ranking" ? `#${index + 1}` : "•"}
                      </div>

                      {/* Poster image */}
                      {item.posterPath ? (
                        <div className="relative h-16 aspect-[2/3] rounded-md overflow-hidden bg-muted/20 border border-white/10 shrink-0">
                          <Image
                            src={`https://image.tmdb.org/t/p/w185${item.posterPath}`}
                            alt={item.title}
                            fill
                            sizes="45px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-16 aspect-[2/3] rounded bg-white/5 border border-white/10 shrink-0 flex items-center justify-center text-[8px] text-gray-500 font-bold uppercase">
                          No Poster
                        </div>
                      )}

                      {/* Item details & captions */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-[14px] font-black text-white truncate leading-tight uppercase tracking-wide">
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5 select-none">
                              {item.releaseYear && <span>{item.releaseYear}</span>}
                              {item.releaseYear && <span>·</span>}
                              <span className="text-[9px] uppercase tracking-wider bg-white/5 px-1 rounded-sm">{item.mediaType}</span>
                            </p>
                          </div>
                          
                          {/* Controls (Move Order, Remove) */}
                          <div className="flex items-center gap-1 select-none">
                            <button
                              type="button"
                              onClick={() => handleMove(index, "up")}
                              disabled={index === 0}
                              className="p-1 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move Up"
                            >
                              <ArrowUp className="h-4.5 w-4.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMove(index, "down")}
                              disabled={index === items.length - 1}
                              className="p-1 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move Down"
                            >
                              <ArrowDown className="h-4.5 w-4.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                              title="Remove Item"
                            >
                              <Trash className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </div>

                        {/* Letterboxd note input */}
                        <div className="space-y-1">
                          <textarea
                            rows={1}
                            placeholder="Add a note or caption for this title..."
                            value={item.noteText}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[index].noteText = e.target.value;
                              setItems(updated);
                            }}
                            className="w-full bg-input/5 border border-white/5 rounded-lg px-2.5 py-1.5 text-[12.5px] focus-visible:outline-none focus-visible:border-primary h-auto transition-all text-white placeholder:text-muted-foreground resize-none"
                          />
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Settings & Sidebar */}
          <div className="space-y-6">
            
            {/* Action Buttons */}
            <div className="bg-card/25 border border-white/5 rounded-2xl p-4 space-y-3">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full font-black uppercase text-xs h-10 px-4 rounded-xl shadow-lg cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : "Create List"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                className="w-full font-extrabold uppercase text-xs h-10 px-4 rounded-xl cursor-pointer text-muted-foreground hover:text-white"
              >
                Cancel
              </Button>
            </div>

            {/* List Type & Visibility */}
            <div className="bg-card/20 border border-white/5 rounded-2xl p-4 space-y-4">
              <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-wider select-none">List Settings</h3>
              
              {/* Type Select */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground">List Type</label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-[#12121E] border border-white/10 rounded-xl px-3 py-2 text-[13.5px] text-white focus-visible:outline-none focus-visible:border-primary cursor-pointer"
                >
                  <option value="collection">Collection (Unordered)</option>
                  <option value="ranking">Ranking (Numbered List)</option>
                  <option value="watchlist">Watchlist</option>
                </select>
              </div>

              {/* Visibility Select */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground">Visibility</label>
                <select 
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="w-full bg-[#12121E] border border-white/10 rounded-xl px-3 py-2 text-[13.5px] text-white focus-visible:outline-none focus-visible:border-primary cursor-pointer"
                >
                  <option value="public">Public (Everyone can see)</option>
                  <option value="unlisted">Unlisted (Visible via Link only)</option>
                  <option value="private">Private (Only you can see)</option>
                </select>
              </div>

              {/* containsSpoilers Toggle */}
              <div className="flex items-center gap-2 pt-1 select-none">
                <input
                  type="checkbox"
                  id="containsSpoilers"
                  checked={containsSpoilers}
                  onChange={(e) => setContainsSpoilers(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-input/10 text-primary focus:ring-primary focus:ring-opacity-55 cursor-pointer"
                />
                <label htmlFor="containsSpoilers" className="text-[12.5px] font-bold text-gray-300 cursor-pointer">
                  Contains Spoilers
                </label>
              </div>
            </div>

            {/* Cover Film Selection */}
            {items.length > 0 && (
              <div className="bg-card/20 border border-white/5 rounded-2xl p-4 space-y-4">
                <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-wider select-none">Cover Movie (Backdrop)</h3>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground">Select list banner backdrop film:</label>
                  <select
                    value={coverItemIdx !== null ? coverItemIdx : ""}
                    onChange={(e) => setCoverItemIdx(e.target.value === "" ? null : parseInt(e.target.value))}
                    className="w-full bg-[#12121E] border border-white/10 rounded-xl px-3 py-2 text-[13.5px] text-white focus-visible:outline-none focus-visible:border-primary cursor-pointer"
                  >
                    <option value="">Default (First item backdrop)</option>
                    {items.map((item, idx) => (
                      <option key={idx} value={idx}>{idx + 1}. {item.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Tags Input */}
            <div className="bg-card/20 border border-white/5 rounded-2xl p-4 space-y-4">
              <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-wider select-none">Tags</h3>
              <div className="space-y-1.5">
                <input 
                  type="text"
                  placeholder="Comma separated tags (e.g. Sci-Fi, Malayalam)"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-input/10 border border-white/10 rounded-xl px-3 py-2.5 text-[13.5px] focus-visible:outline-none focus-visible:border-primary h-auto transition-all text-white placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Collaborators Panel */}
            <div className="bg-card/20 border border-white/5 rounded-2xl p-4 space-y-4">
              <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-wider select-none">Collaborators</h3>
              
              {/* Lookup input */}
              <div className="relative flex items-center">
                <Users className="h-4.5 w-4.5 text-muted-foreground absolute left-3" />
                <input 
                  type="text"
                  placeholder="Lookup usernames..."
                  value={collabQuery}
                  onChange={(e) => handleCollabSearch(e.target.value)}
                  className="w-full bg-input/10 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-[13px] focus-visible:outline-none focus-visible:border-primary h-auto transition-all text-white placeholder:text-muted-foreground"
                />
                {searchingCollabs && (
                  <Loader2 className="h-4.5 w-4.5 animate-spin text-primary absolute right-3" />
                )}
              </div>

              {/* Collab Lookup Results */}
              {collabResults.length > 0 && (
                <div className="bg-background border border-white/10 rounded-xl p-1 max-h-[160px] overflow-y-auto space-y-0.5 select-none">
                  {collabResults.map((c) => (
                    <button
                      key={c.uid}
                      type="button"
                      onClick={() => handleAddCollab(c)}
                      className="w-full text-left flex items-center gap-2 p-1.5 hover:bg-white/5 rounded-lg cursor-pointer"
                    >
                      {c.photoURL ? (
                        <Image
                          src={c.photoURL}
                          alt={c.displayName}
                          width={24}
                          height={24}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                          {c.displayName[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="text-[12px] font-bold text-white leading-tight">{c.displayName}</h4>
                        <p className="text-[10px] text-muted-foreground">@{c.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Listed Collaborators */}
              {collaborators.length > 0 && (
                <div className="space-y-2 select-none pt-1">
                  {collaborators.map((c) => (
                    <div key={c.uid} className="flex items-center justify-between p-1.5 px-2.5 bg-white/5 rounded-xl border border-white/5 text-[12.5px]">
                      <div className="flex items-center gap-2 min-w-0">
                        {c.photoURL ? (
                          <Image
                            src={c.photoURL}
                            alt={c.displayName}
                            width={26}
                            height={26}
                            className="h-6.5 w-6.5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-6.5 w-6.5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                            {c.displayName[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="font-extrabold truncate text-gray-200">@{c.username}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCollab(c.uid)}
                        className="p-0.5 hover:bg-white/5 rounded text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </form>

      </div>
    </div>
  );
}
