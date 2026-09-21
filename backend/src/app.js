import "express-async-errors";
import express from "express";
import cors from "cors";
import apiRouter from "./routes/index.js";

export function createApp() {
  const app = express();
  // Derrière le proxy Render : sans ça, req.ip serait toujours celle du proxy.
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    })
  );
  // Limite relevée par rapport au défaut (100kb) : les illustrations
  // d'exercice sont envoyées en data URL (base64) dans le JSON.
  app.use(express.json({ limit: "6mb" }));

  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api", apiRouter);

  app.use((req, res) => {
    res.status(404).json({ error: "Route introuvable." });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.code === "TENANT_FORBIDDEN") {
      return res.status(404).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  });

  return app;
}
