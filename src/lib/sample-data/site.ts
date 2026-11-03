// SAMPLE site, crews, planned work and supply, tuned so the demo shows every readiness case
// (spec AC-14.4). Dates are offsets from the day the seed is loaded, so the demo never goes stale.
import {
  BACKING_ROD_SKU,
  FIRE_BATT_SKU,
  PIPE_WRAP_SKU,
  SEALANT_SKU,
  collarSku,
} from "../catalogue/sample-products.ts";

export type PersonaRole = "team_leader" | "project_manager";
export type ExpectedState = "ready" | "short" | "unknown" | "past";

export interface SamplePersona {
  id: string;
  email: string;
  displayName: string;
  role: PersonaRole;
}

export interface SampleScenario {
  key: string;
  id: string;
  label: string;
  /** Internal code of the nominated solution, or null for "no nominated solution". */
  nominatedCode: string | null;
  /** Needed only when there is no nominated solution to copy attributes from. */
  attributes?: {
    serviceType: string;
    serviceSize: string;
    orientation: string;
    substrate: string;
    integrityMinutes: number;
    insulationMinutes: number | null;
  };
}

export interface SamplePlannedWork {
  key: string;
  id: string;
  crewId: string;
  dayOffset: number;
  items: { scenarioKey: string; penetrationCount: number }[];
  /** What readiness should show, and why; used by tests and the README demo. */
  expected: ExpectedState;
  note: string;
}

export interface SampleDelivery {
  id: string;
  sku: string;
  quantity: number;
  dayOffset: number;
}

const id = (group: number, n: number) =>
  `a0000000-0000-4000-8${String(group).padStart(3, "0")}-${String(n).padStart(12, "0")}`;

export const SAMPLE_PERSONAS: readonly SamplePersona[] = [
  {
    id: id(1, 1),
    email: "team.leader@example.com",
    displayName: "Sam Taylor (SAMPLE)",
    role: "team_leader",
  },
  {
    id: id(1, 2),
    email: "project.manager@example.com",
    displayName: "Priya Shah (SAMPLE)",
    role: "project_manager",
  },
];

const TEAM_LEADER_ID = id(1, 1);

export const SAMPLE_SITE = { id: id(2, 1), name: "Harbour View Apartments (SAMPLE)" };

export const SAMPLE_CREWS = [
  { id: id(3, 1), name: "Crew Alpha (SAMPLE)", teamLeaderId: TEAM_LEADER_ID },
  { id: id(3, 2), name: "Crew Bravo (SAMPLE)", teamLeaderId: TEAM_LEADER_ID },
] as const;

const [ALPHA, BRAVO] = [SAMPLE_CREWS[0].id, SAMPLE_CREWS[1].id];

export const SAMPLE_SCENARIOS: readonly SampleScenario[] = [
  {
    key: "S1",
    id: id(4, 1),
    label: "Level 2 risers: PVC Ø50 through plasterboard wall",
    nominatedCode: "0798",
  },
  {
    key: "S2",
    id: id(4, 2),
    label: "Level 3 slab: PVC Ø100 through concrete floor",
    nominatedCode: "0521",
  },
  {
    key: "S3",
    id: id(4, 3),
    label: "Plant room: copper Ø100 through plasterboard wall",
    nominatedCode: "0345",
  },
  {
    key: "S4",
    id: id(4, 4),
    label: "Corridor: insulated copper Ø65 through plasterboard wall",
    nominatedCode: "0383",
  },
  {
    key: "S5",
    id: id(4, 5),
    label: "Apartments: PVC conduit Ø50 through plasterboard wall",
    nominatedCode: "0733",
  },
  {
    key: "S6",
    id: id(4, 6),
    label: "Comms room: cable tray 900 × 50 through plasterboard wall",
    nominatedCode: "0646",
  },
  {
    key: "S7",
    id: id(4, 7),
    label: "Stair core: 10 mm linear joint, 1.1 m",
    nominatedCode: "0789",
  },
  {
    key: "S8",
    id: id(4, 8),
    label: "Service void: blank opening 1000 × 1000",
    nominatedCode: "0867",
  },
  {
    key: "S9",
    id: id(4, 9),
    label: "Roof level: glulam timber beam through wall",
    nominatedCode: "0918",
  },
  {
    key: "S10",
    id: id(4, 10),
    label: "Level 4 ceiling: PVC Ø50 (solution not yet nominated)",
    nominatedCode: null,
    attributes: {
      serviceType: "PVC Pipe",
      serviceSize: "Ø50mm",
      orientation: "Ceiling",
      substrate: "Plasterboard Ceiling",
      integrityMinutes: 60,
      insulationMinutes: 60,
    },
  },
  {
    key: "S11",
    id: id(4, 11),
    label: "Basement: PVC Ø65 through concrete floor",
    nominatedCode: "0484",
  },
  {
    key: "S12",
    id: id(4, 12),
    label: "Level 2 slab: PVC Ø50 through concrete floor",
    nominatedCode: "0519",
  },
];

