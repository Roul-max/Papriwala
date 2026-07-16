import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import apiRoutes from "./server/api.js";
import { handleWebSocketConnection } from "./server/ws.js";
import { bootstrapDb } from "./server/db.js";

async function startServer() {
  await bootstrapDb();
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // API Routes
  app.use("/api", apiRoutes);

  const httpServer = createServer(app);

  // WebSocket Setup
  const wss = new WebSocketServer({ server: httpServer, path: "/api/ws" });
  wss.on("connection", handleWebSocketConnection);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
