import { app } from "./app.js";
import { env } from "./env.js";
import { logError } from "./lib/errors.js";
import { startReminderLoop } from "./lib/reminders.js";
import { checkSchema } from "./lib/schema-check.js";

// No emails are sent: admins create accounts with passwords and reset them from the Users page.
// The email library (lib/email.ts, lib/outbox.ts, pnpm email:test) is kept but unused.
app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
  checkSchema().catch((err) => logError("schema check", err));
  startReminderLoop();
});
