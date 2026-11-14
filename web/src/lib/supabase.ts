import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "./env";

/**
 * Browser Supabase client (anon key). Holds the session in localStorage and refreshes it.
 * Sign-in itself happens through the API; the session it returns is stored here.
 */
let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    const env = publicEnv();
    client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}

export async function storeSession(session: { access_token: string; refresh_token: string }) {
  const { error } = await supabase().auth.setSession(session);
  if (error) throw error;
}
