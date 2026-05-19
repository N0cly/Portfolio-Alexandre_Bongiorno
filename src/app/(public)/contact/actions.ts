"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { contactSubmissions } from "@/lib/db/schema";
import { getSiteContent } from "@/lib/site-content";

const formSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(200),
  subject: z.string().max(200).optional(),
  message: z.string().min(10).max(5000),
  // Honeypot : champ caché que les bots remplissent
  website: z.string().max(0).optional(),
});

type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

async function sendEmailIfConfigured(
  to: string,
  data: { name: string; email: string; subject?: string; message: string },
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.log("[contact] Resend not configured, skipping email send");
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: data.email,
        subject: data.subject
          ? `[Portfolio] ${data.subject}`
          : `[Portfolio] Message de ${data.name}`,
        text: `De : ${data.name} <${data.email}>\n\n${data.message}`,
      }),
    });
  } catch (err) {
    console.error("[contact] Resend send failed", err);
  }
}

export async function submitContact(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = formSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject") || undefined,
    message: formData.get("message"),
    website: formData.get("website") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Vérifie les champs : nom, email valide, message d'au moins 10 caractères.",
    };
  }

  // Honeypot triggered → silent success (don't tell the bot)
  if (parsed.data.website) {
    return { ok: true, message: "Message envoyé." };
  }

  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);

    await db.insert(contactSubmissions).values({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject ?? null,
      message: parsed.data.message,
      ipHash,
    });

    const content = await getSiteContent();
    await sendEmailIfConfigured(content.contact.email, {
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });

    return {
      ok: true,
      message:
        "Message bien reçu. Je te recontacte sous 48h.",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur d'enregistrement",
    };
  }
}
