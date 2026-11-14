import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env.js";
import { admin } from "../supabase.js";
import { brand } from "./brand.js";
import { dailyCap as capFor, utcDay } from "./warmup.js";


/**
 * All email goes through here. One provider (EMAIL_PROVIDER: smtp, resend or console), every
 * attempt logged in email_log with its outcome, and every send held to the daily cap (which ramps
 * up during warm-up) and EMAIL_RATE_PER_MINUTE.
 *
 * Every email has a plain-text and an HTML part, no attachments, and at most one link.
 */

export type Kind = "invite" | "password_reset" | "test";
export type Email = { to: string; subject: string; html: string; text: string; kind: Kind };

/** Thrown when a send does not go through. `bounced` means the server refused the address itself. */
export class EmailError extends Error {
  constructor(
    message: string,
    readonly bounced: boolean,
  ) {
    super(message);
  }
}

/* Daily cap and warm-up */

/** Today's cap from the warm-up ramp and EMAIL_DAILY_LIMIT. */
export const dailyCap = (now: Date) => capFor(now, env.EMAIL_WARMUP_START, env.EMAIL_DAILY_LIMIT);

function startOfTodayUtc(): string {
  return new Date(utcDay(new Date())).toISOString();
}

/** Attempts that reached the mail server since `since`. Failed connections do not count. */
async function countDelivered(since: string): Promise<number> {
  const { count, error } = await admin
    .from("email_log")
    .select("id", { count: "exact", head: true })
    .gte("sent_at", since)
    .in("status", ["sent", "bounced"]);
  if (error) throw error;
  return count ?? 0;
}

/** Emails that reached the mail server today (UTC). */
export const sentToday = () => countDelivered(startOfTodayUtc());

export async function emailsRemainingToday(): Promise<number> {
  return Math.max(0, dailyCap(new Date()).cap - (await sentToday()));
}

/** How many emails may go out right now: the smaller of what is left today and this minute. */
export async function sendBudget(): Promise<number> {
  const [today, lastMinute] = await Promise.all([
    emailsRemainingToday(),
    countDelivered(new Date(Date.now() - 60_000).toISOString()),
  ]);
  return Math.max(0, Math.min(today, env.EMAIL_RATE_PER_MINUTE - lastMinute));
}

/* Providers */

let smtp: Transporter | null = null;
function smtpTransport(): Transporter {
  smtp ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    // Refuse to send the password over an unencrypted connection.
    requireTLS: !env.SMTP_SECURE,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  return smtp;
}

/** SMTP reply codes 550 to 554 on the recipient mean the address itself was refused. */
function isBounce(err: unknown): boolean {
  const e = err as { responseCode?: number; command?: string; code?: string };
  return e.code === "EENVELOPE" || (typeof e.responseCode === "number" && e.responseCode >= 550 && e.responseCode <= 554 && e.command !== "AUTH" && e.command !== "CONN");
}

async function deliver(email: Email): Promise<void> {
  const replyTo = env.EMAIL_REPLY_TO;
  switch (env.EMAIL_PROVIDER) {
    case "console":
      console.log(`\n[email:${email.kind}] to ${email.to}\nFrom: ${env.EMAIL_FROM}${replyTo ? `\nReply-To: ${replyTo}` : ""}\nSubject: ${email.subject}\n${email.text}\n`);
      return;
    case "resend": {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
      });
      if (!res.ok) throw new EmailError(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status === 422);
      return;
    }
    case "smtp": {
      try {
        const info = await smtpTransport().sendMail({
          from: env.EMAIL_FROM,
          to: email.to,
          replyTo,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });
        if (info.rejected?.length) throw new EmailError(`Recipient refused: ${String(info.response).slice(0, 300)}`, true);
      } catch (err) {
        if (err instanceof EmailError) throw err;
        throw new EmailError(err instanceof Error ? err.message.slice(0, 300) : "SMTP error", isBounce(err));
      }
      return;
    }
  }
}

/** Sends one email and logs the outcome. Throws EmailError when it does not go through. */
export async function sendEmail(email: Email): Promise<void> {
  let status: "sent" | "failed" | "bounced" = "sent";
  let error: string | null = null;
  try {
    await deliver(email);
  } catch (err) {
    const e = err instanceof EmailError ? err : new EmailError(String(err), false);
    status = e.bounced ? "bounced" : "failed";
    error = e.message.slice(0, 500);
    throw e;
  } finally {
    const { error: logError } = await admin
      .from("email_log")
      .insert({ kind: email.kind, to_email: email.to, status, error, provider: env.EMAIL_PROVIDER });
    if (logError) console.error("email_log insert failed", logError.message);
  }
}

