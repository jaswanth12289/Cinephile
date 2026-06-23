// @ts-nocheck
import { verifySession } from "@/actions/auth.actions";
import { redirect } from "next/navigation";
import { getNotifications } from "@/actions/social.actions";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageTransition } from "@/components/shared/PageTransition";
import { VirtualizedNotificationsList } from "@/components/shared/VirtualizedNotificationsList";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  // Fetch notifications
  const notifications = await getNotifications();

  // Mark notifications as read in the background
  await markNotificationsAsRead();

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#0F0F1A] py-4 sm:py-8 pb-16">
        <div className="max-w-2xl mx-auto px-4 space-y-4 sm:space-y-6">
          
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/5 pb-3 sm:pb-4 select-none">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-xl text-primary border border-primary/20">
              <Bell className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-[20px] font-bold text-white tracking-tight">
                Notifications
              </h1>
              <p className="text-xs sm:text-[13px] text-muted-foreground">
                Stay updated with reactions, comments, and new followers.
              </p>
            </div>
          </div>

          {/* Notifications list (window virtualized) */}
          {notifications.length === 0 ? (
            <div className="py-4">
              <EmptyState
                icon={<Bell />}
                title="Quiet for now."
                description="Great conversations start with great films. Keep sharing reviews and lists to spark conversations!"
                actionHref="/discover"
                actionText="Explore Films"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <VirtualizedNotificationsList notifications={notifications} />
            </div>
          )}

        </div>
      </div>
    </PageTransition>
  );
}
