import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { PlannedWorkDetailSource } from "@/lib/data/readiness-repository";
import { formatWorkDate } from "@/lib/format/date";
import type { IsoDate } from "@/lib/readiness/types";
import { getPlannedWorkDetail } from "@/lib/services/planned-work-detail";
import { getPlannedWorkSummaries } from "@/lib/services/planned-work-summaries";

export interface AssistantToolContext {
  /** The signed-in team leader's data source: the assistant sees exactly what they can see. */
  source: PlannedWorkDetailSource;
  today: IsoDate;
  /** When the data was generated, quoted back in answers. */
  asOf: string;
}

const NOT_FOUND = JSON.stringify({
  error: "No planned work with that id is visible to this user.",
});

/** Plain functions behind each tool, so they can be tested without the SDK. */
export function createToolHandlers({ source, today, asOf }: AssistantToolContext) {
  return {
    async listPlannedWork(): Promise<string> {
      const summaries = await getPlannedWorkSummaries(source, today);
      return JSON.stringify({
        asOf,
        plannedWork: summaries.map((summary) => ({
          plannedWorkId: summary.plannedWorkId,
          date: formatWorkDate(summary.workDate),
          crew: summary.crewName,
          site: summary.siteName,
          scenarios: summary.scenarioCount,
          readiness: summary.state,
          reliesOnDelivery: summary.reliesOnDelivery,
        })),
      });
    },

    async getReadiness(plannedWorkId: string): Promise<string> {
      const detail = await getPlannedWorkDetail(source, plannedWorkId, today);
      if (!detail) return NOT_FOUND;
      return JSON.stringify({
        asOf,
        date: formatWorkDate(detail.workDate),
        crew: detail.crewName,
        site: detail.siteName,
        readiness: detail.state,
        reliesOnDelivery: detail.reliesOnDelivery,
        scenarios: detail.scenarios.map((scenario) => ({
          label: scenario.label,
          penetrations: scenario.penetrationCount,
          nominatedSolution: scenario.solutionCode,
          readiness: scenario.state,
          reasons: scenario.reasons,
        })),
      });
    },

    async getShortages(plannedWorkId: string): Promise<string> {
      const detail = await getPlannedWorkDetail(source, plannedWorkId, today);
      if (!detail) return NOT_FOUND;
      return JSON.stringify({
        asOf,
        date: formatWorkDate(detail.workDate),
        crew: detail.crewName,
        products: detail.products.map((product) => ({
          product: product.name,
          unit: product.unit,
          needed: product.needed,
          allocated: product.allocated,
          short: product.short,
          notes: product.notes,
        })),
        escalationWouldRecord: detail.escalationLines.map((line) => line.description),
      });
    },

    async getExpectedDeliveries(): Promise<string> {
      const supply = await source.getSupply();
      const products = new Map(
        (
          await source.getProducts([
            ...new Set(supply.deliveries.map((delivery) => delivery.productId)),
          ])
        ).map((product) => [product.id, product.name]),
      );
      return JSON.stringify({
        asOf,
        today: formatWorkDate(today),
        deliveries: supply.deliveries
          .filter((delivery) => !delivery.received)
          .map((delivery) => ({
            product: products.get(delivery.productId) ?? "Unknown product",
            quantity: delivery.quantity,
            expected: formatWorkDate(delivery.expectedDate),
            overdue: delivery.expectedDate < today,
          })),
      });
    },
  };
}

const plannedWorkIdInput = z.object({
  plannedWorkId: z.string().describe("The plannedWorkId from list_planned_work."),
});

/** Read-only tools for the tool runner (spec AC-11.2). */
export function createAssistantTools(context: AssistantToolContext) {
  const handlers = createToolHandlers(context);
  return [
    betaZodTool({
      name: "list_planned_work",
      description:
        "List the team leader's planned work for today and the next 13 days, with readiness.",
      inputSchema: z.object({}),
      run: () => handlers.listPlannedWork(),
    }),
    betaZodTool({
      name: "get_readiness",
      description: "Readiness of one planned work, with each scenario's state and the reasons.",
      inputSchema: plannedWorkIdInput,
      run: (input) => handlers.getReadiness(input.plannedWorkId),
    }),
    betaZodTool({
      name: "get_shortages",
      description: "Products one planned work needs: needed, allocated and short, with notes.",
      inputSchema: plannedWorkIdInput,
      run: (input) => handlers.getShortages(input.plannedWorkId),
    }),
    betaZodTool({
      name: "get_expected_deliveries",
      description: "Expected deliveries that have not arrived yet, including overdue ones.",
      inputSchema: z.object({}),
      run: () => handlers.getExpectedDeliveries(),
    }),
  ];
}
