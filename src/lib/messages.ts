import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { contactSubmissions } from "./db/schema";

export async function getUnreadMessagesCount(): Promise<number> {
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactSubmissions)
      .where(eq(contactSubmissions.status, "new"));
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}
