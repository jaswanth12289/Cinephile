import { verifySession } from "@/actions/auth.actions";
import { adminDb } from "@/lib/firebase/admin";
import { redirect } from "next/navigation";
import { ShieldAlert, Users, MessageSquare, Flag } from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const userDoc = await adminDb.collection("users").doc(session.uid).get();
  if (!userDoc.exists || !userDoc.data()?.isAdmin) {
    redirect("/");
  }

  // Fetch counts
  const usersCountSnap = await adminDb.collection("users").count().get();
  const postsCountSnap = await adminDb.collection("activities").where("type", "==", "post").count().get();
  const reportsCountSnap = await adminDb.collection("reports").where("status", "==", "pending").count().get();

  const totalUsers = usersCountSnap.data().count;
  const totalPosts = postsCountSnap.data().count;
  const pendingReports = reportsCountSnap.data().count;

  // Fetch recent reports
  const recentReportsSnap = await adminDb
    .collection("reports")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();
  
  const reports = recentReportsSnap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
    };
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <ShieldAlert className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-black font-display text-white tracking-wide">
          Admin Dashboard
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-[#101018] border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
          <Users className="h-6 w-6 text-blue-500 mb-1" />
          <div className="text-3xl font-black text-white">{totalUsers}</div>
          <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Total Users</div>
        </div>
        <div className="bg-[#101018] border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
          <MessageSquare className="h-6 w-6 text-green-500 mb-1" />
          <div className="text-3xl font-black text-white">{totalPosts}</div>
          <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Total Posts</div>
        </div>
        <div className="bg-[#101018] border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
          <Flag className="h-6 w-6 text-amber-500 mb-1" />
          <div className="text-3xl font-black text-white">{pendingReports}</div>
          <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Pending Reports</div>
        </div>
      </div>

      <div className="bg-[#101018] border border-white/5 p-6 rounded-2xl mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Create Movie Club</h2>
        <form action={async (formData) => {
          "use server";
          const title = formData.get("title") as string;
          const description = formData.get("description") as string;
          const tags = (formData.get("tags") as string).split(",").map(t => t.trim()).filter(Boolean);
          const { createClubAction } = await import("@/actions/admin.actions");
          await createClubAction(title, description, tags);
        }} className="space-y-4">
          <input type="text" name="title" placeholder="Club Title (e.g. Sci-Fi Fans)" required className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm" />
          <textarea name="description" placeholder="Club Description" required className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm h-20" />
          <input type="text" name="tags" placeholder="Tags (comma separated, e.g. SciFi, Space)" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm" />
          <button type="submit" className="bg-primary text-primary-foreground font-bold px-6 py-2 rounded-lg text-sm hover:bg-primary/90">Create Club</button>
        </form>
      </div>

      <div className="bg-[#101018] border border-white/5 p-6 rounded-2xl mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Create Weekly Challenge</h2>
        <form action={async (formData) => {
          "use server";
          const title = formData.get("title") as string;
          const description = formData.get("description") as string;
          const rewardBadge = formData.get("rewardBadge") as string;
          const endsAtDateStr = formData.get("endsAt") as string;
          const { createChallengeAction } = await import("@/actions/admin.actions");
          await createChallengeAction(title, description, rewardBadge, endsAtDateStr);
        }} className="space-y-4">
          <input type="text" name="title" placeholder="Challenge Title (e.g. Sci-Fi Week)" required className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm" />
          <textarea name="description" placeholder="Challenge Description (e.g. Watch 3 sci-fi movies...)" required className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm h-20" />
          <div className="flex gap-4">
            <input type="text" name="rewardBadge" placeholder="Reward Badge (e.g. Sci-Fi Expert)" required className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm" />
            <input type="datetime-local" name="endsAt" required className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm" />
          </div>
          <button type="submit" className="bg-primary text-primary-foreground font-bold px-6 py-2 rounded-lg text-sm hover:bg-primary/90">Create Challenge</button>
        </form>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Recent Reports</h2>
      <div className="bg-[#101018] border border-white/5 rounded-2xl overflow-hidden">
        {reports.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">
            No reports at the moment.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {reports.map((report: any) => (
              <div key={report.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-white font-bold mb-1">
                    Activity ID: <span className="font-mono text-xs text-zinc-400">{report.activityId}</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    Reported by: <span className="font-mono">{report.reporterId}</span> • Reason: {report.reason}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                    report.status === "pending" ? "bg-amber-500/20 text-amber-500" : "bg-green-500/20 text-green-500"
                  }`}>
                    {report.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
