import { db } from "@/lib/db";
import { pageViews, interactions, photos } from "@/lib/db/schema";
import { sql, gte, eq, and } from "drizzle-orm";
import { ResetStatsPanel } from "@/components/admin/ResetStatsPanel";

export const dynamic = "force-dynamic";

async function getDetailedStats() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Vues + visiteurs uniques (session_id distinct) par jour
    const daily = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', created_at), 'YYYY-MM-DD')`,
        views: sql<number>`count(*)::int`,
        uniques: sql<number>`count(distinct ${pageViews.sessionId})::int`,
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, thirtyDaysAgo))
      .groupBy(sql`date_trunc('day', created_at)`)
      .orderBy(sql`date_trunc('day', created_at) asc`);

    // Visiteurs uniques sur 30 j (non sommable depuis le détail journalier)
    const [uniques30dRow] = await db
      .select({
        uniques: sql<number>`count(distinct ${pageViews.sessionId})::int`,
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, thirtyDaysAgo));

    // Aujourd'hui
    const [todayRow] = await db
      .select({
        views: sql<number>`count(*)::int`,
        uniques: sql<number>`count(distinct ${pageViews.sessionId})::int`,
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, todayStart));

    const views30d = daily.reduce((acc, d) => acc + d.views, 0);

    const topReferrers = await db
      .select({
        referrer: pageViews.referrer,
        count: sql<number>`count(*)::int`,
      })
      .from(pageViews)
      .where(sql`referrer is not null and referrer <> ''`)
      .groupBy(pageViews.referrer)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    // Cast photos.id (uuid) -> text pour matcher interactions.target_id (text)
    const topPhotos = await db
      .select({
        photoId: interactions.targetId,
        url: photos.url,
        alt: photos.alt,
        title: photos.title,
        clicks: sql<number>`count(*)::int`,
      })
      .from(interactions)
      .leftJoin(photos, sql`${photos.id}::text = ${interactions.targetId}`)
      .where(
        and(
          eq(interactions.type, "photo_click"),
          eq(interactions.targetType, "photo"),
        ),
      )
      .groupBy(interactions.targetId, photos.url, photos.alt, photos.title)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    return {
      daily,
      summary: {
        views30d,
        uniques30d: uniques30dRow?.uniques ?? 0,
        viewsToday: todayRow?.views ?? 0,
        uniquesToday: todayRow?.uniques ?? 0,
      },
      topReferrers,
      topPhotos,
    };
  } catch (err) {
    return {
      daily: [],
      summary: { views30d: 0, uniques30d: 0, viewsToday: 0, uniquesToday: 0 },
      topReferrers: [],
      topPhotos: [],
      error: err instanceof Error ? err.message : "DB error",
    };
  }
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <p className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-light tabular-nums">
        {value.toLocaleString("fr-FR")}
      </p>
    </div>
  );
}

export default async function StatsPage() {
  const stats = await getDetailedStats();
  const error = "error" in stats ? stats.error : null;
  const maxDailyCount = Math.max(...stats.daily.map((d) => d.views), 1);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-light">Statistiques</h1>
        <p className="text-sm text-neutral-500">
          30 derniers jours · mesure d&apos;audience interne (visiteurs soumis
          au consentement)
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Erreur BDD : {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Vues (30 j)" value={stats.summary.views30d} />
        <StatCard
          label="Visiteurs uniques (30 j)"
          value={stats.summary.uniques30d}
        />
        <StatCard label="Vues aujourd'hui" value={stats.summary.viewsToday} />
        <StatCard
          label="Visiteurs uniques aujourd'hui"
          value={stats.summary.uniquesToday}
        />
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-6 text-sm uppercase tracking-wider text-neutral-500">
          Vues par jour
        </h2>
        {stats.daily.length === 0 ? (
          <p className="text-sm text-neutral-400">Pas encore de données</p>
        ) : (
          <div className="flex h-48 items-end gap-1">
            {stats.daily.map((day) => (
              <div
                key={day.day}
                className="group relative flex-1 rounded-t bg-neutral-200 transition hover:bg-neutral-900"
                style={{
                  height: `${(day.views / maxDailyCount) * 100}%`,
                  minHeight: "2px",
                }}
                title={`${day.day} : ${day.views} vues · ${day.uniques} visiteur(s) unique(s)`}
              >
                <span className="invisible absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-neutral-900 px-2 py-1 text-xs text-white group-hover:visible">
                  {day.views} vues · {day.uniques} uniques
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-sm uppercase tracking-wider text-neutral-500">
            Top sources de trafic
          </h2>
          {stats.topReferrers.length === 0 ? (
            <p className="text-sm text-neutral-400">Aucun referrer enregistré</p>
          ) : (
            <ul className="space-y-2">
              {stats.topReferrers.map((ref) => (
                <li
                  key={ref.referrer}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate text-neutral-700">
                    {ref.referrer}
                  </span>
                  <span className="font-medium tabular-nums">{ref.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-sm uppercase tracking-wider text-neutral-500">
            Photos les plus cliquées
          </h2>
          {stats.topPhotos.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Aucune photo cliquée pour l&apos;instant
            </p>
          ) : (
            <ul className="space-y-2">
              {stats.topPhotos.map((photo) => (
                <li
                  key={photo.photoId}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate text-neutral-700">
                    {photo.title ??
                      photo.alt ??
                      photo.photoId?.slice(0, 8) ??
                      "—"}
                  </span>
                  <span className="font-medium tabular-nums">
                    {photo.clicks}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ResetStatsPanel />
    </div>
  );
}
