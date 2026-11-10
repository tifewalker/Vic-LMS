import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { webOrigins } from "./env.js";
import { requireAuth } from "./middleware/auth.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter, meHandler } from "./routes/auth.js";
import { learnRouter } from "./routes/learn.js";
import { programmesRouter } from "./routes/programmes.js";
import { teachRouter } from "./routes/teach.js";

export const app = express();

app.set("trust proxy", 1); // Render sits behind one proxy; needed for per-IP rate limits.
app.disable("x-powered-by");
app.use(cors({ origin: webOrigins }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRouter);
app.get("/me", requireAuth, meHandler);
app.use("/admin", adminRouter);
app.use("/admin", programmesRouter);
app.use("/tutor", teachRouter);
app.use("/student", learnRouter);

app.use((_req, res) => res.status(404).json({ error: "Not found." }));

const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON." });
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "Upload is too large." });
  res.status(500).json({ error: "Something went wrong. Please try again." });
};
app.use(onError);
