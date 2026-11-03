import {
  InvalidReadinessInputError,
  type Allocation,
  type IsoDate,
  type ReadinessState,
} from "./types";

/** Why a scenario or planned work is not Ready. The UI turns these into words (spec AC-4.5). */
export type Reason =
  | { kind: "shortage"; productId: string; quantity: number }
  | { kind: "allocated_to_earlier"; productId: string; quantity: number }
  | { kind: "delivery_due_same_day"; productId: string; quantity: number }
  | { kind: "delivery_overdue"; productId: string; quantity: number }
  | { kind: "no_stock_record"; productId: string }
  | { kind: "no_nominated_solution" }
  | { kind: "no_product_requirement"; solutionId: string }
  | { kind: "no_scenarios" };

export interface ScenarioInput {
  scenarioId: string;
  penetrationCount: number;
  /** Null when the scenario has no nominated solution. */
  nominatedSolutionId: string | null;
  /** Product requirements of the nominated solution; empty when none exist. */
  requirements: readonly { productId: string; quantityPerPenetration: number }[];
}

export interface PlannedWorkInput {
  plannedWorkId: string;
  workDate: IsoDate;
  scenarios: readonly ScenarioInput[];
}

export interface DeliveryReliance {
  productId: string;
  expectedDate: IsoDate;
  quantity: number;
}

export interface ProductReadiness {
  productId: string;
  needed: number;
  allocated: number;
  short: number;
  state: ReadinessState;
  reliesOnDeliveries: DeliveryReliance[];
  reasons: Reason[];
}

export interface ScenarioReadiness {
  scenarioId: string;
  state: ReadinessState;
  productIds: string[];
  reasons: Reason[];
}

export interface PlannedWorkReadiness {
  plannedWorkId: string;
  workDate: IsoDate;
  state: ReadinessState;
  reliesOnDelivery: boolean;
  scenarios: ScenarioReadiness[];
  products: ProductReadiness[];
}

const SEVERITY: Record<ReadinessState, number> = { ready: 0, unknown: 1, short: 2 };

/** Combines states: Short outranks Unknown, which outranks Ready (spec AC-4.4). */
export function worstState(states: readonly ReadinessState[]): ReadinessState {
  return states.reduce<ReadinessState>(
    (worst, state) => (SEVERITY[state] > SEVERITY[worst] ? state : worst),
    "ready",
  );
}

function productReadiness(allocation: Allocation): ProductReadiness {
  const { productId } = allocation;
  const reliesOnDeliveries = allocation.fromDeliveries.map((delivery) => ({
    productId,
    expectedDate: delivery.expectedDate,
    quantity: delivery.quantity,
  }));
  const base = {
    productId,
    needed: allocation.needed,
    allocated: allocation.allocated,
    short: allocation.short,
    reliesOnDeliveries,
  };

  if (allocation.noStockRecord) {
    return { ...base, state: "unknown", reasons: [{ kind: "no_stock_record", productId }] };
  }
  if (allocation.short === 0) {
    return { ...base, state: "ready", reasons: [] };
  }

  const reasons: Reason[] = [{ kind: "shortage", productId, quantity: allocation.short }];
  if (allocation.allocatedToEarlier > 0) {
    reasons.push({
      kind: "allocated_to_earlier",
      productId,
      quantity: allocation.allocatedToEarlier,
    });
  }
  if (allocation.dueSameDay > 0) {
    reasons.push({ kind: "delivery_due_same_day", productId, quantity: allocation.dueSameDay });
  }
  if (allocation.overdue > 0) {
    reasons.push({ kind: "delivery_overdue", productId, quantity: allocation.overdue });
  }
  return { ...base, state: "short", reasons };
}

function scenarioReadiness(
  scenario: ScenarioInput,
  products: ReadonlyMap<string, ProductReadiness>,
): ScenarioReadiness {
  const base = { scenarioId: scenario.scenarioId };
  if (scenario.nominatedSolutionId === null) {
    return {
      ...base,
      state: "unknown",
      productIds: [],
      reasons: [{ kind: "no_nominated_solution" }],
    };
  }
  if (scenario.requirements.length === 0) {
    return {
      ...base,
      state: "unknown",
      productIds: [],
      reasons: [{ kind: "no_product_requirement", solutionId: scenario.nominatedSolutionId }],
    };
  }

  const productIds = [
    ...new Set(scenario.requirements.map((requirement) => requirement.productId)),
  ];
  const relevant = productIds.map((productId) => {
    const product = products.get(productId);
    if (!product) {
      throw new InvalidReadinessInputError(
        `No allocation for product ${productId} in scenario ${scenario.scenarioId}`,
      );
    }
    return product;
  });
  return {
    ...base,
    state: worstState(relevant.map((product) => product.state)),
    productIds,
    reasons: relevant.flatMap((product) => product.reasons),
  };
}

/**
 * Derives readiness for one planned work from its scenarios and the allocations made for it
 * (spec FR-4). Unknown is never reported as Ready.
 */
export function deriveReadiness(
  plannedWork: PlannedWorkInput,
  allocations: readonly Allocation[],
): PlannedWorkReadiness {
  const own = allocations.filter(
    (allocation) => allocation.plannedWorkId === plannedWork.plannedWorkId,
  );
  const products = new Map(
    own.map((allocation) => [allocation.productId, productReadiness(allocation)]),
  );
  const scenarios = plannedWork.scenarios.map((scenario) => scenarioReadiness(scenario, products));

  const state =
    scenarios.length === 0 ? "unknown" : worstState(scenarios.map((scenario) => scenario.state));
  const usedProducts = new Set(scenarios.flatMap((scenario) => scenario.productIds));
  const productList = [...products.values()].filter((product) =>
    usedProducts.has(product.productId),
  );

  return {
    plannedWorkId: plannedWork.plannedWorkId,
    workDate: plannedWork.workDate,
    state,
    reliesOnDelivery: productList.some((product) => product.reliesOnDeliveries.length > 0),
    scenarios,
    products: productList,
  };
}

/** Reasons that apply to the planned work as a whole, without duplicates. */
export function plannedWorkReasons(readiness: PlannedWorkReadiness): Reason[] {
  if (readiness.scenarios.length === 0) return [{ kind: "no_scenarios" }];
  const seen = new Set<string>();
  return readiness.scenarios
    .flatMap((scenario) => scenario.reasons)
    .filter((reason) => {
      const key = JSON.stringify(reason);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
