import { publicEnv } from "./env";
import { supabase } from "./supabase";

export type Role = "student" | "tutor" | "admin" | "super_admin";

export type Me = {
  id: string;
  role: Role;
  full_name: string;
  email: string;
  status: "invited" | "active" | "suspended";
  matric_no: string | null;
  tutor_id: string | null;
};

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: string };

/** Calls the API, attaching the Supabase access token when signed in. Never throws. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};
  const { data } = await supabase().auth.getSession();
  if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  if (init.body !== undefined) headers["Content-Type"] = "application/json";

  try {
    const res = await fetch(`${publicEnv().NEXT_PUBLIC_API_URL}${path}`, {
      method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "Something went wrong. Please try again." };
    return { ok: true, status: res.status, data: json as T };
  } catch {
    return { ok: false, status: 0, error: "Could not reach the server. Check your connection and try again." };
  }
}

export function homeFor(role: Role): string {
  if (role === "admin" || role === "super_admin") return "/admin/";
  if (role === "tutor") return "/tutor/";
  return "/student/";
}

export async function signOut() {
  await supabase().auth.signOut();
  window.location.replace("/login/");
}
