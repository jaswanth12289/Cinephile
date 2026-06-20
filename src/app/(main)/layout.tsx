import { Navbar } from "@/components/layout/Navbar";
import { verifySession } from "@/actions/auth.actions";
import { adminDb } from "@/lib/firebase/admin";
import { redirect } from "next/navigation";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (session) {
    const userDoc = await adminDb.collection("users").doc(session.uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      if (data?.profileCompleted === false) {
        redirect("/setup-profile");
      }
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
