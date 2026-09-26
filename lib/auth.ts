import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "remindly_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Login/register are temporarily turned off: everyone uses GUEST_SESSION and the
// auth pages redirect to the dashboard. Set to true to re-enable authentication.
export const AUTH_ENABLED = false;

export interface SessionPayload {
  userId: string;
  name: string;
  email: string;
}

export const GUEST_SESSION: SessionPayload = {
  userId: "000000000000000000000000",
  name: "Guest",
  email: "guest@remindly.local",
};

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Please define the JWT_SECRET environment variable inside .env.local");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.userId !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string"
    ) {
      return null;
    }
    return { userId: payload.userId, name: payload.name, email: payload.email };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  if (!AUTH_ENABLED) {
    return GUEST_SESSION;
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}
