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

  // ── Security headers ────────────────────────────────────────────────────────
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });

  // ── Body parsing with size limit ────────────────────────────────────────────
  app.use(express.json({ limit: "5mb" }));

  // ── Guest profile — registered directly, never blocked by any middleware ────
  app.patch("/api/auth/guest-profile", async (req: express.Request, res: express.Response) => {
    const { db, supabase } = await import("./server/db.js");
    const { customer_id, name, avatar } = req.body;
    if (!customer_id) { res.status(400).json({ error: "customer_id required" }); return; }
    if (!db.guest_customers) db.guest_customers = [];
    const patch: any = {};
    if (name !== undefined)   patch.name   = name.replace(/[<>"'`;]/g, "").trim().slice(0, 500);
    if (avatar !== undefined) patch.avatar = avatar;
    if (Object.keys(patch).length === 0) { res.json({ success: true }); return; }
    const mem = db.guest_customers.find((c: any) => c.id === customer_id);
    if (mem) Object.assign(mem, patch);
    if (supabase) {
      const { error } = await supabase.from("guest_customers").update(patch).eq("id", customer_id);
      if (error) {
        console.error("[guest-profile] Supabase update failed:", error.message);
        res.status(500).json({ error: error.message }); return;
      }
      console.log(`[guest-profile] Saved for ${customer_id}: name=${patch.name ?? "-"} avatar=${patch.avatar ? "yes" : "-"}`);
    }
    res.json({ success: true });
  });

  app.post("/api/auth/guest-login", async (req: express.Request, res: express.Response) => {
    const { db, supabase } = await import("./server/db.js");
    const { createSession } = await import("./server/middleware.js");
    const phone = (req.body.phone ?? "").trim();
    if (!phone || !/^\d{10}$/.test(phone)) { res.status(400).json({ error: "Valid 10-digit phone required" }); return; }
    if (!db.guest_customers) db.guest_customers = [];
    let customer: any = null;
    let isNew = false;
    if (supabase) {
      const { data, error } = await supabase.from("guest_customers").select("*").eq("phone", phone).maybeSingle();
      if (error) console.error("[guest-login] Supabase lookup error:", error.message);
      if (data) {
        customer = data;
        const idx = db.guest_customers.findIndex((c: any) => c.id === data.id);
        if (idx >= 0) db.guest_customers[idx] = data; else db.guest_customers.push(data);
        console.log(`[guest-login] Returning: ${data.name} | avatar: ${data.avatar ? "yes" : "no"}`);
      } else {
        isNew = true;
        const newCust = { id: `CUST-${Date.now()}`, name: "Customer", phone, avatar: null, created_at: new Date().toISOString() };
        const { data: inserted, error: insertErr } = await supabase.from("guest_customers").insert(newCust).select().single();
        if (insertErr) {
          console.error("[guest-login] Insert failed:", insertErr.message);
          const { data: refetched } = await supabase.from("guest_customers").select("*").eq("phone", phone).maybeSingle();
          customer = refetched || newCust;
          if (refetched) isNew = false;
        } else {
          customer = inserted || newCust;
        }
        const idx = db.guest_customers.findIndex((c: any) => c.id === customer.id);
        if (idx >= 0) db.guest_customers[idx] = customer; else db.guest_customers.push(customer);
      }
    } else {
      customer = db.guest_customers.find((c: any) => c.phone === phone) || null;
      if (!customer) {
        isNew = true;
        customer = { id: `CUST-${Date.now()}`, name: "Customer", phone, avatar: null, created_at: new Date().toISOString() };
        db.guest_customers.push(customer);
      }
    }
    const token = await createSession("Customer", customer.name, customer.id);
    res.json({ success: true, customer_id: customer.id, name: customer.name, avatar: customer.avatar || null, phone, is_new: isNew, sessionToken: token });
  });

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
    app.use(express.static(distPath, { maxAge: "1d" }));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // ── Global error handler ────────────────────────────────────────────────────
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Unhandled Error]", err?.message || err);
    res.status(500).json({ error: "Internal server error" });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} [${process.env.NODE_ENV || "development"}]`);
  });

  // ── Graceful shutdown ───────────────────────────────────────────────────────
  process.on("SIGTERM", () => { httpServer.close(() => process.exit(0)); });
  process.on("SIGINT",  () => { httpServer.close(() => process.exit(0)); });
}

startServer().catch(err => { console.error("Failed to start server:", err); process.exit(1); });
