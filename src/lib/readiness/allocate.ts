import { assertIsoDate } from "./dates";
import {
  InvalidReadinessInputError,
  type Allocation,
  type DeliveryAllocation,
  type DemandLine,
  type ExpectedDeliveryInput,
  type IsoDate,
  type Supply,
} from "./types";

interface DeliveryPool {
  delivery: ExpectedDeliveryInput;
  remaining: number;
}

interface ProductPool {
  hasStockRecord: boolean;
  stockRemaining: number;
  deliveries: DeliveryPool[];
  /** Units allocated so far, used to explain later shortages. */
  allocatedSoFar: number;
}

function compareDemand(a: DemandLine, b: DemandLine): number {
  return (
    a.workDate.localeCompare(b.workDate) ||
    a.createdAt.localeCompare(b.createdAt) ||
    a.plannedWorkId.localeCompare(b.plannedWorkId)
  );
}

function validateSupply(supply: Supply): void {
  for (const [productId, quantity] of supply.stock) {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new InvalidReadinessInputError(
        `Stock for ${productId} must be a whole number ≥ 0, got ${quantity}`,
      );
    }
  }
  for (const delivery of supply.deliveries) {
    assertIsoDate(delivery.expectedDate, `Delivery ${delivery.id} date`);
    if (!Number.isInteger(delivery.quantity) || delivery.quantity <= 0) {
      throw new InvalidReadinessInputError(
        `Delivery ${delivery.id} quantity must be a whole number > 0`,
      );
    }
  }
}

function buildPools(supply: Supply, today: IsoDate): Map<string, ProductPool> {
  const pools = new Map<string, ProductPool>();
  const poolFor = (productId: string): ProductPool => {
    let pool = pools.get(productId);
    if (!pool) {
      const stock = supply.stock.get(productId);
      pool = {
        hasStockRecord: stock !== undefined,
        stockRemaining: stock ?? 0,
        deliveries: [],
        allocatedSoFar: 0,
      };
      pools.set(productId, pool);
    }
    return pool;
  };
  for (const productId of supply.stock.keys()) poolFor(productId);
  for (const delivery of supply.deliveries) {
    // Received deliveries are already counted in stock; overdue ones are not counted at all.
    if (delivery.received || delivery.expectedDate < today) continue;
    poolFor(delivery.productId).deliveries.push({ delivery, remaining: delivery.quantity });
  }
  for (const pool of pools.values()) {
    pool.deliveries.sort(
      (a, b) =>
        a.delivery.expectedDate.localeCompare(b.delivery.expectedDate) ||
        a.delivery.id.localeCompare(b.delivery.id),
    );
  }
  return pools;
}

function unreceivedQuantity(
  deliveries: readonly ExpectedDeliveryInput[],
  productId: string,
  matches: (delivery: ExpectedDeliveryInput) => boolean,
): number {
  return deliveries
    .filter(
      (delivery) => delivery.productId === productId && !delivery.received && matches(delivery),
    )
    .reduce((sum, delivery) => sum + delivery.quantity, 0);
}

/**
 * Allocates stock, then usable expected deliveries, to planned work in date order (spec FR-3).
 * Only planned work dated `today` or later takes part. A delivery is usable only by planned work
 * dated after its expected date, and only while it is not overdue.
 */
export function allocate(
  demand: readonly DemandLine[],
  supply: Supply,
  today: IsoDate,
): Allocation[] {
  assertIsoDate(today, "Today");
  validateSupply(supply);
  for (const line of demand) {
    assertIsoDate(line.workDate, `Planned work ${line.plannedWorkId} date`);
    if (!Number.isInteger(line.quantity) || line.quantity < 0) {
      throw new InvalidReadinessInputError(
        `Demand quantity must be a whole number ≥ 0, got ${line.quantity}`,
      );
    }
  }

  const pools = buildPools(supply, today);
  const ordered = demand.filter((line) => line.workDate >= today).sort(compareDemand);

  return ordered.map((line): Allocation => {
    const pool = pools.get(line.productId);
    const dueSameDay = unreceivedQuantity(
      supply.deliveries,
      line.productId,
      (d) => d.expectedDate === line.workDate,
    );
    const overdue = unreceivedQuantity(
      supply.deliveries,
      line.productId,
      (d) => d.expectedDate < today,
    );
    const base = {
      plannedWorkId: line.plannedWorkId,
      productId: line.productId,
      workDate: line.workDate,
      isOwn: line.isOwn,
      needed: line.quantity,
      dueSameDay,
      overdue,
    };

    if (!pool || !pool.hasStockRecord) {
      return {
        ...base,
        fromStock: 0,
        fromDeliveries: [],
        allocated: 0,
        short: line.quantity,
        noStockRecord: true,
        allocatedToEarlier: pool?.allocatedSoFar ?? 0,
      };
    }

    const allocatedToEarlier = pool.allocatedSoFar;
    let outstanding = line.quantity;
    const fromStock = Math.min(outstanding, pool.stockRemaining);
    pool.stockRemaining -= fromStock;
    outstanding -= fromStock;

    const fromDeliveries: DeliveryAllocation[] = [];
    for (const entry of pool.deliveries) {
      if (outstanding === 0) break;
      if (entry.remaining === 0 || entry.delivery.expectedDate >= line.workDate) continue;
      const taken = Math.min(outstanding, entry.remaining);
      entry.remaining -= taken;
      outstanding -= taken;
      fromDeliveries.push({
        deliveryId: entry.delivery.id,
        expectedDate: entry.delivery.expectedDate,
        quantity: taken,
      });
    }

    const allocated = line.quantity - outstanding;
    pool.allocatedSoFar += allocated;
    return {
      ...base,
      fromStock,
      fromDeliveries,
      allocated,
      short: outstanding,
      noStockRecord: false,
      allocatedToEarlier,
    };
  });
}
