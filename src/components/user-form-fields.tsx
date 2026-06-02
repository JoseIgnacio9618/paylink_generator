"use client";

import { Label, inputClassName } from "@/components/panel-ui";
import type { UserRole } from "@/lib/types";

export const USER_ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "user", label: "Usuario" },
  { value: "superadmin", label: "Superadmin" },
];

export function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label text={label} />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={inputClassName}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ToggleField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label text={label} />
      <button
        type="button"
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`inline-flex h-[54px] w-full items-center justify-center rounded-[1.35rem] border px-4 text-sm font-semibold shadow-[0_12px_24px_rgba(58,44,34,0.05)] disabled:cursor-not-allowed disabled:opacity-50 ${
          checked
            ? "border-emerald-300/75 bg-emerald-50/92 text-emerald-900 dark:border-emerald-700/45 dark:bg-emerald-950/30 dark:text-emerald-100"
            : "border-border/75 bg-surface text-muted"
        }`}
      >
        {checked ? "Sí" : "No"}
      </button>
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-[1.35rem] border border-border/75 bg-surface/90 px-4 py-3.5 text-sm shadow-[0_10px_22px_rgba(58,44,34,0.05)] ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 rounded border-border text-accent focus:ring-2 focus:ring-accent/20"
      />
      <span className="leading-6 text-foreground">{label}</span>
    </label>
  );
}

export function SharedPaymentsField({
  role,
  canViewAllPayments,
  onChange,
}: {
  role: UserRole;
  canViewAllPayments: boolean;
  onChange: (value: boolean) => void;
}) {
  const isUserRole = role === "user";

  return (
    <div className="space-y-4 rounded-[1.7rem] border border-border/70 bg-surface/94 p-5 shadow-[0_14px_28px_rgba(58,44,34,0.06)] dark:bg-background/38">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
          Visibilidad de Pagos
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Decide si este usuario puede ver únicamente sus cobros o también los creados por el
          superadministrador y el resto de usuarios.
        </p>
      </div>

      <CheckboxField
        label="Puede ver pagos de todos"
        checked={isUserRole && canViewAllPayments}
        onChange={onChange}
        disabled={!isUserRole}
      />

      {!isUserRole ? (
        <p className="text-sm leading-6 text-muted">
          El superadministrador siempre tiene visibilidad global, así que este permiso no se aplica
          a su cuenta.
        </p>
      ) : null}
    </div>
  );
}
