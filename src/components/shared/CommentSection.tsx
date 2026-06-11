"use client";

import { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import { MessageSquare, Loader2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/features/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { commentOnActivity, getActivityComments } from "@/actions/social.actions";
import { commentOnList, getListComments } from "@/actions/list.actions";

interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string | Date;
  userName: string;
  userPhoto: string | null;
}

interface CommentSectionProps {
  targetId: string;
  type: "activity" | "list";
  initialCommentsCount: number;
  className?: string;
  /** When true: mounts pre-expanded, hides the internal toggle button.
   *  The parent is responsible for conditional rendering (mount = open). */
  defaultOpen?: boolean;
}

export function CommentSection({
  targetId,
  type,
  initialCommentsCount,
  className,
  defaultOpen = false,
}: CommentSectionProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local States
  const [showComments, setShowComments] = useState(defaultOpen);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);

  // When mounted in controlled (defaultOpen) mode, auto-fetch comments immediately
  useEffect(() => {
    if (!defaultOpen || hasLoaded) return;
    setLoadingComments(true);
    const fetchFn = type === "activity"
      ? getActivityComments(targetId)
      : getListComments(targetId);
    fetchFn
      .then((list) => {
        setComments(list as any[]);
        setHasLoaded(true);
      })
      .catch((err) => console.warn("Error loading comments:", err))
      .finally(() => setLoadingComments(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleComments = async () => {
    if (!showComments) {
      setShowComments(true);
      if (hasLoaded) return;

      setLoadingComments(true);
      try {
        if (type === "activity") {
          const list = await getActivityComments(targetId);
          setComments(list as any[]);
        } else {
          const list = await getListComments(targetId);
          setComments(list as any[]);
        }
        setHasLoaded(true);
      } catch (err) {
        console.warn("Error loading comments:", err);
      } finally {
        setLoadingComments(false);
      }
    } else {
      setShowComments(false);
    }
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }
    if (newCommentText.trim().length === 0) return;

    const text = newCommentText.trim();
    setNewCommentText("");

    // Optimistic Update
    const tempComment: Comment = {
      id: "temp_" + Date.now(),
      userId: user.uid,
      content: text,
      createdAt: new Date(),
      userName: user.displayName || "Cinephile User",
      userPhoto: user.photoURL || null,
    };

    setComments((prev) => [...prev, tempComment]);
    setCommentsCount((c) => c + 1);

    startTransition(async () => {
      try {
        const res = type === "activity"
          ? await commentOnActivity(targetId, text)
          : await commentOnList(targetId, text);
        
        if (!res.success) {
          // Rollback on failure
          setComments((prev) => prev.filter((c) => c.id !== tempComment.id));
          setCommentsCount((c) => Math.max(0, c - 1));
        }
      } catch (err) {
        // Rollback on error
        setComments((prev) => prev.filter((c) => c.id !== tempComment.id));
        setCommentsCount((c) => Math.max(0, c - 1));
        console.warn("Error posting comment:", err);
      }
    });
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Comment Count Trigger Button — hidden when parent controls open state */}
      {!defaultOpen && (
        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 hover:text-white text-muted-foreground transition-colors py-1 cursor-pointer select-none text-[13px] font-bold"
        >
          <MessageSquare className="h-4 w-4" />
          <span>
            {commentsCount > 0 ? `${commentsCount} Comments` : "Comment"}
          </span>
        </button>
      )}

      {/* Collapsible Comments Panel */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mt-2.5 pt-2.5 border-t border-white/5 space-y-2.5 overflow-hidden"
          >
            {loadingComments ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground text-xs select-none">
                <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" />
                Loading comments...
              </div>
            ) : (
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground text-center py-2 select-none">
                    No comments yet. Be the first to comment!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2 text-[13px]">
                      {/* Avatar */}
                      <SafeAvatar
                        src={comment.userPhoto}
                        alt={comment.userName}
                        name={comment.userName}
                        size={28}
                        className="mt-0.5"
                      />
                      
                      {/* Bubble */}
                      <div className="flex-1 bg-white/5 border border-white/5 rounded-xl px-2.5 py-1.5">
                        <div className="flex items-center justify-between pb-0.5 select-none">
                          <span className="font-extrabold text-white">{comment.userName}</span>
                          <span className="text-[10px] text-muted-foreground font-semibold" suppressHydrationWarning>
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[13.5px] text-gray-300 leading-relaxed break-words whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handlePostComment} className="flex gap-2 pt-1.5">
              <input
                type="text"
                maxLength={280}
                placeholder="Write a comment... (max 280 chars)"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="flex-1 bg-input/10 border border-white/10 rounded-xl px-3 py-2 text-[13px] text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary h-auto transition-all"
              />
              <button
                type="submit"
                disabled={isPending || newCommentText.trim().length === 0}
                className="h-11 w-11 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Send className="h-5 w-5 ml-0.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
