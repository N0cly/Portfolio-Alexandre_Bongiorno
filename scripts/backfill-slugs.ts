import { config } from "dotenv";
config({ path: ".env.local" });

import { isNull, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { photos } from "../src/lib/db/schema";
import { buildSlug } from "../src/lib/slug";

async function main() {
  const rows = await db
    .select({ id: photos.id, title: photos.title, alt: photos.alt })
    .from(photos)
    .where(isNull(photos.slug));

  if (rows.length === 0) {
    console.log("Tous les slugs sont déjà remplis.");
    return;
  }

  console.log(`Backfill de ${rows.length} photo(s)…`);

  let count = 0;
  for (const row of rows) {
    const text = row.title || row.alt || "photo";
    const slug = buildSlug(text, row.id);
    await db.update(photos).set({ slug }).where(eq(photos.id, row.id));
    count++;
    console.log(`  ${row.id.slice(0, 8)} → ${slug}`);
  }

  console.log(`\n✓ ${count} slug(s) générés.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
