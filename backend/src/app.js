import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiRouter from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api", apiRouter);

  app.use((req, res) => {
    res.status(404).json({ error: "Route introuvable." });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  });

  return app;
}
