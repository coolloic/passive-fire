import type { PlannedWorkDetailSource, ProductUnit } from "@/lib/data/readiness-repository";
import { escalationLinesFrom, type EscalationLineDraft } from "@/lib/escalation/lines";
import { computeReadiness } from "@/lib/readiness/compute";
import { describeReason, describeReliance, type ProductLabel } from "@/lib/readiness/describe";
import type { IsoDate, ReadinessState } from "@/lib/readiness/types";

export interface ScenarioDetail {
  scenarioId: string;
  label: string;
  penetrationCount: number;
  solutionCode: string | null;
  state: ReadinessState;
  reasons: string[];
}

export interface ProductDetail {
  productId: string;
  name: string;
  unit: ProductUnit;
  needed: number;
  allocated: number;
  short: number;
  state: ReadinessState;
  notes: string[];
}

export interface EscalationLinePreview {
  line: EscalationLineDraft;
  description: string;
}

export type EscalationAction =
  { kind: "escalate" } | { kind: "view"; escalationId: string } | { kind: "none" };

export interface PlannedWorkDetail {
  plannedWorkId: string;
  workDate: IsoDate;
  crewName: string;
  siteName: string;
  state: ReadinessState;
  reliesOnDelivery: boolean;
  scenarios: ScenarioDetail[];
  products: ProductDetail[];
  escalation: EscalationAction;
  /** What an escalation raised now would record (spec AC-7.1). */
  escalationLines: EscalationLinePreview[];
}

/**
 * Everything the detail page shows, or null when the planned work does not exist, belongs to
 * someone else, or is in the past (spec FR-6).
 */
export async function getPlannedWorkDetail(
  source: PlannedWorkDetailSource,
  plannedWorkId: string,
  today: IsoDate,
): Promise<PlannedWorkDetail | null> {
  const record = await source.getPlannedWork(plannedWorkId);
  if (!record || record.workDate < today) return null;

  const [demand, supply, openEscalationId] = await Promise.all([
    source.getAllocationDemand(today),
    source.getSupply(),
    source.getOpenEscalationId(plannedWorkId),
  ]);
  // The date check above guarantees computeReadiness returns this planned work.
  const readiness = computeReadiness({
    ownPlannedWork: [record],
    otherDemand: demand,
    supply,
    today,
  })[0]!;

  const productIds = [
    ...new Set([
      ...readiness.products.map((product) => product.productId),
      ...readiness.scenarios.flatMap((scenario) =>
        scenario.reasons.flatMap((reason) => ("productId" in reason ? [reason.productId] : [])),
      ),
    ]),
  ];
  const products = new Map<string, ProductLabel & { id: string }>(
    (await source.getProducts(productIds)).map((product) => [product.id, product]),
  );
  const lookup = (id: string) => products.get(id);
  const solutionCodes = new Map(
    record.scenarios.flatMap((scenario) =>
      scenario.nominatedSolutionId && scenario.solutionCode
        ? [[scenario.nominatedSolutionId, scenario.solutionCode] as const]
        : [],
    ),
  );
  const scenarioRecords = new Map(
    record.scenarios.map((scenario) => [scenario.scenarioId, scenario]),
  );

  const escalation: EscalationAction = openEscalationId
    ? { kind: "view", escalationId: openEscalationId }
    : readiness.state === "ready"
      ? { kind: "none" }
      : { kind: "escalate" };

  return {
    plannedWorkId: record.plannedWorkId,
    workDate: record.workDate,
    crewName: record.crewName,
    siteName: record.siteName,
    state: readiness.state,
    reliesOnDelivery: readiness.reliesOnDelivery,
    scenarios: readiness.scenarios.map((scenario) => {
      const source = scenarioRecords.get(scenario.scenarioId)!;
      return {
        scenarioId: scenario.scenarioId,
        label: source.label,
        penetrationCount: source.penetrationCount,
        solutionCode: source.solutionCode,
        state: scenario.state,
        reasons: [
          ...new Set(
            scenario.reasons.map((reason) => describeReason(reason, lookup, solutionCodes)),
          ),
        ],
      };
    }),
    products: readiness.products.map((product) => {
      const label = products.get(product.productId);
      return {
        productId: product.productId,
        name: label?.name ?? "Unknown product",
        unit: label?.unit ?? "each",
        needed: product.needed,
        allocated: product.allocated,
        short: product.short,
        state: product.state,
        notes: [
          ...product.reasons
            .filter((reason) => reason.kind !== "shortage")
            .map((reason) => describeReason(reason, lookup, solutionCodes)),
          ...product.reliesOnDeliveries.map(describeReliance),
        ],
      };
    }),
    escalation,
    escalationLines: escalationLinesFrom(readiness).map((line) => ({
      line,
      description: describeLine(line, lookup),
    })),
  };
}

function describeLine(
  line: EscalationLineDraft,
  lookup: (id: string) => ProductLabel | undefined,
): string {
  switch (line.reason) {
    case "shortage":
      return describeReason(
        { kind: "shortage", productId: line.productId, quantity: line.quantityShort },
        lookup,
      );
    case "no_stock_record":
      return describeReason({ kind: "no_stock_record", productId: line.productId }, lookup);
    case "no_nominated_solution":
      return "A scenario has no nominated solution";
    case "no_product_requirement":
      return "Product quantities are unknown for a nominated solution";
  }
}
