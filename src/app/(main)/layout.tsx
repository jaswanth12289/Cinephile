import { Navbar } from "@/components/layout/Navbar";
import { verifySession } from "@/actions/auth.actions";
import { createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (session) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("profiles")
      .select("profile_completed")
      .eq("id", session.id)
      .maybeSingle();
      
    if (!data || data.profile_completed === false) {
      redirect("/setup-profile");
    }
  }

  return (
    <div className="min-h-screen">
      {/* Sidebar / Top bar / Bottom nav */}
      <Navbar />

      {/* Main content area — offset for sidebar on desktop, padded for mobile header/footer nav */}
      <main className="main-with-sidebar pt-14 pb-24 lg:pt-0 lg:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
