import type { PaylinkRecord } from "@/lib/types";

export function getPaylinkStats(paylinks: PaylinkRecord[]) {
  const total = paylinks.length;
  const paid = paylinks.filter((item) => item.moneiStatus === "SUCCEEDED").length;
  const pending = paylinks.filter((item) =>
    ["PENDING", "PENDING_PROCESSING"].includes(item.moneiStatus),
  ).length;
  const failed = paylinks.filter((item) =>
    ["FAILED", "CANCELED", "EXPIRED"].includes(item.moneiStatus),
  ).length;

  return { total, paid, pending, failed };
}