export const SAMPLE_PLANNED_WORK: readonly SamplePlannedWork[] = [
  {
    key: "PW0",
    id: id(5, 0),
    crewId: ALPHA,
    dayOffset: -3,
    items: [{ scenarioKey: "S1", penetrationCount: 10 }],
    expected: "past",
    note: "Already happened: takes no part in allocation.",
  },
  {
    key: "PW1",
    id: id(5, 1),
    crewId: ALPHA,
    dayOffset: 1,
    items: [
      { scenarioKey: "S1", penetrationCount: 6 },
      { scenarioKey: "S12", penetrationCount: 2 },
      { scenarioKey: "S5", penetrationCount: 4 },
    ],
    expected: "ready",
    note: "14 of the 20 Ø50 collars in stock, plus sealant.",
  },
  {
    key: "PW2",
    id: id(5, 2),
    crewId: BRAVO,
    dayOffset: 2,
    items: [
      { scenarioKey: "S2", penetrationCount: 10 },
      { scenarioKey: "S3", penetrationCount: 3 },
    ],
    expected: "short",
    note: "Short by 4 Ø100 collars (6 in stock; next delivery after the work date) and 2 m of wrap (delivery overdue).",
  },
  {
    key: "PW3",
    id: id(5, 3),
    crewId: ALPHA,
    dayOffset: 3,
    items: [{ scenarioKey: "S1", penetrationCount: 8 }],
    expected: "short",
    note: "Needs 16 Ø50 collars; only 6 left after PW1, and the delivery of 10 is due on the work date.",
  },
  {
    key: "PW4",
    id: id(5, 4),
    crewId: BRAVO,
    dayOffset: 5,
    items: [
      { scenarioKey: "S6", penetrationCount: 2 },
      { scenarioKey: "S8", penetrationCount: 1 },
    ],
    expected: "ready",
    note: "Needs 8 fire batts; none in stock, but 10 are due the day before. Relies on delivery.",
  },
  {
    key: "PW5",
    id: id(5, 5),
    crewId: ALPHA,
    dayOffset: 7,
    items: [
      { scenarioKey: "S9", penetrationCount: 1 },
      { scenarioKey: "S7", penetrationCount: 5 },
    ],
    expected: "unknown",
    note: "The timber beam's solution has no product requirement.",
  },
  {
    key: "PW6",
    id: id(5, 6),
    crewId: BRAVO,
    dayOffset: 9,
    items: [
      { scenarioKey: "S10", penetrationCount: 2 },
      { scenarioKey: "S11", penetrationCount: 3 },
    ],
    expected: "unknown",
    note: "One scenario has no nominated solution; the Ø65 collar has no stock record.",
  },
  {
    key: "PW7",
    id: id(5, 7),
    crewId: ALPHA,
    dayOffset: 11,
    items: [{ scenarioKey: "S4", penetrationCount: 4 }],
    expected: "short",
    note: "Needs 2 m of wrap; none in stock and the wrap delivery is overdue.",
  },
];

/** On-hand stock. The Ø65 collar deliberately has no stock record. */
export const SAMPLE_STOCK: readonly { sku: string; quantity: number }[] = [
  { sku: collarSku(32), quantity: 10 },
  { sku: collarSku(50), quantity: 20 },
  { sku: collarSku(100), quantity: 6 },
  { sku: collarSku(150), quantity: 4 },
  { sku: SEALANT_SKU, quantity: 50 },
  { sku: PIPE_WRAP_SKU, quantity: 0 },
  { sku: FIRE_BATT_SKU, quantity: 0 },
  { sku: BACKING_ROD_SKU, quantity: 20 },
];

/** Expected deliveries; none has been received yet. */
export const SAMPLE_DELIVERIES: readonly SampleDelivery[] = [
  { id: id(6, 1), sku: collarSku(50), quantity: 10, dayOffset: 3 },
  { id: id(6, 2), sku: FIRE_BATT_SKU, quantity: 10, dayOffset: 4 },
  { id: id(6, 3), sku: PIPE_WRAP_SKU, quantity: 5, dayOffset: -2 },
  { id: id(6, 4), sku: collarSku(100), quantity: 12, dayOffset: 20 },
];
