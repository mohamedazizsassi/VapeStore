import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "vs_session";
const TTL_SECONDS = 12 * 60 * 60;

export type Session = { userId: string; role: "owner" | "worker"; name: string };

function secret(): Uint8Array {
  const s = process.env.AUTH_JWT_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_JWT_SECRET must be ≥16 chars");
  return new TextEncoder().encode(s);
}

export async function issueSession(s: Session): Promise<string> {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.userId !== "string" || typeof payload.name !== "string") return null;
    if (payload.role !== "owner" && payload.role !== "worker") return null;
    return { userId: payload.userId, role: payload.role, name: payload.name };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export function clearSessionCookie(): void {
  cookies().delete(COOKIE_NAME);
}

export async function readSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireSession(): Promise<Session> {
  const s = await readSession();
  if (!s) throw new Error("unauthorized");
  return s;
}

export async function requireOwner(): Promise<Session> {
  const s = await requireSession();
  if (s.role !== "owner") throw new Error("forbidden");
  return s;
}
