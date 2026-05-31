"use client";

import { startTransition, useState } from "react";
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
import type { UserRole } from "@/lib/types";

type Notice = {
  tone: "success" | "error";
  text: string;
} | null;

type CreateUserFormState = {
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
  active: boolean;
  canViewAllPayments: boolean;
};

const INITIAL_FORM: CreateUserFormState = {
  username: "",
  displayName: "",
  password: "",
  role: "user",
  active: true,
  canViewAllPayments: false,
};

export function UserCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState<CreateUserFormState>(INITIAL_FORM);
  const [notice, setNotice] = useState<Notice>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateRole(nextRole: string) {
    setForm((current) => ({
      ...current,
      role: nextRole as UserRole,
      canViewAllPayments: nextRole === "user" ? current.canViewAllPayments : false,
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice(null);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo crear el usuario.");
      }

      setForm(INITIAL_FORM);
      setNotice({ tone: "success", text: "Usuario creado correctamente." });
      startTransition(() => router.refresh());
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "No se pudo crear el usuario.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SectionCard>
      <SectionHeading
        eyebrow="Alta"
        title="Crear usuario"
        description="Crea superadministradores y usuarios operativos. En los usuarios normales puedes decidir si verán solo sus propios cobros o también los del superadministrador y el resto de usuarios."
      />

      <form className="mt-6 space-y-6" onSubmit={submit}>
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
              <span>Contraseña</span>
            </label>
            <input
              type="password"
              value={form.password}
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-2xl bg-accent px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-65"
        >
          {isSubmitting ? "Creando..." : "Crear usuario"}
        </button>
      </form>
    </SectionCard>
  );
}
