"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Field,
  NoticeBanner,
  primaryButtonClassName,
  SectionCard,
  SectionHeading,
} from "@/components/panel-ui";
import {
  SelectField,
  SharedPaymentsField,
  ToggleField,
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
  confirmPassword: string;
  role: UserRole;
  active: boolean;
  canViewAllPayments: boolean;
};

const INITIAL_FORM: CreateUserFormState = {
  username: "",
  displayName: "",
  password: "",
  confirmPassword: "",
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
    setNotice(null);

    if (form.password !== form.confirmPassword) {
      setNotice({ tone: "error", text: "Las contraseñas deben coincidir." });
      return;
    }

    setIsSubmitting(true);

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

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_220px_220px]">
          <Field
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(value) => setForm((current) => ({ ...current, password: value }))}
          />
          <Field
            label="Repetir contraseña"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(value) => setForm((current) => ({ ...current, confirmPassword: value }))}
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

        <button
          type="submit"
          disabled={isSubmitting}
          className={primaryButtonClassName}
        >
          {isSubmitting ? "Creando..." : "Crear usuario"}
        </button>
      </form>
    </SectionCard>
  );
}
