import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  SUCCEEDED: "border-emerald-300/70 bg-emerald-50/92 text-emerald-900 dark:border-emerald-700/45 dark:bg-emerald-950/25 dark:text-emerald-100",
  AUTHORIZED: "border-teal-300/70 bg-teal-50/92 text-teal-900 dark:border-teal-700/45 dark:bg-teal-950/25 dark:text-teal-100",
  PENDING: "border-amber-300/70 bg-amber-50/92 text-amber-900 dark:border-amber-700/45 dark:bg-amber-950/25 dark:text-amber-100",
  PENDING_PROCESSING: "border-amber-300/70 bg-amber-50/92 text-amber-900 dark:border-amber-700/45 dark:bg-amber-950/25 dark:text-amber-100",
  FAILED: "border-rose-300/70 bg-rose-50/92 text-rose-900 dark:border-rose-700/45 dark:bg-rose-950/25 dark:text-rose-100",
  CANCELED: "border-zinc-300/70 bg-zinc-100/92 text-zinc-800 dark:border-zinc-700/45 dark:bg-zinc-900/35 dark:text-zinc-100",
  EXPIRED: "border-zinc-300/70 bg-zinc-100/92 text-zinc-800 dark:border-zinc-700/45 dark:bg-zinc-900/35 dark:text-zinc-100",
  REFUNDED: "border-sky-300/70 bg-sky-50/92 text-sky-900 dark:border-sky-700/45 dark:bg-sky-950/25 dark:text-sky-100",
  PARTIALLY_REFUNDED: "border-sky-300/70 bg-sky-50/92 text-sky-900 dark:border-sky-700/45 dark:bg-sky-950/25 dark:text-sky-100",
  PAID_OUT: "border-emerald-300/70 bg-emerald-50/92 text-emerald-900 dark:border-emerald-700/45 dark:bg-emerald-950/25 dark:text-emerald-100",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-[0.2em] uppercase shadow-[0_10px_20px_rgba(58,44,34,0.06)]",
        styles[status] ??
          "border-zinc-300/70 bg-zinc-100/92 text-zinc-800 dark:border-zinc-700/45 dark:bg-zinc-900/35 dark:text-zinc-100",
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
