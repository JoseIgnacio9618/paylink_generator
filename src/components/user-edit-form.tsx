"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Field,
  NoticeBanner,
  SectionCard,
  SectionHeading,
} from "@/components/panel-ui";
import {
  CheckboxField,
  SelectField,
  SharedPaymentsField,
  USER_ROLE_OPTIONS,
} from "@/components/user-form-fields";
import type { UserRecord, UserRole, UserSummary } from "@/lib/types";

type Notice = {
  tone: "success" | "error";
  text: string;
} | null;

type EditUserFormState = {
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
  active: boolean;
  canViewAllPayments: boolean;
};

function buildInitialState(user: UserRecord): EditUserFormState {
  return {
    username: user.username,
    displayName: user.displayName,
    password: "",
    role: user.role,
    active: user.active,
    canViewAllPayments: user.canViewAllPayments,
  };
}

export function UserEditForm({
  user,
  userSummary,
  currentUserId,
}: {
  user: UserRecord;
  userSummary: UserSummary | null;
  currentUserId: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<EditUserFormState>(() => buildInitialState(user));
  const [notice, setNotice] = useState<Notice>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function updateRole(nextRole: string) {
    setForm((current) => ({
      ...current,
      role: nextRole as UserRole,
      canViewAllPayments: nextRole === "user" ? current.canViewAllPayments : false,
    }));
  }

  async function saveChanges(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo actualizar el usuario.");
      }

      setForm((current) => ({ ...current, password: "" }));
      setNotice({ tone: "success", text: "Usuario actualizado correctamente." });
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "No se pudo actualizar el usuario.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCurrentUser() {
    setIsDeleting(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo eliminar el usuario.");
      }

      router.push("/usuarios/existentes");
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "No se pudo eliminar el usuario.",
      });
      setIsDeleting(false);
    }
  }

  return (
    <SectionCard>
      <SectionHeading
        eyebrow="Edición"
        title={`Editar ${user.displayName}`}
        description="Aquí modificas la cuenta concreta. Puedes cambiar sus credenciales, el estado de acceso, su rol y si tiene visibilidad global de pagos."
      />

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>@{user.username}</span>
        <span>·</span>
        <span>{userSummary?.paylinksCount ?? 0} cobro{userSummary?.paylinksCount === 1 ? "" : "s"}</span>
        {user.id === currentUserId ? <span>· Tu cuenta</span> : null}
      </div>

      <form className="mt-6 space-y-6" onSubmit={saveChanges}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Usuario"
            name="username"
            value={form.username}
            onChange={(value) => setForm((current) => ({ ...current, username: value }))}
          />
          <Field
            label="Nombre visible"
            name="displayName"
            value={form.displayName}
            onChange={(value) => setForm((current) => ({ ...current, displayName: value }))}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
          <div className="space-y-2">
            <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
              <span>Nueva contraseña</span>
            </label>
            <input
              type="password"
              value={form.password}
              placeholder="Déjala vacía para no cambiarla"
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground shadow-[0_1px_0_rgba(18,34,38,0.02)] outline-none focus:border-accent focus:ring-4 focus:ring-accent/10"
            />
          </div>

          <SelectField
            label="Rol"
            value={form.role}
            onChange={updateRole}
            options={USER_ROLE_OPTIONS}
          />

          <CheckboxField
            label="Activo"
            checked={form.active}
            onChange={(checked) => setForm((current) => ({ ...current, active: checked }))}
          />
        </div>

        <SharedPaymentsField
          role={form.role}
          canViewAllPayments={form.canViewAllPayments}
          onChange={(value) => setForm((current) => ({ ...current, canViewAllPayments: value }))}
        />

        <NoticeBanner notice={notice} />

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-2xl bg-accent px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-65"
          >
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </button>

          <Link
            href="/usuarios/existentes"
            className="inline-flex items-center justify-center rounded-2xl border border-border px-5 py-3.5 text-sm font-semibold text-foreground hover:border-accent hover:text-accent"
          >
            Volver al listado
          </Link>

          <button
            type="button"
            onClick={deleteCurrentUser}
            disabled={isDeleting || user.id === currentUserId}
            className="inline-flex items-center justify-center rounded-2xl border border-rose-200 px-5 py-3.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Eliminando..." : "Eliminar usuario"}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}
