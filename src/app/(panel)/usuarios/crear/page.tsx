import { UserCreateForm } from "@/components/user-create-form";
import { requireSuperadminUser } from "@/lib/auth";

export default async function UsersCreatePage() {
  await requireSuperadminUser();

  return <UserCreateForm />;
}
