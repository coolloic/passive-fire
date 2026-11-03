import { assertIsoDate } from "./dates";
import { InvalidReadinessInputError, type DemandLine, type IsoDate } from "./types";

/** Quantities are stored to 3 decimal places; rounding to that first removes floating-point noise. */
function roundUpToWholeUnits(quantity: number): number {
  return Math.ceil(Math.round(quantity * 1000) / 1000);
}

function assertQuantity(quantity: number, label: string): void {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new InvalidReadinessInputError(`${label} must be a non-negative number, got ${quantity}`);
  }
}

export interface PlannedWorkDemandInput {
  plannedWorkId: string;
  workDate: IsoDate;
  createdAt: string;
  isOwn: boolean;
  items: {
    penetrationCount: number;
    requirements: { productId: string; quantityPerPenetration: number }[];
  }[];
}

/**
 * Sums each product across a planned work's scenarios (penetrations × quantity per penetration),
 * then rounds up once per planned work (spec AC-3.5).
 */
export function computeDemand(plannedWork: readonly PlannedWorkDemandInput[]): DemandLine[] {
  return plannedWork.flatMap((work) => {
    assertIsoDate(work.workDate, `Planned work ${work.plannedWorkId} date`);
    const totals = new Map<string, number>();
    for (const item of work.items) {
      if (!Number.isInteger(item.penetrationCount) || item.penetrationCount <= 0) {
        throw new InvalidReadinessInputError(
          `Planned work ${work.plannedWorkId} has an invalid penetration count ${item.penetrationCount}`,
        );
      }
      for (const requirement of item.requirements) {
        assertQuantity(requirement.quantityPerPenetration, "Quantity per penetration");
        const current = totals.get(requirement.productId) ?? 0;
        totals.set(
          requirement.productId,
          current + item.penetrationCount * requirement.quantityPerPenetration,
        );
      }
    }
    return [...totals].map(([productId, total]) => ({
      plannedWorkId: work.plannedWorkId,
      workDate: work.workDate,
      createdAt: work.createdAt,
      productId,
      quantity: roundUpToWholeUnits(total),
      isOwn: work.isOwn,
    }));
  });
}

export interface RawDemandRow {
  planned_work_id: string;
  work_date: IsoDate;
  created_at: string;
  product_id: string;
  /** Unrounded sum, as returned by the `allocation_demand` database function. */
  quantity: number;
  is_own: boolean;
}

/** Converts `allocation_demand` rows into demand lines, rounding each up to whole units. */
export function demandFromRows(rows: readonly RawDemandRow[]): DemandLine[] {
  return rows.map((row) => {
    assertIsoDate(row.work_date, `Planned work ${row.planned_work_id} date`);
    assertQuantity(row.quantity, "Demand quantity");
    return {
      plannedWorkId: row.planned_work_id,
      workDate: row.work_date,
      createdAt: row.created_at,
      productId: row.product_id,
      quantity: roundUpToWholeUnits(row.quantity),
      isOwn: row.is_own,
    };
  });
}
