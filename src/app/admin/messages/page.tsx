import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contactSubmissions } from "@/lib/db/schema";
import { MessagesList } from "@/components/admin/MessagesList";

export const dynamic = "force-dynamic";

type Filter = "all" | "new" | "read" | "replied" | "archived";

const filterLabels: Record<Filter, string> = {
  all: "Tous",
  new: "Nouveaux",
  read: "Lus",
  replied: "Répondus",
  archived: "Archivés",
};

async function getMessages(filter: Filter) {
  try {
    const query = db
      .select()
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt));
    if (filter !== "all") {
      return await query.where(eq(contactSubmissions.status, filter));
    }
    return await query;
  } catch {
    return [];
  }
}

async function getCounts() {
  try {
    const rows = await db
      .select({
        status: contactSubmissions.status,
        count: sql<number>`count(*)::int`,
      })
      .from(contactSubmissions)
      .groupBy(contactSubmissions.status);
    const counts: Record<string, number> = {
      all: 0,
      new: 0,
      read: 0,
      replied: 0,
      archived: 0,
    };
    for (const row of rows) {
      counts[row.status] = row.count;
      counts.all += row.count;
    }
    return counts;
  } catch {
    return { all: 0, new: 0, read: 0, replied: 0, archived: 0 };
  }
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: filterParam } = await searchParams;
  const filter: Filter = (
    ["all", "new", "read", "replied", "archived"] as const
  ).includes(filterParam as Filter)
    ? (filterParam as Filter)
    : "new";

  const [messages, counts] = await Promise.all([
    getMessages(filter),
    getCounts(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-light">Messages</h1>
        <p className="text-sm text-neutral-500">
          Demandes reçues depuis le formulaire de contact.
        </p>
      </header>

      {/* Filtres */}
      <nav className="flex flex-wrap gap-2">
        {(Object.keys(filterLabels) as Filter[]).map((f) => (
          <Link
            key={f}
            href={f === "new" ? "/admin/messages" : `/admin/messages?filter=${f}`}
            className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.2em] transition ${
              filter === f
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900"
            }`}
          >
            {filterLabels[f]}
            <span className="ml-2 opacity-60">{counts[f]}</span>
          </Link>
        ))}
      </nav>

      {messages.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center text-sm text-neutral-500">
          Aucun message dans cette catégorie.
        </p>
      ) : (
        <MessagesList
          messages={messages.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            subject: m.subject,
            message: m.message,
            status: m.status,
            createdAt: m.createdAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}
