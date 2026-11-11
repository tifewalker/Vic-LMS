import { env } from "../env.js";
import { brand } from "./brand.js";
import { admin } from "../supabase.js";

/**
 * All email goes through here: sent with Resend, logged in email_log and counted
 * against EMAIL_DAILY_LIMIT. Without RESEND_API_KEY the email is printed to the console.
 */

type Kind = "invite" | "password_reset";
type Email = { to: string; subject: string; html: string; text: string; kind: Kind };

function startOfTodayUtc(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function emailsRemainingToday(): Promise<number> {
  const { count, error } = await admin
    .from("email_log")
    .select("id", { count: "exact", head: true })
    .gte("sent_at", startOfTodayUtc());
  if (error) throw error;
  return Math.max(0, env.EMAIL_DAILY_LIMIT - (count ?? 0));
}

export async function sendEmail(email: Email): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.log(`\n[email:${email.kind}] to ${email.to}\nSubject: ${email.subject}\n${email.text}\n`);
  } else {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: email.to, subject: email.subject, html: email.html, text: email.text }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const { error } = await admin.from("email_log").insert({ kind: email.kind, to_email: email.to });
  if (error) console.error("email_log insert failed", error.message);
}

/* Templates: plain, on the site's paper and clay palette. No em dashes. */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const SERIF = "Georgia,'Times New Roman',serif";

function layout(heading: string, paragraphs: string[], button: { label: string; url: string }, footer: string): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f1d1a">${p}</p>`)
    .join("");
  return [
    `<!doctype html><html lang="en-GB"><body style="margin:0;background:#f5f1e8;font-family:Arial,Helvetica,sans-serif">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e8;padding:32px 16px"><tr><td align="center">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #d8d0c0;border-radius:4px">`,
    `<tr><td style="padding:28px 32px 8px;font-family:${SERIF};font-size:15px;color:#5f5a51">${brand.operator}</td></tr>`,
    `<tr><td style="padding:8px 32px 0">`,
    `<h1 style="margin:0 0 20px;font-family:${SERIF};font-weight:400;font-size:26px;line-height:1.2;color:#1f1d1a">${heading}</h1>`,
    body,
    `<p style="margin:24px 0"><a href="${button.url}" style="display:inline-block;background:#a0573b;color:#f5f1e8;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:2px">${button.label}</a></p>`,
    `<p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#5f5a51">If the button does not work, copy this link into your browser:<br><a href="${button.url}" style="color:#8a4630;word-break:break-all">${button.url}</a></p>`,
    `</td></tr>`,
    `<tr><td style="padding:16px 32px 28px;border-top:1px solid #d8d0c0;font-size:13px;line-height:1.6;color:#5f5a51">${footer}</td></tr>`,
    `</table></td></tr></table></body></html>`,
  ].join("");
}

export function inviteEmail(p: { to: string; firstName: string; url: string; signInWith: string }): Email {
  const intro =
    `An account has been created for you on the ${brand.operator} training platform for the ${brand.programme}.`;
  const how = `Set your password to activate it. After that you can sign in with ${p.signInWith}.`;
  const expiry = "This link works once and expires in 72 hours.";
  const footer = "If you were not expecting this email, you can ignore it.";
  return {
    kind: "invite",
    to: p.to,
    subject: `Activate your ${brand.operator} account`,
    html: layout(`Hello ${esc(p.firstName)}`, [esc(intro), esc(how), esc(expiry)], { label: "Set your password", url: p.url }, esc(footer)),
    text: `Hello ${p.firstName},\n\n${intro}\n\n${how}\n\nSet your password: ${p.url}\n\n${expiry}\n\n${footer}`,
  };
}

export function resetEmail(p: { to: string; firstName: string; url: string }): Email {
  const intro = `We received a request to reset the password for your ${brand.operator} account.`;
  const expiry = "This link works once and expires in 1 hour.";
  const footer = "If you did not ask to reset your password, you can ignore this email. Your password will not change.";
  return {
    kind: "password_reset",
    to: p.to,
    subject: `Reset your ${brand.operator} password`,
    html: layout(`Hello ${esc(p.firstName)}`, [esc(intro), esc(expiry)], { label: "Choose a new password", url: p.url }, esc(footer)),
    text: `Hello ${p.firstName},\n\n${intro}\n\nChoose a new password: ${p.url}\n\n${expiry}\n\n${footer}`,
  };
}

export const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || fullName;
