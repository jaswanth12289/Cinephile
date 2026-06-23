// @ts-nocheck
"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { SafeAvatar } from "./SafeAvatar";
import { Button } from "@/components/ui/button";
import { createPostAction, searchUsers, uploadPostImageServer } from "@/actions/social.actions";
import { getDailyPrompt } from "@/actions/dailyPrompt.actions";
import { Loader2, Hash, Sparkles, ImagePlus, X, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export default function CreatePostBox({ clubId, clubName }: { clubId?: string, clubName?: string }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [dailyPrompt, setDailyPrompt] = useState<string>("What's on your mind? Use @ to mention or # for tags.");

  // Autocomplete State
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [showHashtagMenu, setShowHashtagMenu] = useState(false);
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const [activeQuery, setActiveQuery] = useState("");
  const [cursorPos, setCursorPos] = useState(0);

  // Track mentions and hashtags attached to this post
  const [mentions, setMentions] = useState<{ userId: string; username: string }[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  
  // Images
  const [images, setImages] = useState<{ file: File; preview: string; base64: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollDuration, setPollDuration] = useState<number>(24); // hours

  useEffect(() => {
    getDailyPrompt().then(setDailyPrompt).catch(console.error);
  }, []);

  if (!user) return null;

  const length = content.length;
  const isOverLimit = length > 280;
  const isNearLimit = length > 240;
  
  const hasTextContent = content.trim().length > 0;
  const hasImages = images.length > 0;
  
  const validPollOptions = pollOptions.filter(o => o.trim().length > 0);
  const hasValidPoll = showPoll ? validPollOptions.length >= 2 : true;
  
  const isDisabled = isPending || (!hasTextContent && !hasImages && !(showPoll && validPollOptions.length > 0)) || isOverLimit || !hasValidPoll;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 4) {
      toast.error("You can only upload up to 4 images.");
      return;
    }
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64WithPrefix = event.target?.result as string;
        const base64 = base64WithPrefix.split(",")[1];
        setImages(prev => [...prev, { file, preview: URL.createObjectURL(file), base64 }]);
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Handle typing & detecting @ or # words
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    
    const pos = e.target.selectionStart;
    setCursorPos(pos);
    
    // Find the current word being typed
    const textBeforeCursor = val.slice(0, pos);
    const words = textBeforeCursor.split(/\s/);
    const currentWord = words[words.length - 1];

    if (currentWord.startsWith("@") && currentWord.length > 1) {
      setShowHashtagMenu(false);
      setShowMentionMenu(true);
      const query = currentWord.slice(1);
      setActiveQuery(query);
      fetchUsers(query);
    } else if (currentWord.startsWith("#") && currentWord.length > 0) {
      setShowMentionMenu(false);
      setShowHashtagMenu(true);
      setActiveQuery(currentWord.slice(1));
    } else {
      setShowMentionMenu(false);
      setShowHashtagMenu(false);
    }
  };

  const fetchUsers = async (query: string) => {
    const users = await searchUsers(query);
    setMentionResults(users);
  };

  const insertMention = (selectedUser: any) => {
    const textBefore = content.slice(0, cursorPos);
    const textAfter = content.slice(cursorPos);
    
    const wordsBefore = textBefore.split(/\s/);
    wordsBefore.pop(); // remove the partial @word
    
    const newTextBefore = wordsBefore.join(" ") + (wordsBefore.length > 0 ? " " : "") + `@${selectedUser.username} `;
    setContent(newTextBefore + textAfter);
    
    // Save to mentions array
    if (!mentions.find(m => m.username === selectedUser.username)) {
      setMentions(prev => [...prev, { userId: selectedUser.userId, username: selectedUser.username }]);
    }
    
    setShowMentionMenu(false);
    textareaRef.current?.focus();
  };

  const insertHashtag = (tag: string) => {
    const textBefore = content.slice(0, cursorPos);
    const textAfter = content.slice(cursorPos);
    
    const wordsBefore = textBefore.split(/\s/);
    wordsBefore.pop(); // remove the partial #word
    
    const newTextBefore = wordsBefore.join(" ") + (wordsBefore.length > 0 ? " " : "") + `#${tag} `;
    setContent(newTextBefore + textAfter);
    
    if (!hashtags.includes(tag)) {
      setHashtags(prev => [...prev, tag]);
    }
    
    setShowHashtagMenu(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = () => {
    if (isDisabled) return;

    // Extract all raw hashtags from text to ensure we capture ones typed manually without autocomplete
    const manualHashtags = content.match(/#[a-zA-Z0-9_]+/g)?.map(t => t.slice(1)) || [];
    const finalHashtags = Array.from(new Set([...hashtags, ...manualHashtags]));

    // We only trust mentions that were selected via autocomplete (in `mentions` state)
    // so we don't accidentally link to non-existent users.

    startTransition(async () => {
      const uploadedUrls: string[] = [];
      if (images.length > 0) {
        for (const img of images) {
          const uploadRes = await uploadPostImageServer(img.base64, img.file.type);
          if (uploadRes.success && uploadRes.downloadURL) {
            uploadedUrls.push(uploadRes.downloadURL);
          } else {
            toast.error("Failed to upload an image. Continuing without it.");
          }
        }
      }

      let pollData = undefined;
      if (showPoll && validPollOptions.length >= 2) {
        pollData = {
          options: validPollOptions,
          durationHours: pollDuration
        };
      }

      const res = await createPostAction(content, mentions, finalHashtags, undefined, uploadedUrls, pollData, clubId, clubName);
      if (res.success) {
        setContent("");
        setMentions([]);
        setHashtags([]);
        setImages([]);
        setShowPoll(false);
        setPollOptions(["", ""]);
        setPollDuration(24);
        setShowMentionMenu(false);
        setShowHashtagMenu(false);
      } else {
        console.warn(res.error);
        toast.error(res.error || "Failed to post");
      }
    });
  };

  // Mock trending tags for the autocomplete
  const popularTags = ["SciFi", "ChristopherNolan", "TeluguCinema", "Anime", "Review", "Oscars"].filter(t => t.toLowerCase().includes(activeQuery.toLowerCase()));

  return (
    <div className="cine-card p-4 sm:p-5 flex gap-3 sm:gap-4 mb-4 relative z-50">
      <div className="flex-shrink-0 select-none">
        <SafeAvatar
          src={user?.user_metadata?.avatar_url}
          alt={user?.user_metadata?.full_name || "User"}
          name={user?.user_metadata?.full_name || "User"}
          size={40}
          className="border-white/5 !h-10 !w-10 sm:!h-12 sm:!w-12"
        />
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col relative">
        <div className="flex items-center gap-1.5 mb-2 text-zinc-400 select-none">
          <Sparkles className="h-3 w-3 text-primary/80" />
          <span className="text-[11px] font-bold tracking-wider uppercase font-display">{dailyPrompt}</span>
        </div>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onFocus={handleChange}
          placeholder="Share your thought... Use @ to mention or # for tags."
          className="w-full bg-transparent border-none outline-none resize-none text-white placeholder:text-zinc-600 font-medium text-[15px] sm:text-[16px] min-h-[60px] py-1"
          maxLength={280}
        />
        
        {/* Autocomplete Dropdown */}
        <AnimatePresence>
          {(showMentionMenu || showHashtagMenu) && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-full left-0 mt-2 w-[240px] bg-[#101018] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              {showMentionMenu && (
                <div className="py-1">
                  {mentionResults.length > 0 ? (
                    mentionResults.map(u => (
                      <div
                        key={u.userId}
                        onClick={() => insertMention(u)}
                        className="px-3 py-2 flex items-center gap-2.5 hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <SafeAvatar src={u.photoURL} alt={u.username} name={u.displayName} size={24} className="!h-6 !w-6" />
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-white leading-none">{u.displayName}</span>
                          <span className="text-[11px] text-zinc-500">@{u.username}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-[12px] text-zinc-500 text-center">Searching users...</div>
                  )}
                </div>
              )}

              {showHashtagMenu && (
                <div className="py-1">
                  {popularTags.slice(0, 5).map(tag => (
                    <div
                      key={tag}
                      onClick={() => insertHashtag(tag)}
                      className="px-3 py-2 flex items-center gap-2.5 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Hash className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-[13px] font-bold text-white leading-none">#{tag}</span>
                    </div>
                  ))}
                  {activeQuery && !popularTags.includes(activeQuery) && (
                    <div
                      onClick={() => insertHashtag(activeQuery)}
                      className="px-3 py-2 flex items-center gap-2.5 hover:bg-white/5 cursor-pointer transition-colors border-t border-white/5"
                    >
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Hash className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-[13px] font-bold text-white leading-none">#{activeQuery}</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {images.length > 0 && !showPoll && (
          <div className={`grid gap-2 mt-3 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {images.map((img, idx) => (
              <div key={idx} className="relative rounded-xl overflow-hidden aspect-video border border-white/10 bg-black/50">
                <img src={img.preview} alt="Upload preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-2 right-2 p-1 bg-black/60 rounded-full hover:bg-black/80 transition-colors backdrop-blur-sm"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {showPoll && (
          <div className="mt-3 space-y-2 border border-white/10 p-3 rounded-xl bg-black/20">
            {pollOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...pollOptions];
                    newOpts[idx] = e.target.value;
                    setPollOptions(newOpts);
                  }}
                  placeholder={`Choice ${idx + 1}`}
                  className="flex-1 bg-transparent border border-white/10 rounded-lg px-3 py-1.5 text-[14px] text-white focus:border-primary/50 focus:outline-none transition-colors"
                  maxLength={25}
                />
                {pollOptions.length > 2 && (
                  <button
                    onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                    className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {pollOptions.length < 4 && (
              <button
                onClick={() => setPollOptions([...pollOptions, ""])}
                className="text-primary text-[13px] font-bold py-1 hover:underline w-full text-left"
              >
                + Add Choice
              </button>
            )}
            <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-2">
              <span className="text-[12px] text-zinc-400 font-bold uppercase tracking-wider">Poll Length</span>
              <select
                value={pollDuration}
                onChange={(e) => setPollDuration(Number(e.target.value))}
                className="bg-transparent text-white text-[13px] border border-white/10 rounded-md px-2 py-1 focus:outline-none cursor-pointer"
              >
                <option value={24} className="bg-[#101018]">24 hours</option>
                <option value={72} className="bg-[#101018]">3 days</option>
                <option value={168} className="bg-[#101018]">7 days</option>
              </select>
            </div>
            <button
              onClick={() => {
                setShowPoll(false);
                setPollOptions(["", ""]);
              }}
              className="w-full py-1.5 mt-1 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-lg text-[13px] font-bold transition-colors"
            >
              Remove Poll
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 select-none">
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageSelect}
              disabled={images.length >= 4 || isPending}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= 4 || showPoll || isPending}
              className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add Image"
            >
              <ImagePlus className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              onClick={() => {
                setShowPoll(true);
                setImages([]);
              }}
              disabled={showPoll || images.length > 0 || isPending}
              className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add Poll"
            >
              <BarChart2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div
              className={cn(
                "text-xs font-bold transition-colors",
                isNearLimit ? "text-amber-500" : "text-zinc-500",
                isOverLimit && "text-red-500"
              )}
            >
              {length} / 280
            </div>
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={isDisabled}
            className="h-8 px-4 rounded-full font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm disabled:opacity-50 transition-all"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Posting
              </>
            ) : (
              "Share Thought"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
