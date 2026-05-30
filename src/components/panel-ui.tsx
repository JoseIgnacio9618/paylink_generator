import { cn } from "@/lib/utils";

export const inputClassName =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground shadow-[0_1px_0_rgba(18,34,38,0.02)] outline-none focus:border-accent focus:ring-4 focus:ring-accent/10";

export const textAreaClassName = `${inputClassName} min-h-28 resize-y`;

export function PageFrame({
  title,
  description,
  children,
  eyebrow,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  eyebrow: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-surface p-6 shadow-[var(--shadow)] lg:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted sm:text-lg">
          {description}
        </p>
      </section>

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
        "rounded-[2rem] border border-border bg-surface/92 p-6 shadow-[var(--shadow)]",
        className,
      )}
    >
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
  description: string;
}) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="max-w-3xl text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

export function Label({ text }: { text: string }) {
  return (
    <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
      <span>{text}</span>
    </label>
  );
}

export function Field({
  label,
  name,
  value,
  placeholder,
  onChange,
  labelAction,
}: {
  label: string;
  name: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  labelAction?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label text={label} />
        {labelAction}
      </div>
      <input
        name={name}
        value={value}
        placeholder={placeholder}
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
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  labelAction?: React.ReactNode;
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
        "rounded-2xl border px-4 py-3 text-sm",
        notice.tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-800",
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
        "rounded-[1.5rem] border border-border bg-gradient-to-br p-4",
        accents[accent],
      )}
    >
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
