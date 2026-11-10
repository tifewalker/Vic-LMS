import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

const options = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service role client: bypasses RLS. Server only. */
export const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);

/** A fresh anon client per sign-in, so sessions never leak between requests. */
export function anonClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, options);
}

export type Role = "student" | "tutor" | "admin" | "super_admin";
export type ProfileStatus = "invited" | "active" | "suspended";

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  email: string;
  status: ProfileStatus;
  created_at: string;
};
