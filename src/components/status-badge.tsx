import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  SUCCEEDED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  AUTHORIZED: "bg-teal-100 text-teal-800 border-teal-200",
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  PENDING_PROCESSING: "bg-amber-100 text-amber-800 border-amber-200",
  FAILED: "bg-rose-100 text-rose-800 border-rose-200",
  CANCELED: "bg-zinc-200 text-zinc-700 border-zinc-300",
  EXPIRED: "bg-zinc-200 text-zinc-700 border-zinc-300",
  REFUNDED: "bg-sky-100 text-sky-800 border-sky-200",
  PARTIALLY_REFUNDED: "bg-sky-100 text-sky-800 border-sky-200",
  PAID_OUT: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-[0.16em] uppercase",
        styles[status] ?? "bg-zinc-100 text-zinc-700 border-zinc-200",
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
