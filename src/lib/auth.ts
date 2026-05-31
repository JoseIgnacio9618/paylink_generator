import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import type { UserRecord } from "@/lib/types";
import { createUserSession, deleteSessionByToken, getUserBySessionToken } from "@/lib/users";

export const SESSION_COOKIE_NAME = "paylink_session";

function getCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return getUserBySessionToken(token);
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireSuperadminUser() {
  const user = await requireAuthenticatedUser();

  if (user.role !== "superadmin") {
    redirect("/");
  }

  return user;
}

export function setUserSessionCookie(response: NextResponse, user: UserRecord) {
  const session = createUserSession(user.id);

  response.cookies.set(
    SESSION_COOKIE_NAME,
    session.token,
    getCookieOptions(session.maxAgeSeconds),
  );

  return session;
}

export async function clearCurrentSessionCookie(response: NextResponse) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    deleteSessionByToken(token);
  }

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getCookieOptions(0),
    maxAge: 0,
  });
}
