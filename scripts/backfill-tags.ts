import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { photos } from "../src/lib/db/schema";

async function main() {
  console.log("Migration des catégories vers tags…");

  // Copie category dans tags si tags est vide et category n'est pas null
  const result = await db.execute(sql`
    update ${photos}
    set tags = array[${photos.category}]
    where ${photos.category} is not null
      and ${photos.category} <> ''
      and (array_length(${photos.tags}, 1) is null or array_length(${photos.tags}, 1) = 0)
  `);

  const count =
    (result as unknown as { rowCount?: number }).rowCount ?? "?";
  console.log(`✓ ${count} photo(s) migrée(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
