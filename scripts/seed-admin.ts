import { config } from "dotenv";
config({ path: ".env.local" });

import { hash } from "bcryptjs";
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env.local before running this script.",
    );
    process.exit(1);
  }

  if (password.length < 10) {
    console.error("SEED_ADMIN_PASSWORD must be at least 10 characters.");
    process.exit(1);
  }

  const passwordHash = await hash(password, 12);
  const [inserted] = await db
    .insert(users)
    .values({ email, passwordHash, role: "admin" })
    .onConflictDoNothing({ target: users.email })
    .returning();

  if (inserted) {
    console.log(`Admin user created: ${inserted.email}`);
  } else {
    console.log(`User ${email} already exists — no changes made.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
