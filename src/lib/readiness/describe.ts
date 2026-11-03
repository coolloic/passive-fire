import type { ProductUnit } from "@/lib/data/readiness-repository";
import { formatWorkDate } from "@/lib/format/date";
import type { DeliveryReliance, Reason } from "./readiness";

export interface ProductLabel {
  name: string;
  unit: ProductUnit;
}

export type ProductLookup = (productId: string) => ProductLabel | undefined;

const UNKNOWN_PRODUCT: ProductLabel = { name: "an unknown product", unit: "each" };

/** "10 × Collar", "2 m of Pipe wrap" or "3 × Sealant cartridge". */
export function formatQuantity(quantity: number, product: ProductLabel): string {
  return product.unit === "metre"
    ? `${quantity} m of ${product.name}`
    : `${quantity} × ${product.name}`;
}

/**
 * Plain-language wording for a readiness reason (spec AC-4.5). Other crews' planned work is only
 * ever summarised, never described.
 */
export function describeReason(
  reason: Reason,
  lookupProduct: ProductLookup,
  solutionCodes: ReadonlyMap<string, string> = new Map(),
): string {
  const product = (id: string) => lookupProduct(id) ?? UNKNOWN_PRODUCT;
  switch (reason.kind) {
    case "shortage":
      return `Short by ${formatQuantity(reason.quantity, product(reason.productId))}`;
    case "allocated_to_earlier":
      return `${reason.quantity} already allocated to earlier planned work`;
    case "delivery_due_same_day":
      return `Delivery of ${reason.quantity} is due on the work date, so it is not counted`;
    case "delivery_overdue":
      return `Delivery of ${reason.quantity} is overdue, so it is not counted`;
    case "no_stock_record":
      return `No stock record for ${product(reason.productId).name}`;
    case "no_nominated_solution":
      return "No solution nominated for this scenario";
    case "no_product_requirement": {
      const code = solutionCodes.get(reason.solutionId);
      return code
        ? `Product quantities unknown for solution ${code}`
        : "Product quantities unknown for the nominated solution";
    }
    case "no_scenarios":
      return "No scenarios are planned for this work";
  }
}

/** "Relies on delivery of 8 due Sun 8 Nov". */
export function describeReliance(reliance: DeliveryReliance): string {
  return `Relies on delivery of ${reliance.quantity} due ${formatWorkDate(reliance.expectedDate)}`;
}
