import type { PlannedWorkReadiness } from "@/lib/readiness/readiness";

export type EscalationLineReason =
  "shortage" | "no_nominated_solution" | "no_product_requirement" | "no_stock_record";

/** One line of an escalation: what is short, or which fact is missing. */
export type EscalationLineDraft =
  | { reason: "shortage"; productId: string; quantityShort: number }
  | { reason: "no_stock_record"; productId: string; quantityShort: null }
  | {
      reason: "no_nominated_solution" | "no_product_requirement";
      productId: null;
      quantityShort: null;
    };

/**
 * The lines an escalation records for a planned work, derived from readiness on the server.
 * Shortages carry quantities; missing facts (no nominated solution, no product requirement,
 * no stock record) are listed once each.
 */
export function escalationLinesFrom(readiness: PlannedWorkReadiness): EscalationLineDraft[] {
  const lines: EscalationLineDraft[] = [];
  const seen = new Set<string>();
  const add = (line: EscalationLineDraft) => {
    const key = `${line.reason}:${line.productId ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(line);
  };

  for (const product of readiness.products) {
    if (product.reasons.some((reason) => reason.kind === "no_stock_record")) {
      add({ productId: product.productId, quantityShort: null, reason: "no_stock_record" });
    } else if (product.short > 0) {
      add({ productId: product.productId, quantityShort: product.short, reason: "shortage" });
    }
  }
  for (const scenario of readiness.scenarios) {
    for (const reason of scenario.reasons) {
      if (reason.kind === "no_nominated_solution" || reason.kind === "no_product_requirement") {
        add({ productId: null, quantityShort: null, reason: reason.kind });
      }
    }
  }
  return lines;
}
