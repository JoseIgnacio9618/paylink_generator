import { UsersExistingManagement } from "@/components/users-existing-management";
import { requireSuperadminUser } from "@/lib/auth";
import { listUsersPaginated } from "@/lib/users";

type ExistingUsersPageProps = {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
  }>;
};

export default async function ExistingUsersPage({ searchParams }: ExistingUsersPageProps) {
  await requireSuperadminUser();
  const params = await searchParams;
  const users = await listUsersPaginated({
    page: Number(params.page ?? "1"),
    pageSize: Number(params.pageSize ?? "10"),
  });

  return <UsersExistingManagement users={users} />;
}
