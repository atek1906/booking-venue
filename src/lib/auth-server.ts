import crypto from "crypto";
import { NextRequest } from "next/server";
import { UserRole, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createRouteSupabase, isSupabaseConfigured } from "@/lib/supabase";

export type AuthUser = Pick<User, "id" | "authUserId" | "name" | "email" | "role">;

export const DEMO_SESSION_COOKIE = "courtbook_demo_session";
const DEMO_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type DemoSessionPayload = {
  email: string;
  exp: number;
};

function unauthorized(message = "Login diperlukan") {
  return new Error(message);
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function isDemoAuthEnabled() {
  return !isProduction() && process.env.DEMO_AUTH_ENABLED === "true";
}

function getDemoAuthSecret() {
  return process.env.DEMO_AUTH_SECRET;
}

function base64Url(input: string) {
  return Buffer.from(input).toString("base64url");
}

function signPayload(encodedPayload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createDemoSessionCookie(email: string) {
  const secret = getDemoAuthSecret();
  if (!secret) throw new Error("DEMO_AUTH_SECRET belum dikonfigurasi");

  const payload: DemoSessionPayload = {
    email: email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + DEMO_SESSION_TTL_SECONDS
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload, secret)}`;
}

function readDemoSessionCookie(request: NextRequest): DemoSessionPayload | null {
  if (!isDemoAuthEnabled()) return null;

  const secret = getDemoAuthSecret();
  const cookie = request.cookies.get(DEMO_SESSION_COOKIE)?.value;
  if (!secret || !cookie) return null;

  const [encodedPayload, signature] = cookie.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = signPayload(encodedPayload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as DemoSessionPayload;
    if (!payload.email || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function upsertDemoUser(email: string): Promise<AuthUser> {
  const normalizedEmail = email.toLowerCase();
  const name = normalizedEmail.split("@")[0] || "Customer";
  return prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { role: UserRole.CUSTOMER },
    create: {
      name,
      email: normalizedEmail,
      role: UserRole.CUSTOMER
    },
    select: { id: true, authUserId: true, name: true, email: true, role: true }
  });
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser> {
  const demoSession = readDemoSessionCookie(request);
  if (demoSession) return upsertDemoUser(demoSession.email);

  if (!isSupabaseConfigured()) throw unauthorized("Supabase Auth belum dikonfigurasi");

  const supabase = createRouteSupabase(request);
  if (!supabase) throw unauthorized("Supabase Auth belum dikonfigurasi");

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data, error } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
  const authUser = data.user;
  if (error || !authUser?.email) throw unauthorized("Sesi login tidak valid");

  const email = authUser.email.toLowerCase();
  const name = authUser.user_metadata?.name || email.split("@")[0] || "Customer";

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { authUserId: authUser.id },
        { email }
      ]
    }
  });

  if (existing) {
    if (!existing.authUserId) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { authUserId: authUser.id },
        select: { id: true, authUserId: true, name: true, email: true, role: true }
      });
    }
    return {
      id: existing.id,
      authUserId: existing.authUserId,
      name: existing.name,
      email: existing.email,
      role: existing.role
    };
  }

  return prisma.user.create({
    data: {
      authUserId: authUser.id,
      name,
      email,
      role: UserRole.CUSTOMER
    },
    select: { id: true, authUserId: true, name: true, email: true, role: true }
  });
}

export function requireRole(user: AuthUser, roles: UserRole[]) {
  if (!roles.includes(user.role)) throw unauthorized("Akses tidak diizinkan");
}
