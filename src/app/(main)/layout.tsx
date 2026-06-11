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
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
