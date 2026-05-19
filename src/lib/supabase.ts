import { createServerClient } from "@supabase/ssr";
import { type NextRequest } from "next/server";
import { createClient as createBrowserClient } from "@/utils/supabase/client";

export function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  };
}

export function isSupabaseConfigured() {
  const { url, publishableKey } = getSupabaseConfig();
  return Boolean(url && publishableKey);
}

export function getBrowserSupabase() {
  return createBrowserClient();
}

export function createRouteSupabase(request: NextRequest) {
  const { url, publishableKey } = getSupabaseConfig();
  if (!url || !publishableKey) return null;

  return createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Route handlers read the refreshed cookies written by middleware.
        }
      }
    }
  );
}
