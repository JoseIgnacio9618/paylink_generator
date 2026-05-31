"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SectionCard, SectionHeading } from "@/components/panel-ui";
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
        description="Aquí ves un resumen paginado de las cuentas ya creadas. Entra al detalle de cada una para editar credenciales, rol, activación y permiso de visibilidad de pagos."
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {users.total} usuario{users.total === 1 ? "" : "s"} en total. Página {users.page} de{" "}
          {users.totalPages}.
        </p>

        <select
          value={String(users.pageSize)}
          onChange={(event) => changePageSize(event.target.value)}
          className="rounded-full border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/10"
        >
          <option value="5">5 por página</option>
          <option value="10">10 por página</option>
          <option value="20">20 por página</option>
          <option value="50">50 por página</option>
        </select>
      </div>

      <div className="mt-6 space-y-4">
        {users.items.length === 0 ? (
          <div className="rounded-[1.5rem] border border-border bg-surface-strong/40 px-5 py-8 text-center text-sm text-muted">
            No hay usuarios en esta página.
          </div>
        ) : (
          users.items.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-[1.6rem] border border-border bg-surface-strong/45 p-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-foreground">{user.displayName}</p>
                  <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {user.role}
                  </span>
                  {!user.active ? (
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
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
                className="inline-flex items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground hover:border-accent hover:text-accent"
              >
                Editar
              </Link>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => changePage(users.page - 1)}
          disabled={users.page <= 1}
          className="inline-flex items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Página anterior
        </button>
        <button
          type="button"
          onClick={() => changePage(users.page + 1)}
          disabled={users.page >= users.totalPages}
          className="inline-flex items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Página siguiente
        </button>
      </div>
    </SectionCard>
  );
}
