import { verifySession } from "@/actions/auth.actions";
import { redirect } from "next/navigation";
import { getNotifications, markNotificationsAsRead } from "@/actions/social.actions";
import Link from "next/link";
import Image from "next/image";
import { Bell, Heart, MessageSquare, UserPlus, Film, Compass } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageTransition } from "@/components/shared/PageTransition";
import { SafeAvatar } from "@/components/shared/SafeAvatar";

export const dynamic = "force-dynamic";

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

export default async function NotificationsPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  // Fetch notifications
  const notifications = await getNotifications();

  // Mark notifications as read in the background
  await markNotificationsAsRead();

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#0F0F1A] py-8 pb-16">
        <div className="max-w-2xl mx-auto px-4 space-y-6">
          
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/5 pb-4 select-none">
            <div className="p-2 bg-primary/10 rounded-xl text-primary border border-primary/20">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-white tracking-tight">
                Notifications
              </h1>
              <p className="text-[13px] text-muted-foreground">
                Stay updated with reactions, comments, and new followers.
              </p>
            </div>
          </div>

          {/* Notifications list */}
          {notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Quiet for now."
              description="Great conversations start with great films. Keep sharing reviews and lists to spark conversations!"
              actionHref="/discover"
              actionText="Explore Films"
            />
          ) : (
          <div className="space-y-2.5">
            {notifications.map((notif) => {
              const dateVal = new Date(notif.createdAt);
              const formattedTime = dateVal.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });

              return (
                <div 
                  key={notif.id}
                  className={`cine-card p-4 flex gap-3 relative select-none items-start transition-all hover:bg-card/65 ${
                    notif.read ? "opacity-90 border-white/5" : "border-primary/30 bg-primary/3 shadow-[0_0_12px_rgba(229,9,20,0.06)]"
                  }`}
                >
                  {/* Unread indicator dot */}
                  {!notif.read && (
                    <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary" />
                  )}

                  {/* Left Column: Icon Type */}
                  <div className="flex-shrink-0 mt-0.5">
                    {notif.type === "follow" && (
                      <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
                        <UserPlus className="h-4 w-4" />
                      </div>
                    )}
                    {(notif.type === "reaction" || notif.type === "list_like") && (
                      <div className="p-1.5 bg-pink-500/10 rounded-lg text-pink-400 border border-pink-500/20">
                        <Heart className="h-4 w-4" />
                      </div>
                    )}
                    {(notif.type === "comment" || notif.type === "list_comment") && (
                      <div className="p-1.5 bg-green-500/10 rounded-lg text-green-400 border border-green-500/20">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  {/* Sender Avatar */}
                  <Link href={`/user/${notif.sender.username}`} className="flex-shrink-0">
                    <SafeAvatar
                      src={notif.sender.photoURL}
                      alt={notif.sender.displayName}
                      name={notif.sender.displayName}
                      size={36}
                      className="hover:opacity-85 transition-opacity"
                    />
                  </Link>

                  {/* Middle Column: Text Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="text-[14px] leading-relaxed text-gray-300">
                      <Link 
                        href={`/user/${notif.sender.username}`} 
                        className="font-bold text-white hover:underline hover:text-primary transition-colors font-display"
                      >
                        {notif.sender.displayName}
                      </Link>{" "}
                      <span className="text-gray-400">@{notif.sender.username}</span>{" "}
                      
                      {/* Follow Type */}
                      {notif.type === "follow" && (
                        <span>followed you.</span>
                      )}

                      {/* Reaction Type */}
                      {notif.type === "reaction" && (
                        <span>
                          {reactionLabels[notif.reaction || "love"] || "liked"}{" "}
                          <span className="inline-block text-base mr-1">{reactionEmojis[notif.reaction || "love"]}</span>
                          your review of{" "}
                          <Link 
                            href={`/${notif.mediaType}/${notif.mediaId}`} 
                            className="font-bold text-white hover:underline hover:text-primary"
                          >
                            {notif.mediaTitle || "Film"}
                          </Link>.
                        </span>
                      )}

                      {/* Comment Type */}
                      {notif.type === "comment" && (
                        <span>
                          replied to your thoughts on{" "}
                          <Link 
                            href={`/${notif.mediaType}/${notif.mediaId}`} 
                            className="font-bold text-white hover:underline hover:text-primary"
                          >
                            {notif.mediaTitle || "Film"}
                          </Link>:
                        </span>
                      )}

                      {/* List Like Type */}
                      {notif.type === "list_like" && (
                        <span>
                          liked your list:{" "}
                          <span className="font-extrabold text-white">
                            "{notif.mediaTitle || "List"}"
                          </span>
                        </span>
                      )}

                      {/* List Comment Type */}
                      {notif.type === "list_comment" && (
                        <span>
                          commented on your list:{" "}
                          <span className="font-extrabold text-white">
                            "{notif.mediaTitle || "List"}"
                          </span>:
                        </span>
                      )}
                    </div>

                    {/* Comment Subtext Box */}
                    {(notif.type === "comment" || notif.type === "list_comment") && notif.commentText && (
                      <div className="bg-white/5 border border-white/5 rounded-lg p-2.5 my-1 text-[13px] text-gray-300 italic break-words leading-normal">
                        "{notif.commentText}"
                      </div>
                    )}

                    {/* Timestamp */}
                    <div suppressHydrationWarning className="text-[11px] text-muted-foreground font-semibold">
                      {formattedTime}
                    </div>

                  </div>

                  {/* Right Column: Poster Thumbnail */}
                  {notif.mediaPoster && (
                    <Link href={`/${notif.mediaType}/${notif.mediaId}`} className="shrink-0 self-center ml-2">
                      <div className="relative h-14 w-10 overflow-hidden rounded-lg border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:border-white/30 hover:scale-105 transition-all">
                        <Image
                          src={`https://image.tmdb.org/t/p/w154${notif.mediaPoster}`}
                          alt={notif.mediaTitle || "Poster"}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    </Link>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  </PageTransition>
  );
}
