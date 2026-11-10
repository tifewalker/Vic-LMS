import type { NextFunction, Request, Response } from "express";
import { admin, type Profile, type Role } from "../supabase.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by requireAuth. */
      profile?: Profile;
    }
  }
}

/**
 * Verifies the Supabase access token (Bearer) and loads the profile.
 * Suspended users get 403. The role always comes from the database.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Please sign in." });

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: "Your session has ended. Please sign in again." });

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, full_name, email, status, created_at")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) return res.status(401).json({ error: "Please sign in." });
  if (profile.status === "suspended") {
    return res.status(403).json({ error: "Your account is suspended. Contact the programme admin." });
  }

  req.profile = profile as Profile;
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.profile || !roles.includes(req.profile.role)) {
      return res.status(403).json({ error: "You do not have access to this." });
    }
    next();
  };
}
