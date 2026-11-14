import { app } from "./app.js";
import { env } from "./env.js";
import { drainOutbox } from "./lib/outbox.js";

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
  if (env.EMAIL_PROVIDER === "console") console.log("EMAIL_PROVIDER is console: emails are printed here instead of sent.");
  else console.log(`Email: ${env.EMAIL_PROVIDER}${env.EMAIL_PROVIDER === "smtp" ? ` via ${env.SMTP_HOST}:${env.SMTP_PORT}` : ""}.`);
  if (env.EMAIL_PROVIDER === "resend" && env.EMAIL_FROM.includes("@resend.dev")) {
    console.warn("EMAIL_FROM uses resend.dev: Resend will only deliver to your own account address. Set EMAIL_FROM on a verified domain.");
  }
  if (env.EMAIL_PROVIDER !== "console" && !env.EMAIL_REPLY_TO) console.warn("EMAIL_REPLY_TO is not set: replies go to the From address.");
});

// The outbox sends queued emails as the daily cap and the per-minute rate allow.
setInterval(() => {
  drainOutbox().catch((err) => console.error("outbox run failed", err));
}, 60_000).unref();
