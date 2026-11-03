import type { EscalationResolution, EscalationLineRecord } from "@/lib/data/escalation-repository";
import { formatQuantity } from "@/lib/readiness/describe";

export const RESOLUTION_LABELS: Record<EscalationResolution, string> = {
  stock_arriving: "Stock arriving",
  different_solution_nominated: "A different solution is being nominated",
  planned_work_rescheduled: "Planned work rescheduled",
};

/** Wording for a stored escalation line. */
export function describeStoredLine(line: EscalationLineRecord): string {
  const product =
    line.productName && line.unit ? { name: line.productName, unit: line.unit } : null;
  switch (line.reason) {
    case "shortage":
      return product && line.quantityShort !== null
        ? `Short by ${formatQuantity(line.quantityShort, product)}`
        : "A product is short";
    case "no_stock_record":
      return product ? `No stock record for ${product.name}` : "A product has no stock record";
    case "no_nominated_solution":
      return "A scenario has no nominated solution";
    case "no_product_requirement":
      return "Product quantities are unknown for a nominated solution";
  }
}
