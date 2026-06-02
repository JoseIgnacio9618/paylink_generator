"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  SectionCard,
  SectionHeading,
  inputClassName,
  secondaryButtonClassName,
} from "@/components/panel-ui";
import type { PaginatedUsersResult } from "@/lib/types";

export function UsersExistingManagement({ users }: { users: PaginatedUsersResult }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigateWithParams(params: URLSearchParams) {
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function changePage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    navigateWithParams(params);
  }

  function changePageSize(nextPageSize: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", nextPageSize);
    params.set("page", "1");
    navigateWithParams(params);
  }

  return (
    <SectionCard>
      <SectionHeading
        eyebrow="Gestión"
        title="Usuarios existentes"
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {users.total} usuario{users.total === 1 ? "" : "s"} en total. Página {users.page} de{" "}
          {users.totalPages}.
        </p>

        <select
          value={String(users.pageSize)}
          onChange={(event) => changePageSize(event.target.value)}
          className={inputClassName}
        >
          <option value="5">5 por página</option>
          <option value="10">10 por página</option>
          <option value="20">20 por página</option>
          <option value="50">50 por página</option>
        </select>
      </div>

      <div className="mt-6 space-y-4">
        {users.items.length === 0 ? (
          <div className="rounded-[1.5rem] border border-border/70 bg-surface/90 px-5 py-8 text-center text-sm text-muted dark:bg-surface-strong/40">
            No hay usuarios en esta página.
          </div>
        ) : (
          users.items.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-[1.8rem] border border-border/70 bg-surface/94 p-5 shadow-[0_16px_30px_rgba(58,44,34,0.06)] dark:bg-background/36"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-[family:var(--font-display)] text-2xl font-semibold tracking-[-0.04em] text-foreground">
                    {user.displayName}
                  </p>
                  <span className="rounded-full border border-border/75 bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {user.role}
                  </span>
                  {!user.active ? (
                    <span className="rounded-full border border-rose-300/75 bg-rose-50/92 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                      Inactivo
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-sm text-muted">
                  @{user.username} · {user.paylinksCount} cobro{user.paylinksCount === 1 ? "" : "s"}
                </p>

                <p className="mt-2 text-sm leading-6 text-muted">
                  {user.role === "superadmin"
                    ? "Visibilidad global por rol."
                    : user.canViewAllPayments
                      ? "Puede ver pagos del superadministrador y del resto de usuarios."
                      : "Solo puede ver sus propios pagos."}
                </p>
              </div>

              <Link
                href={`/usuarios/${user.id}`}
                className={secondaryButtonClassName}
              >
                Editar
              </Link>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => changePage(users.page - 1)} disabled={users.page <= 1} className={secondaryButtonClassName}>
          Página anterior
        </button>
        <button type="button" onClick={() => changePage(users.page + 1)} disabled={users.page >= users.totalPages} className={secondaryButtonClassName}>
          Página siguiente
        </button>
      </div>
    </SectionCard>
  );
}
