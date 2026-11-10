import { app } from "./app.js";
import { env } from "./env.js";

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
  if (!env.RESEND_API_KEY) console.log("RESEND_API_KEY not set: emails are printed here instead of sent.");
  else if (env.EMAIL_FROM.includes("@resend.dev")) {
    console.warn("EMAIL_FROM uses resend.dev: Resend will only deliver to your own account address. Set EMAIL_FROM on a verified domain.");
  }
});
