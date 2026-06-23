// @ts-nocheck
import { getListBySlug, getListItems } from "@/actions/list.actions";
import { verifySession } from "@/actions/auth.actions";
import { notFound, redirect } from "next/navigation";
import { ListEditor } from "@/features/lists/ListEditor";

export const dynamic = "force-dynamic";

interface EditListPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function EditListPage({ params }: EditListPageProps) {
  const { slug } = await params;
  const list = await getListBySlug(slug);

  if (!list) notFound();

  // Authorization check
  const session = await verifySession();
  if (!session) redirect("/login");

  const isOwner = list.ownerId === session.uid;
  const isCollaborator = list.collaborators?.some((c: any) => c.uid === session.uid);

  if (!isOwner && !isCollaborator) {
    // Return unauthorized message or redirect
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center text-white px-4 select-none">
        <div className="max-w-md w-full text-center space-y-4 bg-card/25 border border-white/5 rounded-2xl p-8 backdrop-blur-md">
          <div className="text-red-500 font-black text-2xl uppercase tracking-wider">Unauthorized</div>
          <p className="text-[13.5px] text-muted-foreground leading-relaxed">
            You do not have permission to edit this list. Only the list creator or designated collaborators can edit list items.
          </p>
          <div className="pt-2">
            <a href={`/list/${slug}`} className="inline-block bg-primary text-white text-xs font-black uppercase h-9 px-5 rounded-xl leading-[36px] hover:bg-primary/95 transition-all">
              Go Back to List
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Fetch items
  const items = await getListItems(list.id);

  return <ListEditor initialList={list} initialItems={items} />;
}
