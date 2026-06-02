import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-[96rem] flex-1 items-center px-4 py-10 sm:px-6 lg:px-10">
      <div className="flex w-full items-center justify-center">
        <LoginForm />
      </div>
    </main>
  );
}
