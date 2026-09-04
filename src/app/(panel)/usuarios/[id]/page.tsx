import { notFound } from "next/navigation";
import { UserEditForm } from "@/components/user-edit-form";
import { requireSuperadminUser } from "@/lib/auth";
import { getUserById, getUserSummaryById } from "@/lib/users";

type UserEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function UserEditPage({ params }: UserEditPageProps) {
  const currentUser = await requireSuperadminUser();
  const { id } = await params;
  const user = await getUserById(id);

  if (!user) {
    notFound();
  }

  const userSummary = await getUserSummaryById(id);

  return <UserEditForm user={user} userSummary={userSummary} currentUserId={currentUser.id} />;
}
