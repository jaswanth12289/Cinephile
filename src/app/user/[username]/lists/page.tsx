import { redirect } from "next/navigation";

export default async function LegacyUserListsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  redirect(`/u/${username}?tab=lists`);
}
