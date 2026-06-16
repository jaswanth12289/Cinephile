"use client";

import { useRef } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageSquare, UserPlus } from "lucide-react";
import { SafeAvatar } from "@/components/shared/SafeAvatar";

interface VirtualizedNotificationsListProps {
  notifications: any[];
}

const reactionEmojis: Record<string, string> = {
  love: "❤️",
  peak: "🔥",
  emotional: "😭",
  mindblown: "🤯",
  applause: "👏",
};

const reactionLabels: Record<string, string> = {
  love: "loved",
  peak: "called Peak Cinema",
  emotional: "cried to",
  mindblown: "was mind-blown by",
  applause: "applauded",
};

export function VirtualizedNotificationsList({ notifications }: VirtualizedNotificationsListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useWindowVirtualizer({
    count: notifications.length,
    estimateSize: () => 64, // h-16 is 64px
    overscan: 10,
    scrollMargin: containerRef.current?.offsetTop ?? 0,
  });

  return (
    <div
      ref={containerRef}
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const notif = notifications[virtualRow.index];
        const dateVal = new Date(notif.createdAt);
        const formattedTime = dateVal.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
            }}
            className="pb-2"
          >
            <div
              className={`cine-card p-2 h-16 flex items-center gap-3 relative select-none transition-all hover:bg-white/3 ${
                notif.read ? "opacity-90 border-white/5" : "border-primary/20 bg-primary/5 shadow-md"
              }`}
            >
              {/* Unread indicator dot */}
              {!notif.read && (
                <span className="absolute top-1/2 -translate-y-1/2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
              )}

              {/* Sender Avatar */}
              <Link href={`/user/${notif.sender.username}`} className="shrink-0 relative select-none">
                <SafeAvatar
                  src={notif.sender.photoURL}
                  alt={notif.sender.displayName}
                  name={notif.sender.displayName}
                  size={36}
                  className="hover:opacity-85 transition-opacity !h-9 !w-9 border border-white/10"
                />
                {/* Small Type Icon Overlay */}
                <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-black border border-white/15">
                  {notif.type === "follow" && <UserPlus className="h-2.5 w-2.5 text-blue-400" />}
                  {(notif.type === "reaction" || notif.type === "list_like") && <Heart className="h-2.5 w-2.5 text-pink-400 fill-pink-400" />}
                  {(notif.type === "comment" || notif.type === "list_comment") && <MessageSquare className="h-2.5 w-2.5 text-green-400" />}
                </div>
              </Link>

              {/* Text content details */}
              <div className="flex-1 min-w-0 leading-tight">
                <p className="text-[12.5px] text-zinc-300 line-clamp-2 font-medium">
                  <Link
                    href={`/user/${notif.sender.username}`}
                    className="font-black text-white hover:underline transition-colors font-display"
                  >
                    {notif.sender.displayName}
                  </Link>{" "}
                  {/* Follow Type */}
                  {notif.type === "follow" && <span>followed you.</span>}
                  {/* Reaction Type */}
                  {notif.type === "reaction" && (
                    <span>
                      {reactionLabels[notif.reaction || "love"] || "liked"}{" "}
                      <span className="inline-block text-xs mr-0.5">{reactionEmojis[notif.reaction || "love"]}</span>
                      your review of{" "}
                      <Link href={`/${notif.mediaType}/${notif.mediaId}`} className="font-extrabold text-white hover:underline">
                        {notif.mediaTitle || "Film"}
                      </Link>
                    </span>
                  )}
                  {/* Comment Type */}
                  {notif.type === "comment" && (
                    <span>
                      commented: "{notif.commentText || "thoughts"}" on{" "}
                      <Link href={`/${notif.mediaType}/${notif.mediaId}`} className="font-extrabold text-white hover:underline">
                        {notif.mediaTitle || "Film"}
                      </Link>
                    </span>
                  )}
                  {/* List Like Type */}
                  {notif.type === "list_like" && (
                    <span>
                      liked your list: <span className="font-extrabold text-white">"{notif.mediaTitle || "List"}"</span>
                    </span>
                  )}
                  {/* List Comment Type */}
                  {notif.type === "list_comment" && (
                    <span>
                      commented: "{notif.commentText || "thoughts"}" on list:{" "}
                      <span className="font-extrabold text-white">"{notif.mediaTitle || "List"}"</span>
                    </span>
                  )}
                </p>

                <span suppressHydrationWarning className="text-[9.5px] text-zinc-500 font-bold block mt-0.5 font-display uppercase tracking-wider">
                  {formattedTime}
                </span>
              </div>

              {/* Right Column: Poster Thumbnail */}
              {notif.mediaPoster && (
                <Link href={`/${notif.mediaType}/${notif.mediaId}`} className="shrink-0 ml-1.5">
                  <div className="relative h-11 w-8 overflow-hidden rounded-md border border-white/10 shadow hover:border-white/30 transition-all bg-zinc-950">
                    <Image
                      src={`https://image.tmdb.org/t/p/w154${notif.mediaPoster}`}
                      alt={notif.mediaTitle || "Poster"}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
