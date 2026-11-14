/**
 * Sends one test email through the configured provider.
 *   pnpm email:test you@address
 * It is logged in email_log and counts against today's cap like any other email.
 */
import { env } from "../env.js";
import { EmailError, dailyCap, emailsRemainingToday, sendEmail, testEmail, verifyProvider } from "../lib/email.js";

const to = process.argv.slice(2).find((a) => !a.startsWith("-"));
if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  console.error("Usage: pnpm email:test you@address");
  process.exit(1);
}

const { cap, warmupDay } = dailyCap(new Date());
console.log(`Provider: ${env.EMAIL_PROVIDER}${env.EMAIL_PROVIDER === "smtp" ? ` (${env.SMTP_HOST}:${env.SMTP_PORT}, ${env.SMTP_SECURE ? "TLS" : "STARTTLS"})` : ""}`);
console.log(`From: ${env.EMAIL_FROM}`);
console.log(`Reply-To: ${env.EMAIL_REPLY_TO ?? "(not set)"}`);
console.log(`Today's cap: ${cap}${warmupDay ? ` (warm-up day ${warmupDay})` : ""}`);

try {
  if ((await emailsRemainingToday()) <= 0) throw new Error("Today's email cap is reached. Try again tomorrow.");
  await verifyProvider();
  await sendEmail(testEmail({ to }));
  console.log(env.EMAIL_PROVIDER === "console" ? "Printed above (console provider, nothing sent)." : `Sent to ${to}.`);
  process.exit(0);
} catch (err) {
  const bounced = err instanceof EmailError && err.bounced;
  console.error(`${bounced ? "Address refused" : "Not sent"}: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
