import { cn } from "@/lib/utils";

export const inputClassName =
  "w-full rounded-[1.35rem] border border-border/80 bg-surface/96 px-4 py-3.5 text-sm font-medium text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_14px_30px_rgba(58,44,34,0.08)] outline-none backdrop-blur-sm focus:border-accent/55 focus:bg-surface focus:ring-4 focus:ring-accent/10 dark:bg-background/65";

export const textAreaClassName = `${inputClassName} min-h-28 resize-y`;
export const primaryButtonClassName =
  "inline-flex items-center justify-center rounded-[1.35rem] border border-accent bg-accent px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(154,79,36,0.2)] hover:-translate-y-0.5 hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";
export const secondaryButtonClassName =
  "inline-flex items-center justify-center rounded-[1.35rem] border border-border/80 bg-surface/96 px-5 py-3.5 text-sm font-semibold text-foreground shadow-[0_12px_26px_rgba(58,44,34,0.06)] hover:-translate-y-0.5 hover:border-accent/45 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 dark:bg-surface/88";
export const warmButtonClassName =
  "inline-flex items-center justify-center rounded-[1.35rem] border border-accent-warm/35 bg-accent-warm px-5 py-3.5 text-sm font-semibold text-[#24150a] shadow-[0_18px_34px_rgba(215,154,78,0.25)] hover:-translate-y-0.5 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";
export const dangerButtonClassName =
  "inline-flex items-center justify-center rounded-[1.35rem] border border-rose-300/75 bg-rose-50/90 px-5 py-3.5 text-sm font-semibold text-rose-800 shadow-[0_12px_24px_rgba(190,24,93,0.08)] hover:-translate-y-0.5 hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";
export const infoButtonClassName =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border/75 bg-surface text-[11px] font-semibold text-muted shadow-[0_10px_18px_rgba(58,44,34,0.05)] transition hover:border-accent/45 hover:text-accent";

export function PageFrame({
  title,
  description,
  children,
  eyebrow,
  headerMode = "compact",
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  eyebrow?: string;
  headerMode?: "compact" | "none";
}) {
  return (
    <main className="mx-auto flex w-full max-w-[96rem] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      {headerMode !== "none" && title ? (
        <section className="relative overflow-hidden rounded-[1.7rem] border border-border/70 bg-[linear-gradient(145deg,rgba(255,249,241,0.88),rgba(234,223,207,0.66))] px-5 py-4 shadow-[0_18px_40px_rgba(58,44,34,0.08)] dark:bg-[linear-gradient(145deg,rgba(24,29,36,0.92),rgba(36,42,51,0.84))]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/45 to-transparent" />
          <div className="absolute -right-12 top-0 h-24 w-24 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              {eyebrow ? (
                <span className="inline-flex items-center rounded-full border border-accent/18 bg-accent/8 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.28em] text-accent">
                  {eyebrow}
                </span>
              ) : null}
              <h1 className="mt-3 max-w-4xl font-[family:var(--font-display)] text-2xl font-semibold leading-none tracking-[-0.04em] text-foreground sm:text-3xl lg:text-[2.35rem]">
                {title}
              </h1>
            </div>
            {description ? (
              <p className="max-w-xl text-sm leading-6 text-muted lg:text-right">
                {description}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {children}
    </main>
  );
}

export function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,249,241,0.92),rgba(255,249,241,0.72))] p-6 shadow-[var(--shadow)] dark:bg-[linear-gradient(180deg,rgba(24,29,36,0.94),rgba(24,29,36,0.78))]",
        className,
      )}
    >
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">{eyebrow}</p>
      <h2 className="font-[family:var(--font-display)] text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[2rem]">
        {title}
      </h2>
      {description ? (
        <p className="max-w-3xl text-sm leading-7 text-muted">{description}</p>
      ) : null}
    </div>
  );
}

export function Label({ text }: { text: string }) {
  return (
    <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
      <span>{text}</span>
    </label>
  );
}

