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
  SelectField,
  SharedPaymentsField,
  ToggleField,
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
  confirmPassword: string;
  role: UserRole;
  active: boolean;
  canViewAllPayments: boolean;
};

function buildInitialState(user: UserRecord): EditUserFormState {
  return {
    username: user.username,
    displayName: user.displayName,
    password: "",
    confirmPassword: "",
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
    setNotice(null);

    const isUpdatingPassword = form.password.length > 0 || form.confirmPassword.length > 0;

    if (isUpdatingPassword && form.password !== form.confirmPassword) {
      setNotice({ tone: "error", text: "Las contraseñas deben coincidir." });
      return;
    }

    setIsSaving(true);

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

      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
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

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_220px_220px]">
          <Field
            label="Nueva contraseña"
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            placeholder="Déjala vacía para no cambiarla"
            onChange={(value) => setForm((current) => ({ ...current, password: value }))}
          />
          <Field
            label="Repetir contraseña"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            placeholder="Repítela solo si la cambias"
            onChange={(value) =>
              setForm((current) => ({ ...current, confirmPassword: value }))
            }
          />

          <SelectField
            label="Rol"
            value={form.role}
            onChange={updateRole}
            options={USER_ROLE_OPTIONS}
          />

          <ToggleField
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
