import { getBrowserSupabase } from "@/lib/supabase";
import type { AuthUser } from "@/lib/auth-server";

export async function getAccessToken() {
  const supabase = getBrowserSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers, credentials: "same-origin" });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await authFetch("/api/auth/me", { cache: "no-store" });
  if (!response.ok) return null;
  const json = await response.json() as { user?: AuthUser };
  return json.user ?? null;
}
