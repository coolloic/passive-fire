import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupabaseEscalationRepository } from "@/lib/data/escalation-repository";
import { createSupabaseReadinessDataSource } from "@/lib/data/readiness-repository";
import { SAMPLE_PERSONAS, SAMPLE_PLANNED_WORK } from "@/lib/sample-data/site";
import { addEscalationNote, raiseEscalation } from "@/lib/services/escalations";
import { admin, createPersona, isoDate, signInAsDemo, type Persona } from "./support";

const pw = (key: string) => SAMPLE_PLANNED_WORK.find((work) => work.key === key)!.id;
const email = (role: string) => SAMPLE_PERSONAS.find((persona) => persona.role === role)!.email;

let leader: SupabaseClient;
let manager: SupabaseClient;
let stranger: Persona;
const deps = (client: SupabaseClient) => ({
  readiness: createSupabaseReadinessDataSource(client),
  escalations: createSupabaseEscalationRepository(client),
});

beforeAll(async () => {
  leader = await signInAsDemo(email("team_leader"));
  manager = await signInAsDemo(email("project_manager"));
  stranger = await createPersona("team_leader", "Unrelated leader");
});

afterAll(async () => {
  await admin
    .from("escalations")
    .delete()
    .in(
      "planned_work_id",
      SAMPLE_PLANNED_WORK.map((work) => work.id),
    );
  await admin.auth.admin.deleteUser(stranger.id);
});

describe("raising an escalation", () => {
  const id = randomUUID();

  it("creates it with server-computed lines and the note, in one step", async () => {
    const result = await raiseEscalation(
      deps(leader),
      { id, plannedWorkId: pw("PW3"), note: " Need by Friday " },
      isoDate(0),
    );
    expect(result).toEqual({ kind: "created", escalationId: id });

    const record = await createSupabaseEscalationRepository(leader).get(id);
    expect(record).toMatchObject({
      state: "open",
      crewName: "Crew Alpha (SAMPLE)",
      shortageClearedAtSync: false,
    });
    expect(record?.lines).toEqual([
      {
        productName: "Intumescent pipe collar 50 mm (SAMPLE)",
        unit: "each",
        quantityShort: 10,
        reason: "shortage",
      },
    ]);
    expect(record?.notes.map((note) => [note.body, note.authorName])).toEqual([
      ["Need by Friday", "Sam Taylor (SAMPLE)"],
    ]);
  });

  it("treats a retry with the same id as a duplicate", async () => {
    await expect(
      raiseEscalation(deps(leader), { id, plannedWorkId: pw("PW3") }, isoDate(0)),
    ).resolves.toEqual({
      kind: "duplicate",
      escalationId: id,
    });
  });

  it("refuses a second open escalation for the same planned work, pointing to the first", async () => {
    await expect(
      raiseEscalation(deps(leader), { id: randomUUID(), plannedWorkId: pw("PW3") }, isoDate(0)),
    ).resolves.toEqual({
      kind: "already_open",
      escalationId: id,
    });
  });

  it("records missing facts for Unknown work", async () => {
    const unknownId = randomUUID();
    await raiseEscalation(deps(leader), { id: unknownId, plannedWorkId: pw("PW6") }, isoDate(0));
    const record = await createSupabaseEscalationRepository(leader).get(unknownId);
    expect(record?.lines.map((line) => line.reason).sort()).toEqual([
      "no_nominated_solution",
      "no_stock_record",
    ]);
  });

  it("flags an escalation raised for work that is now Ready", async () => {
    const readyId = randomUUID();
    await raiseEscalation(deps(leader), { id: readyId, plannedWorkId: pw("PW1") }, isoDate(0));
    const record = await createSupabaseEscalationRepository(leader).get(readyId);
    expect(record).toMatchObject({ shortageClearedAtSync: true, lines: [] });
  });

  it("is not found for another team leader, who also cannot read it", async () => {
    await expect(
      raiseEscalation(
        deps(stranger.client),
        { id: randomUUID(), plannedWorkId: pw("PW2") },
        isoDate(0),
      ),
    ).resolves.toEqual({
      kind: "not_found",
    });
    await expect(createSupabaseEscalationRepository(stranger.client).get(id)).resolves.toBeNull();
  });
});

describe("tracking escalations", () => {
  it("lists the team leader's escalations newest first", async () => {
    const mine = await createSupabaseEscalationRepository(leader).listMine();
    expect(mine.length).toBeGreaterThanOrEqual(3);
    expect(
      mine.every((escalation) => escalation.siteName === "Harbour View Apartments (SAMPLE)"),
    ).toBe(true);
    const times = mine.map((escalation) => escalation.raisedAt);
    expect([...times].sort().reverse()).toEqual(times);
  });

  it("lets the raiser and the project manager add notes, but not a stranger", async () => {
    const [latest] = await createSupabaseEscalationRepository(leader).listMine();
    const id = latest!.id;
    await expect(
      addEscalationNote(createSupabaseEscalationRepository(leader), {
        escalationId: id,
        body: "Any update?",
      }),
    ).resolves.toEqual({
      kind: "added",
    });
    await expect(
      addEscalationNote(createSupabaseEscalationRepository(manager), {
        escalationId: id,
        body: "Chasing",
      }),
    ).resolves.toEqual({
      kind: "added",
    });
    await expect(
      addEscalationNote(createSupabaseEscalationRepository(stranger.client), {
        escalationId: id,
        body: "Hi",
      }),
    ).resolves.toEqual({
      kind: "not_found",
    });
    const record = await createSupabaseEscalationRepository(leader).get(id);
    expect(record?.notes.map((note) => note.authorName)).toEqual(
      expect.arrayContaining(["Sam Taylor (SAMPLE)", null]),
    );
  });
});
