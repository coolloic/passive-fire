import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppLink } from "@/components/atoms/AppLink";
import { ButtonLink } from "@/components/atoms/ButtonLink";
import { ReadinessBadge } from "@/components/atoms/ReadinessBadge";
import { DataFreshness } from "@/components/molecules/DataFreshness";
import { NeedsConnection } from "@/components/molecules/NeedsConnection";
import { ProductReadinessList } from "@/components/organisms/ProductReadinessList";
import { ScenarioReadinessList } from "@/components/organisms/ScenarioReadinessList";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { AppShell } from "@/components/templates/AppShell";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseReadinessDataSource } from "@/lib/data/readiness-repository";
import { formatWorkDate, todayIso } from "@/lib/format/date";
import { logger } from "@/lib/logger";
import { getPlannedWorkDetail, type PlannedWorkDetail } from "@/lib/services/planned-work-detail";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { signOut } from "../../sign-in/actions";

export const metadata: Metadata = { title: "Planned work detail — QAntum Team Leader" };

interface PlannedWorkDetailPageProps {
  params: { id: string };
}

export default async function PlannedWorkDetailPage({ params }: PlannedWorkDetailPageProps) {
  const user = await requireRole("team_leader");
  const asOf = new Date().toISOString();
  let detail: PlannedWorkDetail | null = null;
  let failed = false;
  try {
    detail = await getPlannedWorkDetail(
      createSupabaseReadinessDataSource(createServerSupabaseClient()),
      params.id,
      todayIso(),
    );
  } catch (error) {
    failed = true;
    logger.error("Could not load planned work detail", error, { userId: user.id });
  }
  if (!failed && !detail) notFound();

  return (
    <AppShell
      title={detail ? `${formatWorkDate(detail.workDate)} · ${detail.crewName}` : "Planned work"}
      userName={user.displayName}
      actions={<SignOutButton action={signOut} />}
    >
      <AppLink
        href="/planned-work"
        className="mb-4 inline-flex min-h-11 items-center text-base underline"
      >
        ← Back to planned work
      </AppLink>
      {detail ? <DataFreshness asOf={asOf} /> : null}
      {detail ? (
        <div className="flex max-w-3xl flex-col gap-6">
          <section
            aria-label="Summary"
            className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-medium">{detail.siteName}</p>
              <ReadinessBadge state={detail.state} />
            </div>
            {detail.reliesOnDelivery ? (
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Relies on delivery
              </p>
            ) : null}
            {detail.escalation.kind === "escalate" ? (
              <NeedsConnection
                label="Escalate"
                reason="Escalating needs a connection. Reconnect to escalate."
              >
                <ButtonLink href={`/planned-work/${detail.plannedWorkId}/escalate`}>
                  Escalate
                </ButtonLink>
              </NeedsConnection>
            ) : null}
            {detail.escalation.kind === "view" ? (
              <NeedsConnection label="View open escalation" reason="Escalations need a connection.">
                <ButtonLink
                  href={`/escalations/${detail.escalation.escalationId}`}
                  variant="secondary"
                >
                  View open escalation
                </ButtonLink>
              </NeedsConnection>
            ) : null}
          </section>
          <section aria-labelledby="scenarios-heading" className="flex flex-col gap-3">
            <h2 id="scenarios-heading" className="text-lg font-semibold">
              Scenarios
            </h2>
            <ScenarioReadinessList scenarios={detail.scenarios} />
          </section>
          <section aria-labelledby="products-heading" className="flex flex-col gap-3">
            <h2 id="products-heading" className="text-lg font-semibold">
              Products
            </h2>
            <ProductReadinessList products={detail.products} />
          </section>
        </div>
      ) : (
        <p
          role="alert"
          className="rounded-lg border border-red-700 p-4 text-base text-red-800 dark:text-red-200"
        >
          We couldn&apos;t load this planned work. Refresh the page to try again.
        </p>
      )}
    </AppShell>
  );
}
