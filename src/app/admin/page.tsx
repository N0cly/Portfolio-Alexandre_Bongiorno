import { db } from "@/lib/db";
import { photos, pageViews, interactions } from "@/lib/db/schema";
import { sql, gte } from "drizzle-orm";

async function getDashboardStats() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [photoCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(photos);
    const [totalViews] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pageViews);
    const [recentViews] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pageViews)
      .where(gte(pageViews.createdAt, sevenDaysAgo));
    const [totalInteractions] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(interactions);
    const [uniqueSessions] = await db
      .select({
        count: sql<number>`count(distinct session_id)::int`,
      })
      .from(pageViews);

    const topPages = await db
      .select({
        path: pageViews.path,
        count: sql<number>`count(*)::int`,
      })
      .from(pageViews)
      .groupBy(pageViews.path)
      .orderBy(sql`count(*) desc`)
      .limit(5);

    return {
      photos: photoCount?.count ?? 0,
      totalViews: totalViews?.count ?? 0,
      recentViews: recentViews?.count ?? 0,
      totalInteractions: totalInteractions?.count ?? 0,
      uniqueSessions: uniqueSessions?.count ?? 0,
      topPages,
    };
  } catch {
    return {
      photos: 0,
      totalViews: 0,
      recentViews: 0,
      totalInteractions: 0,
      uniqueSessions: 0,
      topPages: [],
      dbError: true,
    };
  }
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-light">Dashboard</h1>
        <p className="text-sm text-neutral-500">Vue d'ensemble du site</p>
      </header>

      {"dbError" in stats && stats.dbError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          La base de données n'est pas accessible.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Photos" value={stats.photos} />
        <StatCard label="Vues totales" value={stats.totalViews} />
        <StatCard
          label="Vues 7 derniers jours"
          value={stats.recentViews}
          accent
        />
        <StatCard label="Sessions uniques" value={stats.uniqueSessions} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-sm uppercase tracking-wider text-neutral-500">
            Top pages
          </h2>
          {stats.topPages.length === 0 ? (
            <p className="text-sm text-neutral-400">Aucune donnée</p>
          ) : (
            <ul className="space-y-2">
              {stats.topPages.map((page) => (
                <li
                  key={page.path}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate text-neutral-700">{page.path}</span>
                  <span className="font-medium tabular-nums">{page.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-sm uppercase tracking-wider text-neutral-500">
            Interactions
          </h2>
          <p className="text-4xl font-light">{stats.totalInteractions}</p>
          <p className="mt-2 text-sm text-neutral-500">
            Clics, ouvertures de photos, etc.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        accent
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-200 bg-white"
      }`}
    >
      <p
        className={`text-xs uppercase tracking-wider ${
          accent ? "text-neutral-300" : "text-neutral-500"
        }`}
      >
        {label}
      </p>
      <p className="mt-2 text-4xl font-light tabular-nums">{value}</p>
    </div>
  );
}