/** Checks the SMTP login and connection without sending anything. */
export async function verifyProvider(): Promise<void> {
  if (env.EMAIL_PROVIDER === "smtp") await smtpTransport().verify();
}

/* Templates: plain, on the site's paper and clay palette. One link each, no images. No em dashes. */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const SERIF = "Georgia,'Times New Roman',serif";

/** The HTML part. `button` is the only link in the email; leave it out for an email with no link. */
function layout(heading: string, paragraphs: string[], footer: string, button?: { label: string; url: string }): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f1d1a">${esc(p)}</p>`)
    .join("");
  return [
    `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(heading)}</title></head>`,
    `<body style="margin:0;background:#f5f1e8;font-family:Arial,Helvetica,sans-serif">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e8;padding:32px 16px"><tr><td align="center">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #d8d0c0;border-radius:4px">`,
    `<tr><td style="padding:28px 32px 8px;font-family:${SERIF};font-size:15px;color:#5f5a51">${esc(brand.operator)}</td></tr>`,
    `<tr><td style="padding:8px 32px 0">`,
    `<h1 style="margin:0 0 20px;font-family:${SERIF};font-weight:400;font-size:26px;line-height:1.2;color:#1f1d1a">${esc(heading)}</h1>`,
    body,
    button
      ? `<p style="margin:24px 0 28px"><a href="${esc(button.url)}" style="display:inline-block;background:#a0573b;color:#f5f1e8;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:2px">${esc(button.label)}</a></p>`
      : "",
    `</td></tr>`,
    `<tr><td style="padding:16px 32px 28px;border-top:1px solid #d8d0c0;font-size:13px;line-height:1.6;color:#5f5a51">${esc(footer)}</td></tr>`,
    `</table></td></tr></table></body></html>`,
  ].join("");
}

/** The plain-text part, built from the same pieces so both parts always say the same thing. */
function plain(greeting: string, before: string[], footer: string, action?: { label: string; url: string }, after: string[] = []): string {
  return [greeting, ...before, ...(action ? [`${action.label}: ${action.url}`] : []), ...after, footer, brand.operator].join("\n\n");
}

/** Subject lines all start with the action and end with the organisation name. */
export const subjects = {
  invite: `Activate your ${brand.operator} account`,
  password_reset: `Reset your ${brand.operator} password`,
  test: `Test email from ${brand.operator}`,
} as const satisfies Record<Kind, string>;

export function inviteEmail(p: { to: string; firstName: string; url: string; signInWith: string }): Email {
  const intro = `An account has been created for you on the ${brand.operator} training platform for the ${brand.programme}.`;
  const how = `Set your password to activate it. After that you can sign in with ${p.signInWith}.`;
  const expiry = "This link works once and expires in 72 hours.";
  const footer = "If you were not expecting this email, you can ignore it.";
  const action = { label: "Set your password", url: p.url };
  return {
    kind: "invite",
    to: p.to,
    subject: subjects.invite,
    html: layout(`Hello ${p.firstName}`, [intro, how, expiry], footer, action),
    text: plain(`Hello ${p.firstName},`, [intro, how], footer, action, [expiry]),
  };
}

export function resetEmail(p: { to: string; firstName: string; url: string }): Email {
  const intro = `We received a request to reset the password for your ${brand.operator} account.`;
  const expiry = "This link works once and expires in 1 hour.";
  const footer = "If you did not ask to reset your password, you can ignore this email. Your password will not change.";
  const action = { label: "Choose a new password", url: p.url };
  return {
    kind: "password_reset",
    to: p.to,
    subject: subjects.password_reset,
    html: layout(`Hello ${p.firstName}`, [intro, expiry], footer, action),
    text: plain(`Hello ${p.firstName},`, [intro], footer, action, [expiry]),
  };
}

export function testEmail(p: { to: string }): Email {
  const intro = `This is a test email from the ${brand.operator} training platform.`;
  const how = `It was sent through the ${env.EMAIL_PROVIDER} provider. If you can read it, email is set up correctly.`;
  const footer = "No action is needed.";
  return {
    kind: "test",
    to: p.to,
    subject: subjects.test,
    html: layout("Email is working", [intro, how], footer),
    text: plain("Hello,", [intro, how], footer),
  };
}

export const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || fullName;
