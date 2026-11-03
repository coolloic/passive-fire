// Readiness domain types. Terms follow GLOSSARY.md; rules in docs/spec/slice-1.md FR-3 and FR-4.

/** ISO calendar date, `YYYY-MM-DD`, in the site's time zone. */
export type IsoDate = string;

export type ReadinessState = "ready" | "short" | "unknown";

/** Demand for one product by one planned work, already rounded up to whole units. */
export interface DemandLine {
  plannedWorkId: string;
  workDate: IsoDate;
  /** ISO timestamp; breaks ties between planned work on the same date. */
  createdAt: string;
  productId: string;
  quantity: number;
  /** Whether the planned work belongs to the current user's crews. */
  isOwn: boolean;
}

export interface ExpectedDeliveryInput {
  id: string;
  productId: string;
  quantity: number;
  expectedDate: IsoDate;
  received: boolean;
}

export interface Supply {
  /** On-hand stock by product. A missing entry means there is no stock record. */
  stock: ReadonlyMap<string, number>;
  deliveries: readonly ExpectedDeliveryInput[];
}

export interface DeliveryAllocation {
  deliveryId: string;
  expectedDate: IsoDate;
  quantity: number;
}

/** What one planned work receives of one product, with the facts needed to explain it. */
export interface Allocation {
  plannedWorkId: string;
  productId: string;
  workDate: IsoDate;
  isOwn: boolean;
  needed: number;
  fromStock: number;
  fromDeliveries: DeliveryAllocation[];
  allocated: number;
  short: number;
  /** No stock record exists for the product, so readiness is Unknown. */
  noStockRecord: boolean;
  /** Units of this product already allocated to earlier planned work from supply this work could have used. */
  allocatedToEarlier: number;
  /** Unreceived quantity due on the work date itself; not counted. */
  dueSameDay: number;
  /** Unreceived quantity whose expected date has passed; not counted. */
  overdue: number;
}

export class InvalidReadinessInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidReadinessInputError";
  }
}
