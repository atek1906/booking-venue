import { NextRequest } from "next/server";
import { UserRole, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createRouteSupabase, isSupabaseConfigured } from "@/lib/supabase";

export type AuthUser = Pick<User, "id" | "authUserId" | "name" | "email" | "role">;

function unauthorized(message = "Login diperlukan") {
  return new Error(message);
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser> {
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
