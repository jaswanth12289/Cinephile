"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { updateList, deleteList } from "@/actions/list.actions";
import { searchTMDBSocial, searchUsers } from "@/actions/user.actions";
import { Button } from "@/components/ui/button";
import { 
  Search, X, Loader2, ArrowUp, ArrowDown, 
  Trash, Users, Eye, EyeOff, ShieldAlert,
  Settings, CheckCircle2, AlertTriangle
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { SafeAvatar } from "@/components/shared/SafeAvatar";

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

interface ListEditorProps {
  initialList: any;
  initialItems: any[];
}

export function ListEditor({ initialList, initialItems }: ListEditorProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form States
  const [title, setTitle] = useState(initialList.title);
  const [description, setDescription] = useState(initialList.description || "");
  const [visibility, setVisibility] = useState<"public" | "private" | "unlisted">(initialList.visibility);
  const [type, setType] = useState<"ranking" | "collection" | "watchlist">(initialList.type);
  const [tagsInput, setTagsInput] = useState(initialList.tags?.join(", ") || "");
  const [containsSpoilers, setContainsSpoilers] = useState(initialList.containsSpoilers || false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Items State (Map initial note objects/strings to text)
  const mappedInitialItems = initialItems.map((item) => {
    const noteVal = item.note;
    const noteText = typeof noteVal === "string" 
      ? noteVal 
      : (noteVal && typeof noteVal === "object" ? noteVal.text : "");
    return {
      tmdbId: item.tmdbId,
      mediaType: item.mediaType,
      title: item.title,
      posterPath: item.posterPath,
      backdropPath: item.backdropPath || null,
      releaseYear: item.releaseYear,
      noteText,
    };
  });

  const [items, setItems] = useState<ListItem[]>(mappedInitialItems);

  // Determine initial cover index
  const initialCoverItemIdx = mappedInitialItems.findIndex(
    (item) => item.tmdbId === initialList.coverTmdbId && item.mediaType === initialList.coverMediaType
  );
  const [coverItemIdx, setCoverItemIdx] = useState<number | null>(
    initialCoverItemIdx !== -1 ? initialCoverItemIdx : null
  );

  // TMDB Media Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingMedia, setSearchingMedia] = useState(false);

  // Collaborators State
  const [collabQuery, setCollabQuery] = useState("");
  const [collabResults, setCollabResults] = useState<any[]>([]);
  const [searchingCollabs, setSearchingCollabs] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(initialList.collaborators || []);

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
      console.warn("[ListEditor] Search media error:", e);
    } finally {
      setSearchingMedia(false);
    }
  };

  const handleAddItem = (item: any) => {
    const tmdbId = item.id;
    const mediaType = item.media_type as "movie" | "tv";
    
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

  const handleMove = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= items.length) return;

    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = temp;

    if (coverItemIdx === index) {
      setCoverItemIdx(nextIndex);
    } else if (coverItemIdx === nextIndex) {
      setCoverItemIdx(index);
    }

    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    if (coverItemIdx === index) {
      setCoverItemIdx(null);
    } else if (coverItemIdx !== null && coverItemIdx > index) {
      setCoverItemIdx(coverItemIdx - 1);
    }
  };

  const handleCollabSearch = async (val: string) => {
    setCollabQuery(val);
    if (val.trim().length < 2) {
      setCollabResults([]);
      return;
    }
    setSearchingCollabs(true);
    try {
      const results = await searchUsers(val);
      const filtered = results.filter((c: any) => c.uid !== initialList.ownerId);
      setCollabResults(filtered);
    } catch (e) {
      console.warn("[ListEditor] Search collaborators error:", e);
    } finally {
      setSearchingCollabs(false);
    }
  };

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

  const handleRemoveCollab = (uid: string) => {
    setCollaborators((prev) => prev.filter((c) => c.uid !== uid));
  };

  // Submit Update
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
    
    const tags = tagsInput
      .split(",")
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0);

    const selectedCover = coverItemIdx !== null ? items[coverItemIdx] : null;
    const coverItem = selectedCover 
      ? {
          tmdbId: selectedCover.tmdbId,
          mediaType: selectedCover.mediaType,
          title: selectedCover.title,
          backdropPath: selectedCover.backdropPath,
        }
      : null;

    const mappedItems = items.map((i) => ({
      tmdbId: i.tmdbId,
      mediaType: i.mediaType,
      title: i.title,
      posterPath: i.posterPath,
      releaseYear: i.releaseYear,
      note: i.noteText.trim(),
    }));

    startTransition(async () => {
      const res = await updateList(initialList.id, {
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
        setErrorMsg(res.error || "Failed to update list.");
      }
    });
  };

  // Delete List Action
  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteList(initialList.id);
      if (res.success) {
        router.push("/lists");
      } else {
        setErrorMsg(res.error || "Failed to delete list.");
        setShowDeleteConfirm(false);
      }
    });
  };

  return (
    <div className="min-h-screen bg-transparent py-8 pb-16 text-white select-none">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Header */}
        <div className="border-b border-[var(--cine-border)] pb-4 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight font-display">Edit List</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">Modify collection details, caps, and collaborators.</p>
          </div>
          
          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            className="font-black uppercase text-xs h-9 px-4 rounded-xl cursor-pointer animate-pulse-subtle"
          >
            Delete List
          </Button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive font-bold text-[13px] flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Delete Confirmation Modal Overlay */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
            <div className="relative bg-[#12121E]/90 border border-[var(--cine-border)] rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl z-10 backdrop-blur-md">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black uppercase tracking-wide font-display">Delete List?</h3>
                <p className="text-[13px] text-muted-foreground leading-normal">
                  Are you sure you want to delete this list? This action is permanent and will delete all reviews, likes, and bookmarks.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 font-bold text-xs uppercase h-10 border border-[var(--cine-border)]"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="flex-1 font-black text-xs uppercase h-10"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Delete"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Form Fields & Search */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Title & Description */}
            <div className="cine-card p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground font-display">List Title</label>
                <input 
                  type="text"
                  maxLength={100}
                  placeholder="List Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-[var(--cine-border)] rounded-xl px-4 py-2.5 text-[14px] focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary h-auto transition-all text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground font-display">Description</label>
                <textarea 
                  rows={3}
                  maxLength={2000}
                  placeholder="Tell people what this list is about..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white/5 border border-[var(--cine-border)] rounded-xl px-4 py-2.5 text-[14px] focus-visible:outline-none focus-visible:border-primary h-auto transition-all text-white placeholder:text-muted-foreground resize-none"
                />
              </div>
            </div>

            {/* Media Search */}
            <div className="cine-card p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground font-display">Add Films & Shows</label>
                <div className="relative flex items-center">
                  <Search className="h-4.5 w-4.5 text-muted-foreground absolute left-3.5" />
                  <input 
                    type="text"
                    placeholder="Search movies or TV shows to add..."
                    value={searchQuery}
                    onChange={(e) => handleMediaSearch(e.target.value)}
                    className="w-full bg-white/5 border border-[var(--cine-border)] rounded-xl pl-10 pr-4 py-2.5 text-[14px] focus-visible:outline-none focus-visible:border-primary h-auto transition-all text-white placeholder:text-muted-foreground"
                  />
                  {searchingMedia && (
                    <Loader2 className="h-4.5 w-4.5 animate-spin text-primary absolute right-3.5" />
                  )}
                </div>
              </div>

              {/* Suggestions */}
              {searchResults.length > 0 && (
                <div className="bg-[#12121E]/95 border border-[var(--cine-border)] rounded-xl p-1.5 max-h-[260px] overflow-y-auto space-y-0.5 backdrop-blur-md">
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
                            <div className="relative h-8 w-5.5 rounded overflow-hidden bg-muted/20 border border-[var(--cine-border)] shrink-0">
                              <Image
                                src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                                alt={title}
                                fill
                                sizes="22px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-8 w-5.5 rounded bg-white/5 border border-[var(--cine-border)] shrink-0 flex items-center justify-center text-[7px] text-gray-500 font-bold uppercase">
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
                              <span className="text-[9px] uppercase tracking-wider bg-white/5 border border-[var(--cine-border)] px-1 rounded-sm">{item.media_type}</span>
                            </p>
                          </div>
                        </div>
                        
                        {isAdded ? (
                          <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
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

            {/* Selected Items */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-wider select-none font-display">
                List Items ({items.length})
              </h3>
              
              {items.length === 0 ? (
                <div className="py-12 border border-dashed border-[var(--cine-border)] rounded-2xl text-center text-muted-foreground text-xs">
                  List is empty. Add items above.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div 
                      key={`${item.mediaType}_${item.tmdbId}`}
                      className="cine-card cine-card-hover p-3.5 flex gap-3.5 shadow-sm"
                    >
                      <div className="flex flex-col items-center justify-center font-black text-lg select-none text-muted-foreground shrink-0 w-8">
                        {type === "ranking" ? `#${index + 1}` : "•"}
                      </div>

                      {item.posterPath ? (
                        <div className="relative h-16 aspect-[2/3] rounded-md overflow-hidden bg-muted/20 border border-[var(--cine-border)] shrink-0">
                          <Image
                            src={`https://image.tmdb.org/t/p/w185${item.posterPath}`}
                            alt={item.title}
                            fill
                            sizes="45px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-16 aspect-[2/3] rounded bg-white/5 border border-[var(--cine-border)] shrink-0 flex items-center justify-center text-[8px] text-gray-500 font-bold uppercase">
                          No Poster
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-[14px] font-black text-white truncate leading-tight uppercase tracking-wide font-display">
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5">
                              {item.releaseYear && <span>{item.releaseYear}</span>}
                              {item.releaseYear && <span>·</span>}
                              <span className="text-[9px] uppercase tracking-wider bg-white/5 border border-[var(--cine-border)] px-1.5 py-0.5 rounded-md">{item.mediaType}</span>
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMove(index, "up")}
                              disabled={index === 0}
                              className="p-1 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-white transition-colors cursor-pointer disabled:opacity-30"
                            >
                              <ArrowUp className="h-4.5 w-4.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMove(index, "down")}
                              disabled={index === items.length - 1}
                              className="p-1 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-white transition-colors cursor-pointer disabled:opacity-30"
                            >
                              <ArrowDown className="h-4.5 w-4.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                            >
                              <Trash className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <textarea
                            rows={1}
                            placeholder="Edit note..."
                            value={item.noteText}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[index].noteText = e.target.value;
                              setItems(updated);
                            }}
                            className="w-full bg-white/5 border border-[var(--cine-border)] rounded-lg px-2.5 py-1.5 text-[12.5px] focus-visible:outline-none focus-visible:border-primary h-auto transition-all text-white placeholder:text-muted-foreground resize-none"
                          />
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column Settings */}
          <div className="space-y-6">
            
            {/* Save Buttons */}
            <div className="cine-card p-4 space-y-3">
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
                ) : "Save Changes"}
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
            <div className="cine-card p-4 space-y-4">
              <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-wider select-none font-display">List Settings</h3>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground font-display">List Type</label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-[#12121E]/80 backdrop-blur border border-[var(--cine-border)] rounded-xl px-3 py-2 text-[13.5px] text-white focus-visible:outline-none focus-visible:border-primary cursor-pointer transition-all hover:border-white/20"
                >
                  <option value="collection">Collection (Unordered)</option>
                  <option value="ranking">Ranking (Numbered List)</option>
                  <option value="watchlist">Watchlist</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground font-display">Visibility</label>
                <select 
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="w-full bg-[#12121E]/80 backdrop-blur border border-[var(--cine-border)] rounded-xl px-3 py-2 text-[13.5px] text-white focus-visible:outline-none focus-visible:border-primary cursor-pointer transition-all hover:border-white/20"
                >
                  <option value="public">Public (Everyone can see)</option>
                  <option value="unlisted">Unlisted (Visible via Link only)</option>
                  <option value="private">Private (Only you can see)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1 select-none">
                <input
                  type="checkbox"
                  id="containsSpoilers"
                  checked={containsSpoilers}
                  onChange={(e) => setContainsSpoilers(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-input/10 text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="containsSpoilers" className="text-[12.5px] font-bold text-gray-300 cursor-pointer">
                  Contains Spoilers
                </label>
              </div>
            </div>

            {/* Cover Backdrop selection */}
            {items.length > 0 && (
              <div className="cine-card p-4 space-y-4">
                <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-wider select-none font-display">Cover Movie (Backdrop)</h3>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground">Select list banner backdrop film:</label>
                  <select
                    value={coverItemIdx !== null ? coverItemIdx : ""}
                    onChange={(e) => setCoverItemIdx(e.target.value === "" ? null : parseInt(e.target.value))}
                    className="w-full bg-[#12121E]/80 backdrop-blur border border-[var(--cine-border)] rounded-xl px-3 py-2 text-[13.5px] text-white focus-visible:outline-none focus-visible:border-primary cursor-pointer transition-all hover:border-white/20"
                  >
                    <option value="">Default (First item backdrop)</option>
                    {items.map((item, idx) => (
                      <option key={idx} value={idx}>{idx + 1}. {item.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="cine-card p-4 space-y-4">
              <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-wider select-none font-display">Tags</h3>
              <div className="space-y-1.5">
                <input 
                  type="text"
                  placeholder="Comma separated tags..."
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-white/5 border border-[var(--cine-border)] rounded-xl px-3 py-2.5 text-[13.5px] focus-visible:outline-none focus-visible:border-primary h-auto transition-all text-white placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Collaborators */}
            <div className="cine-card p-4 space-y-4">
              <h3 className="text-[11px] font-black uppercase text-muted-foreground tracking-wider select-none font-display">Collaborators</h3>
              
              <div className="relative flex items-center">
                <Users className="h-4.5 w-4.5 text-muted-foreground absolute left-3" />
                <input 
                  type="text"
                  placeholder="Lookup usernames..."
                  value={collabQuery}
                  onChange={(e) => handleCollabSearch(e.target.value)}
                  className="w-full bg-white/5 border border-[var(--cine-border)] rounded-xl pl-9 pr-3 py-2 text-[13px] focus-visible:outline-none focus-visible:border-primary h-auto transition-all text-white placeholder:text-muted-foreground"
                />
                {searchingCollabs && (
                  <Loader2 className="h-4.5 w-4.5 animate-spin text-primary absolute right-3" />
                )}
              </div>

              {collabResults.length > 0 && (
                <div className="bg-[#12121E]/95 border border-[var(--cine-border)] rounded-xl p-1 max-h-[160px] overflow-y-auto space-y-0.5 backdrop-blur-md">
                  {collabResults.map((c) => (
                    <button
                      key={c.uid}
                      type="button"
                      onClick={() => handleAddCollab(c)}
                      className="w-full text-left flex items-center gap-2 p-1.5 hover:bg-white/5 rounded-lg cursor-pointer"
                    >
                      <SafeAvatar
                        src={c.photoURL}
                        alt={c.displayName}
                        name={c.displayName}
                        size={24}
                      />
                      <div>
                        <h4 className="text-[12px] font-bold text-white leading-tight">{c.displayName}</h4>
                        <p className="text-[10px] text-muted-foreground">@{c.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {collaborators.length > 0 && (
                <div className="space-y-2 pt-1">
                  {collaborators.map((c) => (
                    <div key={c.uid} className="flex items-center justify-between p-1.5 px-2.5 bg-white/5 rounded-xl border border-[var(--cine-border)] text-[12.5px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <SafeAvatar
                          src={c.photoURL}
                          alt={c.displayName}
                          name={c.displayName}
                          size={26}
                        />
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
