import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { hashToken, newToken } from "./crypto";
import { LOGIN_TOKEN_MINUTES, SESSION_DAYS } from "./config";

const COOKIE = "le_session";
const { users, sessions, loginTokens } = schema;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Creates a single-use login token. Returns null if this email asked for too many recently. */
export async function createLoginToken(email: string): Promise<string | null> {
  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)::int` })
    .from(loginTokens)
    .where(and(eq(loginTokens.email, email), gt(loginTokens.createdAt, new Date(Date.now() - 15 * 60_000))));
  if (recent >= 5) return null;

  const { token, hash } = newToken();
  await db.insert(loginTokens).values({
    tokenHash: hash,
    email,
    expiresAt: new Date(Date.now() + LOGIN_TOKEN_MINUTES * 60_000),
  });
  return token;
}

/** Atomically consumes a login token. Returns the email it was issued for, or null. */
export async function consumeLoginToken(token: string): Promise<string | null> {
  const rows = await db
    .update(loginTokens)
    .set({ usedAt: new Date() })
    .where(
      and(eq(loginTokens.tokenHash, hashToken(token)), isNull(loginTokens.usedAt), gt(loginTokens.expiresAt, new Date())),
    )
    .returning({ email: loginTokens.email });
  return rows[0]?.email ?? null;
}

export async function peekLoginToken(token: string): Promise<string | null> {
  const row = await db.query.loginTokens.findFirst({
    where: and(eq(loginTokens.tokenHash, hashToken(token)), isNull(loginTokens.usedAt), gt(loginTokens.expiresAt, new Date())),
  });
  return row?.email ?? null;
}

export async function startSession(userId: string): Promise<void> {
  const { token, hash } = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ tokenHash: hash, userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  jar.delete(COOKIE);
}

/** Current user or null. Deduplicated per request. */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
