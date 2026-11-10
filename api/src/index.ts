import { app } from "./app.js";
import { env } from "./env.js";

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
  if (!env.RESEND_API_KEY) console.log("RESEND_API_KEY not set: emails are printed here instead of sent.");
});
