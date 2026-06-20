"use client";

import { useEffect, useState } from "react";
import { getSuggestedUsers } from "@/actions/social.actions";
import Link from "next/link";
import { Users, UserPlus } from "lucide-react";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { Button } from "@/components/ui/button";

export function SuggestedUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSuggestedUsers(4).then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="cine-card p-4 animate-pulse min-h-[160px]">
        <div className="h-5 w-32 bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 items-center">
              <div className="h-10 w-10 bg-white/5 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-white/5 rounded" />
                <div className="h-2 w-16 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) return null;

  return (
    <div className="cine-card p-4 border border-white/5 bg-[#101018]">
      <div className="flex items-center gap-2 mb-4 px-1">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="text-[14px] font-black text-white uppercase tracking-wider font-display">Who to follow</h2>
      </div>
      
      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.userId} className="flex items-center justify-between gap-2 p-2 hover:bg-white/5 rounded-xl transition-colors group">
            <Link href={`/u/${u.username}`} className="flex items-center gap-3 flex-1 min-w-0">
              <SafeAvatar src={u.photoURL} alt={u.username} name={u.displayName} size={36} className="!h-9 !w-9" />
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-bold text-white leading-tight truncate group-hover:text-primary transition-colors">
                  {u.displayName}
                </span>
                <span className="text-[11px] text-zinc-500 truncate">@{u.username}</span>
              </div>
            </Link>
            
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 rounded-full bg-white/5 hover:bg-primary/20 hover:text-primary text-zinc-300 z-10 relative"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // We do a dynamic import here to keep the bundle small
                import("@/actions/social.actions").then(({ followUser }) => {
                  followUser(u.userId, u.username).then(() => {
                    // Optimistically hide the user from suggestions
                    setUsers(prev => prev.filter(user => user.userId !== u.userId));
                  });
                });
              }}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