export function InfoPopover({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("group relative", className)}>
      <summary className="cursor-pointer list-none">
        <span className={cn(infoButtonClassName, "size-6")}>i</span>
      </summary>
      <div className="absolute right-0 top-8 z-20 w-[min(22rem,calc(100vw-3rem))] rounded-[1.2rem] border border-border/80 bg-surface/98 p-4 text-left shadow-[0_20px_40px_rgba(58,44,34,0.16)] backdrop-blur-xl dark:bg-surface-strong/96">
        {title ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent">{title}</p>
        ) : null}
        <div className={cn("space-y-2 text-sm leading-6 text-muted", title ? "mt-2.5" : "", "[&_strong]:text-foreground")}>
          {children}
        </div>
      </div>
    </details>
  );
}

export function InfoButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(infoButtonClassName, className)}
      aria-label="Ver ayuda del campo"
      title="Ver ayuda del campo"
    >
      i
    </button>
  );
}

export function InfoModal({
  title,
  children,
  isOpen,
  onClose,
  eyebrow = "Ayuda del campo",
}: {
  title?: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  eyebrow?: string;
}) {
  if (!isOpen || !title) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/36 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-border/70 bg-surface/96 p-6 shadow-[var(--shadow)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
            <h3 className="mt-3 font-[family:var(--font-display)] text-3xl font-semibold tracking-[-0.04em] text-foreground">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-full border border-border/75 bg-surface text-sm text-muted hover:border-accent/45 hover:text-accent"
            aria-label="Cerrar ayuda"
          >
            ×
          </button>
        </div>

        <div className="mt-6">{children}</div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className={secondaryButtonClassName}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  name,
  value,
  placeholder,
  onChange,
  labelAction,
  type = "text",
  autoComplete,
  inputMode,
  pattern,
  minLength,
  maxLength,
  min,
  max,
  step,
  required,
  readOnly,
  disabled,
  title,
}: {
  label: string;
  name: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  labelAction?: React.ReactNode;
  type?: React.HTMLInputTypeAttribute;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label text={label} />
        {labelAction}
      </div>
      <input
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        pattern={pattern}
        minLength={minLength}
        maxLength={maxLength}
        min={min}
        max={max}
        step={step}
        required={required}
        readOnly={readOnly}
        disabled={disabled}
        title={title}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />
    </div>
  );
}

export function TextareaField({
  label,
  name,
  value,
  onChange,
  labelAction,
  required,
  maxLength,
  minLength,
  placeholder,
  readOnly,
  disabled,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  labelAction?: React.ReactNode;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label text={label} />
        {labelAction}
      </div>
      <textarea
        name={name}
        value={value}
        required={required}
        maxLength={maxLength}
        minLength={minLength}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={textAreaClassName}
      />
    </div>
  );
}

export function NoticeBanner({
  notice,
}: {
  notice: { tone: "success" | "error"; text: string } | null;
}) {
  if (!notice) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-[1.45rem] border px-4 py-3.5 text-sm shadow-[0_12px_28px_rgba(58,44,34,0.06)]",
        notice.tone === "success"
          ? "border-emerald-300/70 bg-emerald-50/92 text-emerald-900 dark:border-emerald-700/50 dark:bg-emerald-950/35 dark:text-emerald-100"
          : "border-rose-300/70 bg-rose-50/92 text-rose-900 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-100",
      )}
    >
      {notice.text}
    </div>
  );
}

export function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "warm" | "success" | "accent" | "neutral";
}) {
  const accents: Record<typeof accent, string> = {
    warm: "from-accent-warm/25 to-surface",
    success: "from-emerald-400/20 to-surface",
    accent: "from-accent/20 to-surface",
    neutral: "from-zinc-300/20 to-surface",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.7rem] border border-border/70 bg-gradient-to-br p-5 shadow-[0_20px_38px_rgba(58,44,34,0.08)]",
        accents[accent],
      )}
    >
      <div className="absolute right-4 top-4 h-10 w-10 rounded-full border border-border/60 bg-white/20 blur-2xl dark:bg-white/5" />
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">{label}</p>
      <p className="mt-4 font-[family:var(--font-display)] text-4xl font-semibold tracking-[-0.05em] text-foreground">
        {value}
      </p>
    </div>
  );
}
