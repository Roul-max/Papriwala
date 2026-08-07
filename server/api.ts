import { roleAuthMiddleware, createSession, destroySession, checkRateLimit, resetRateLimit, getSession } from "./middleware.js";
import { Router } from "express";
import { db, supabase, dbSelect, dbInsert, dbUpdate, dbDelete } from "./db.js";
import { broadcast } from "./ws.js";
import bcrypt from "bcryptjs";

const router = Router();

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}/;

const otpStore = new Map<string, { otp: string; expires: number; employeeId: string }>();

// ── Input sanitization helper ─────────────────────────────────────────────────────
function sanitize(val: any): string {
  if (typeof val !== "string") return "";
  return val.replace(/[<>"'`;]/g, "").trim().slice(0, 500);
}

// ─── Auth (public, no middleware) ────────────────────────────────────────────

router.post("/auth/login", async (req, res) => {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const { allowed } = checkRateLimit(ip);
  if (!allowed)
    return res.status(429).json({ error: "Too many failed attempts. Please try again later." });

  const { username, password, role } = req.body;
  const u = (username ?? "").trim();
  const p = (password ?? "").trim();

  if (role === "Admin" && u === "admin") {
    if (!db.adminPasswordHash)
      return res.status(401).json({ error: "Admin password not set. Please set it first." });

    const isMatch = await bcrypt.compare(p, db.adminPasswordHash);
    if (isMatch) {
      resetRateLimit(ip);
      const token = await createSession("Admin", "Super Admin");
      return res.json({ success: true, role: "Admin", name: db.settings?.adminName || "Super Admin", sessionToken: token, avatar: db.settings?.adminAvatar || null });
    }
  }

  if (role === "Employee") {
    const employees = await dbSelect("employees", db.employees);
    const emp = employees.find(
      (e: any) => e.name?.toLowerCase() === u.toLowerCase() && e.phone_number === p
    );
    if (emp) {
      resetRateLimit(ip);
      const token = await createSession(emp.designation_tag, emp.name, emp.id);
      if (!db.employee_sessions) db.employee_sessions = [];
      const sess = {
        id: crypto.randomUUID(),
        employee_id: emp.id,
        login_time: new Date().toISOString(),
        logout_time: null,
        session_token: token,
      };
      await dbInsert("employee_sessions", sess, db.employee_sessions);
      return res.json({
        success: true,
        role: emp.designation_tag,
        name: emp.name,
        employee_id: emp.id,
        avatar: emp.avatar || null,
        permissions: db.settings?.permissions?.[emp.designation_tag] || {},
        sessionToken: token,
      });
    }
  }

  res.status(401).json({ error: "Invalid credentials" });
});

router.post("/auth/set-password", async (req, res) => {
  if (db.adminPasswordHash)
    return res.status(403).json({ error: "Password already set. Use change-password instead." });

  const { new_pass } = req.body;
  if (!new_pass || !PASSWORD_REGEX.test(new_pass))
    return res.status(400).json({ error: "Password must be 8+ chars with upper, lower, number and special character." });

  db.adminPasswordHash = await bcrypt.hash(new_pass, 12);
  if (supabase)
    await supabase.from("settings").upsert({ id: 1, value: { ...db.settings, adminPasswordHash: db.adminPasswordHash } });

  res.json({ success: true });
});

router.post("/auth/send-otp", async (req, res) => {
  const phone = (req.body.phone ?? "").trim();
  if (!phone) return res.status(400).json({ error: "Phone number required" });

  const employees = await dbSelect("employees", db.employees);
  const emp = employees.find((e: any) => e.phone_number === phone);
  if (!emp) return res.status(404).json({ error: "No employee found with this phone number" });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(phone, { otp, expires: Date.now() + 5 * 60 * 1000, employeeId: emp.id });
  // TODO: Integrate a real SMS provider (e.g. Twilio, MSG91) to send OTP
  // For now OTP is logged server-side only — never expose it in the API response
  console.log(`[OTP] Phone: ${phone} | OTP: ${otp} | Employee: ${emp.name}`);
  res.json({ success: true, message: "OTP sent to registered number" });
});

router.post("/auth/verify-otp", async (req, res) => {
  const phone = (req.body.phone ?? "").trim();
  const otp   = (req.body.otp   ?? "").trim();
  const entry = otpStore.get(phone);

  if (!entry) return res.status(400).json({ error: "No OTP requested for this number" });
  if (Date.now() > entry.expires) {
    otpStore.delete(phone);
    return res.status(400).json({ error: "OTP expired. Please request a new one." });
  }
  if (entry.otp !== otp) return res.status(401).json({ error: "Invalid OTP" });

  otpStore.delete(phone);
  const employees = await dbSelect("employees", db.employees);
  const emp = employees.find((e: any) => e.id === entry.employeeId);
  if (!emp) return res.status(404).json({ error: "Employee not found" });

  const token = await createSession(emp.designation_tag, emp.name, emp.id);
  res.json({
    success: true,
    role: emp.designation_tag,
    name: emp.name,
    employee_id: emp.id,
    permissions: db.settings?.permissions?.[emp.designation_tag] || {},
    sessionToken: token,
  });
});

// Guest login — mobile customers enter phone only, auto-registered as new customer
router.post("/auth/guest-login", async (req, res) => {
  const phone = (req.body.phone ?? "").trim();
  if (!phone || !/^\d{10}$/.test(phone)) return res.status(400).json({ error: "Valid 10-digit phone required" });

  if (!db.guest_customers) db.guest_customers = [];

  let customer: any = null;
  let isNew = false;

  if (supabase) {
    // Always fetch from Supabase — source of truth for name + avatar
    const { data, error } = await supabase.from("guest_customers").select("*").eq("phone", phone).maybeSingle();
    if (error) console.error("[guest-login] Supabase lookup error:", error.message);

    if (data) {
      // Returning customer — sync to memory
      customer = data;
      const idx = db.guest_customers.findIndex((c: any) => c.id === data.id);
      if (idx >= 0) db.guest_customers[idx] = data; else db.guest_customers.push(data);
      console.log(`[guest-login] Returning customer: ${data.name} | avatar: ${data.avatar ? 'yes' : 'no'}`);
    } else {
      // New customer — insert into Supabase
      isNew = true;
      const newCust = { id: `CUST-${Date.now()}`, name: "Customer", phone, avatar: null, created_at: new Date().toISOString() };
      const { data: inserted, error: insertErr } = await supabase.from("guest_customers").insert(newCust).select().single();
      if (insertErr) {
        console.error("[guest-login] Insert failed:", insertErr.message);
        // Conflict: phone already exists — re-fetch
        const { data: refetched } = await supabase.from("guest_customers").select("*").eq("phone", phone).maybeSingle();
        customer = refetched || newCust;
        if (refetched) isNew = false;
      } else {
        customer = inserted || newCust;
      }
      const idx = db.guest_customers.findIndex((c: any) => c.id === customer.id);
      if (idx >= 0) db.guest_customers[idx] = customer; else db.guest_customers.push(customer);
      console.log(`[guest-login] New customer created: ${customer.id}`);
    }
  } else {
    // No Supabase — use in-memory
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

// Update guest customer name and/or avatar — persists across logins
router.patch("/auth/guest-profile", async (req, res) => {
  const { customer_id, name, avatar } = req.body;
  if (!customer_id) return res.status(400).json({ error: "customer_id required" });
  if (!db.guest_customers) db.guest_customers = [];

  const patch: any = {};
  if (name !== undefined)   patch.name   = sanitize(name);
  if (avatar !== undefined) patch.avatar = avatar;
  if (Object.keys(patch).length === 0) return res.json({ success: true });

  // Update in-memory (if present)
  const mem = db.guest_customers.find((c: any) => c.id === customer_id);
  if (mem) Object.assign(mem, patch);

  // Always update Supabase — this is the source of truth
  if (supabase) {
    const { error } = await supabase.from("guest_customers").update(patch).eq("id", customer_id);
    if (error) {
      console.error("[guest-profile] Supabase update failed:", error.message);
      return res.status(500).json({ error: error.message });
    }
    console.log(`[guest-profile] Saved for ${customer_id}: name=${patch.name ?? '-'} avatar=${patch.avatar ? 'yes' : '-'}`);
  }
  res.json({ success: true });
});

router.post("/auth/forbidden-alert", (req, res) => {
  const { path, role } = req.body;
  broadcast({ type: "FORBIDDEN_ACCESS_ATTEMPT", payload: { path, role, timestamp: new Date().toISOString() } });
  res.json({ ok: true });
});

router.post("/auth/logout", async (req, res) => {
  const token = req.header("X-Session-Token") || "";
  if (token) {
    await destroySession(token);
    const logoutTime = new Date().toISOString();
    if (supabase) {
      try {
        await supabase
          .from("employee_sessions")
          .update({ logout_time: logoutTime })
          .eq("session_token", token)
          .is("logout_time", null);
      } catch {}
    }
    if (db.employee_sessions) {
      const s = db.employee_sessions.find((s: any) => s.session_token === token && !s.logout_time);
      if (s) s.logout_time = logoutTime;
    }
  }
  res.json({ success: true });
});

// ─── Self-profile endpoint (any authenticated employee) ─────────────────────
router.get("/auth/me", async (req: any, res) => {
  const token = req.header("X-Session-Token") || "";
  if (!token) return res.status(401).json({ error: "No token" });
  const session = await getSession(token);
  if (!session) return res.status(401).json({ error: "Invalid session" });
  if (!session.employeeId) return res.json({ name: session.name, avatar: null });
  const employees = await dbSelect("employees", db.employees);
  const emp = employees.find((e: any) => e.id === session.employeeId);
  if (!emp) return res.status(404).json({ error: "Not found" });
  res.json({ name: emp.name || emp.full_name || "", avatar: emp.avatar || null });
});

// ─── Apply auth middleware ────────────────────────────────────────────────────
router.use(roleAuthMiddleware);

// ─── Health ───────────────────────────────────────────────────────────────────
router.get("/health", (_req, res) => res.json({ status: "ok", supabase: !!supabase }));

// ─── Products ────────────────────────────────────────────────────────────────
router.get("/products", async (_req, res) => {
  res.json(await dbSelect("products", db.products));
});

router.get("/products/:id", async (req, res) => {
  const products = await dbSelect("products", db.products);
  const product = products.find((p: any) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Not found" });
  res.json(product);
});

router.post("/products", async (req, res) => {
  const session = (req as any).session;
  const { name, category, price, sku, unit, current_stock_qty, unit_purchase_cost, safety_low_threshold, image } = req.body;
  if (!name || !category) return res.status(400).json({ error: "name and category are required" });
  const newProduct = {
    id: `PRD-${Date.now()}`,
    name: sanitize(name),
    category: sanitize(category),
    price: Number(price) || 0,
    sku: sanitize(sku || ""),
    unit: sanitize(unit || "pcs"),
    image: sanitize(image || ""),
    unit_purchase_cost: Number(unit_purchase_cost) || 0,
    safety_low_threshold: Number(safety_low_threshold) || 5,
    current_stock_qty: Number(current_stock_qty) || 0,
  };
  const saved = await dbInsert("products", newProduct, db.products);
  await dbInsert("inventory_log", {
    id: crypto.randomUUID(),
    type: "STOCK_IN",
    product_id: saved.id,
    product_name: saved.name,
    qty: saved.current_stock_qty,
    reason: "Initial Stock",
    operator: session?.name || "Admin",
    timestamp: new Date().toISOString(),
  }, db.inventory_log);
  res.json(saved);
});

router.delete("/products/:id", async (req, res) => {
  await dbDelete("products", req.params.id);
  const idx = db.products.findIndex((p: any) => p.id === req.params.id);
  if (idx !== -1) db.products.splice(idx, 1);
  res.json({ success: true });
});

router.patch("/products/:id", async (req, res) => {
  const updated = await dbUpdate("products", req.params.id, req.body);
  const local = db.products.find((p: any) => p.id === req.params.id);
  if (local) Object.assign(local, req.body);
  res.json(updated);
});

// ─── Stock adjustments ───────────────────────────────────────────────────────
router.post("/products/:id/stock", async (req, res) => {
  const session = (req as any).session;
  const products = await dbSelect("products", db.products);
  const product = products.find((p: any) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Not found" });

  const { type, qty, reason } = req.body;
  const amount = Number(qty);

  if (type === "out" && product.current_stock_qty - amount < 0)
    return res.status(400).json({ error: "Stock cannot go below zero" });

  const newQty = product.current_stock_qty + (type === "in" ? amount : -amount);
  await dbUpdate("products", product.id, { current_stock_qty: newQty });

  const local = db.products.find((p: any) => p.id === product.id);
  if (local) local.current_stock_qty = newQty;

  await dbInsert("inventory_log", {
    id: crypto.randomUUID(),
    type: type === "in" ? "STOCK_IN" : "STOCK_OUT",
    product_id: product.id,
    product_name: product.name,
    qty: amount,
    reason: reason || "",
    operator: session?.name || "Admin",
    timestamp: new Date().toISOString(),
  }, db.inventory_log);

  if (newQty === 0) {
    const prod = db.products.find((p: any) => p.id === product.id);
    if (!prod?.muted) broadcast({ type: "INVENTORY_DEPLETED", payload: { product_id: product.id, sku_code: product.sku, remaining_qty: 0 } });
  } else if (newQty > 0 && newQty <= product.safety_low_threshold) {
    const prod = db.products.find((p: any) => p.id === product.id);
    if (!prod?.muted) broadcast({ type: "LOW_STOCK_ALERT", payload: { product_id: product.id, product_name: product.name, sku_code: product.sku, remaining_qty: newQty } });
  }

  res.json({ ...product, current_stock_qty: newQty });
});

// ─── Inventory log ───────────────────────────────────────────────────────────
router.get("/inventory-log", async (_req, res) => {
  res.json(await dbSelect("inventory_log", db.inventory_log));
});

// ─── Orders ──────────────────────────────────────────────────────────────────
router.get("/orders", async (req, res) => {
  const all = await dbSelect("orders", db.orders);
  const sorted = all.sort((a: any, b: any) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime());
  const { customer_id } = req.query;
  res.json(customer_id ? sorted.filter((o: any) => o.customer_id === customer_id) : sorted);
});

router.post("/orders", async (req, res) => {
  const session = (req as any).session;
  const ts = Date.now();
  const newOrder = {
    ...req.body,
    id: `INV-${new Date().getFullYear()}-${ts.toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
  };
  const saved = await dbInsert("orders", newOrder, db.orders);

  // ── Deduct stock for each item in the order ───────────────────────────────
  const products = await dbSelect("products", db.products);
  for (const item of (saved.items || [])) {
    const qty = Number(item.qty) || 1;
    // Match product by name (case-insensitive)
    const product = products.find((p: any) =>
      p.name?.toLowerCase() === item.name?.toLowerCase()
    );
    if (!product) continue;
    const newQty = Math.max(0, Number(product.current_stock_qty) - qty);
    await dbUpdate("products", product.id, { current_stock_qty: newQty });
    const local = db.products.find((p: any) => p.id === product.id);
    if (local) local.current_stock_qty = newQty;
    await dbInsert("inventory_log", {
      id: crypto.randomUUID(),
      type: "STOCK_OUT",
      product_id: product.id,
      product_name: product.name,
      qty,
      reason: `Order ${saved.id}`,
      operator: session?.name || "Customer",
      timestamp: new Date().toISOString(),
    }, db.inventory_log);
    // Fire alerts
    if (newQty === 0) {
      if (!local?.muted) broadcast({ type: "INVENTORY_DEPLETED", payload: { product_id: product.id, sku_code: product.sku, remaining_qty: 0 } });
    } else if (newQty <= product.safety_low_threshold) {
      if (!local?.muted) broadcast({ type: "LOW_STOCK_ALERT", payload: { product_id: product.id, product_name: product.name, sku_code: product.sku, remaining_qty: newQty } });
    }
  }

  if (saved.order_source !== "Direct POS") {
    broadcast({ type: "INBOUND_QR_ORDER", payload: { order_id: saved.id, table_number: saved.table_id || "Delivery", bill_amount: saved.grand_total } });
  }
  res.json(saved);
});

router.patch("/orders/:id", async (req, res) => {
  const orders = await dbSelect("orders", db.orders);
  const order = orders.find((o: any) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Not found" });

  await dbUpdate("orders", req.params.id, req.body);
  const local = db.orders.find((o: any) => o.id === req.params.id);
  if (local) Object.assign(local, req.body);

  broadcast({ type: "TABLE_STATE_CHANGE", payload: { table_id: order.table_id, new_status_flag: req.body.order_status } });
  res.json({ ...order, ...req.body });
});

// ─── Void (soft-delete) an order ─────────────────────────────────────────────
router.patch("/orders/:id/void", async (req, res) => {
  const session = (req as any).session;
  const orders = await dbSelect("orders", db.orders);
  const order = orders.find((o: any) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Not found" });
  const patch = { order_status: "Void", voided_by: session?.name || "Unknown", voided_at: new Date().toISOString() };
  await dbUpdate("orders", req.params.id, patch);
  const local = db.orders.find((o: any) => o.id === req.params.id);
  if (local) Object.assign(local, patch);
  res.json({ success: true });
});

// ─── Omni-Search ─────────────────────────────────────────────────────────────
router.get("/search", async (req, res) => {
  const query = req.query.q?.toString().toLowerCase() || "";
  if (query.length < 2) return res.json({ products: [], dealers: [], employees: [] });

  const [products, dealers, employees] = await Promise.all([
    dbSelect("products", db.products),
    dbSelect("dealers", db.dealers),
    dbSelect("employees", db.employees),
  ]);

  res.json({
    products:  products.filter((p: any) => p.name?.toLowerCase().includes(query) || p.sku?.toLowerCase().includes(query) || p.id?.toLowerCase().includes(query)),
    dealers:   dealers.filter((d: any) => d.name?.toLowerCase().includes(query) || d.gstin?.toLowerCase().includes(query)),
    employees: employees.filter((e: any) => e.name?.toLowerCase().includes(query) || e.full_name?.toLowerCase().includes(query) || e.id?.toLowerCase().includes(query)),
  });
});

// ─── Dealers ─────────────────────────────────────────────────────────────────
router.get("/dealers", async (_req, res) => {
  res.json(await dbSelect("dealers", db.dealers));
});

router.post("/dealers", async (req, res) => {
  const { name, address, gstin, phone } = req.body;
  if (!name || !gstin || !phone) return res.status(400).json({ error: "name, gstin and phone are required" });
  res.json(await dbInsert("dealers", {
    id: crypto.randomUUID(),
    name: sanitize(name),
    address: sanitize(address || ""),
    gstin: sanitize(gstin),
    phone: sanitize(phone),
  }, db.dealers));
});

router.delete("/dealers/:id", async (req, res) => {
  await dbDelete("dealers", req.params.id);
  const idx = db.dealers.findIndex((d: any) => d.id === req.params.id);
  if (idx !== -1) db.dealers.splice(idx, 1);
  res.json({ success: true });
});

router.post("/dealers/:id/invoice-due", async (req, res) => {
  const dealers = await dbSelect("dealers", db.dealers);
  const dealer = dealers.find((d: any) => d.id === req.params.id);
  if (!dealer) return res.status(404).json({ error: "Not found" });

  const { amount_due, expiry_date } = req.body;
  broadcast({ type: "DEALER_INVOICE_DUE", payload: { dealer_id: dealer.id, dealer_name: dealer.name, amount_due, expiry_date } });
  res.json({ ok: true });
});

// ─── Expenses ────────────────────────────────────────────────────────────────
router.get("/expenses", async (_req, res) => {
  res.json(await dbSelect("expenses", db.expenses));
});

router.post("/expenses", async (req, res) => {
  const { expense_code, amount, dealer_id, description } = req.body;
  const validCodes = ["EXP_RAW_MATERIAL", "EXP_SALARY_DRAW", "EXP_MISC_OPERATIONAL"];
  if (!expense_code || !validCodes.includes(expense_code)) return res.status(400).json({ error: "Invalid expense_code" });
  if (!amount || Number(amount) <= 0) return res.status(400).json({ error: "Valid amount required" });
  res.json(await dbInsert("expenses", {
    id: crypto.randomUUID(),
    expense_code,
    amount: Number(amount),
    dealer_id: dealer_id || null,
    description: sanitize(description || ""),
    expense_date: new Date().toISOString(),
  }, db.expenses));
});

// ─── Employees ───────────────────────────────────────────────────────────────
router.get("/employees", async (_req, res) => {
  res.json(await dbSelect("employees", db.employees));
});

router.post("/employees", async (req, res) => {
  const { full_name, name, designation_tag, phone_number, salary_type_flag, base_compensation_rate, joining_date, last_working_date, avatar } = req.body;
  if (!designation_tag || !joining_date) return res.status(400).json({ error: "designation_tag and joining_date are required" });
  if (phone_number && !/^\d{10}$/.test(phone_number)) return res.status(400).json({ error: "Phone must be 10 digits" });
  res.json(await dbInsert("employees", {
    id: `EMP-${Date.now()}`,
    name: sanitize(name || full_name || ""),
    full_name: sanitize(full_name || name || ""),
    designation_tag: sanitize(designation_tag),
    phone_number: phone_number || null,
    salary_type_flag: ["Monthly", "Daily"].includes(salary_type_flag) ? salary_type_flag : "Monthly",
    base_compensation_rate: Number(base_compensation_rate) || 0,
    joining_date,
    last_working_date: last_working_date || null,
    avatar: avatar || null,
  }, db.employees));
});

router.delete("/employees/:id", async (req, res) => {
  await dbDelete("employees", req.params.id);
  const idx = db.employees.findIndex((e: any) => e.id === req.params.id);
  if (idx !== -1) db.employees.splice(idx, 1);
  res.json({ success: true });
});

router.patch("/employees/:id", async (req, res) => {
  const { name, full_name, avatar } = req.body;
  const patch: Record<string, any> = {};
  if (name)                 patch.name      = name;
  if (full_name)            patch.full_name = full_name;
  if (avatar !== undefined) patch.avatar    = avatar;

  const updated = await dbUpdate("employees", req.params.id, patch);
  const local = db.employees.find((e: any) => e.id === req.params.id);
  if (local) Object.assign(local, patch);
  res.json(updated);
});

// ─── Attendance ──────────────────────────────────────────────────────────────
router.get("/attendance", async (req, res) => {
  const date = req.query.date?.toString();
  const all = await dbSelect("attendance", db.attendance);
  res.json(date ? all.filter((a: any) => a.calendar_date === date) : all);
});

router.post("/attendance", async (req, res) => {
  const { employee_id, calendar_date, status_flag } = req.body;

  if (supabase) {
    const { data: existing } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employee_id)
      .eq("calendar_date", calendar_date)
      .single();

    if (existing) {
      const { data } = await supabase.from("attendance").update({ status_flag }).eq("id", existing.id).select().single();
      return res.json(data);
    }
  } else {
    const existing = db.attendance.find((a: any) => a.employee_id === employee_id && a.calendar_date === calendar_date);
    if (existing) { existing.status_flag = status_flag; return res.json(existing); }
  }

  res.json(await dbInsert("attendance", { id: crypto.randomUUID(), employee_id, calendar_date, status_flag }, db.attendance));
});

// ─── Settings ────────────────────────────────────────────────────────────────
router.get("/settings", async (_req, res) => {
  if (supabase) {
    const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
    if (data) return res.json(data.value ?? db.settings);
  }
  res.json(db.settings);
});

router.post("/settings", async (req, res) => {
  db.settings = { ...db.settings, ...req.body };
  if (supabase) await supabase.from("settings").upsert({ id: 1, value: db.settings });
  res.json(db.settings);
});

// ─── Admin avatar / name persist ─────────────────────────────────────────────
router.patch("/auth/update-avatar", async (req, res) => {
  const { avatar, name } = req.body;
  const patch: any = {};
  if (avatar !== undefined) patch.adminAvatar = avatar;  // null clears it
  if (name   !== undefined) patch.adminName   = sanitize(name);
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: "avatar or name required" });
  db.settings = { ...db.settings, ...patch };
  if (supabase) {
    const { error } = await supabase.from("settings").upsert({ id: 1, value: db.settings });
    if (error) { console.error("[update-avatar] Supabase upsert failed:", error.message); return res.status(500).json({ error: error.message }); }
  }
  res.json({ success: true });
});

// ─── Change password ──────────────────────────────────────────────────────────
router.post("/auth/change-password", async (req, res) => {
  const { current_pass, new_pass } = req.body;
  if (!current_pass || !new_pass) return res.status(400).json({ error: "Missing fields" });
  if (!PASSWORD_REGEX.test(new_pass)) return res.status(400).json({ error: "Password does not meet complexity requirements" });
  if (!db.adminPasswordHash) return res.status(400).json({ error: "No password set yet." });

  const isMatch = await bcrypt.compare(current_pass, db.adminPasswordHash);
  if (!isMatch) return res.status(401).json({ error: "Current password is incorrect" });

  db.adminPasswordHash = await bcrypt.hash(new_pass, 12);
  if (supabase)
    await supabase.from("settings").upsert({ id: 1, value: { ...db.settings, adminPasswordHash: db.adminPasswordHash } });

  res.json({ success: true });
});

// ─── Raw Material Due-Soon Alerts ───────────────────────────────────────────
router.get("/raw-material-purchases/due-alerts", async (_req, res) => {
  if (!db.raw_material_purchases) db.raw_material_purchases = [];
  const all = await dbSelect("raw_material_purchases", db.raw_material_purchases);
  const today = new Date().toISOString().split("T")[0];
  const twoDaysLater = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const dealers = await dbSelect("dealers", db.dealers);

  const dueSoon = all.filter((r: any) => !r.is_paid && r.due_date && r.due_date >= today && r.due_date <= twoDaysLater);
  const overdue = all.filter((r: any) => !r.is_paid && r.due_date && r.due_date < today);

  // Broadcast WebSocket notifications for due-soon
  for (const r of dueSoon) {
    const dealer = dealers.find((d: any) => d.id === r.dealer_id);
    broadcast({
      type: "PAYMENT_DUE_SOON",
      payload: {
        purchase_id: r.id,
        material_name: r.material_name,
        dealer_name: dealer?.name || "Unknown Dealer",
        amount: (r.qty * r.rate_per_unit).toFixed(2),
        due_date: r.due_date,
      },
    });
  }

  // Broadcast for overdue
  for (const r of overdue) {
    const dealer = dealers.find((d: any) => d.id === r.dealer_id);
    broadcast({
      type: "PAYMENT_OVERDUE",
      payload: {
        purchase_id: r.id,
        material_name: r.material_name,
        dealer_name: dealer?.name || "Unknown Dealer",
        amount: (r.qty * r.rate_per_unit).toFixed(2),
        due_date: r.due_date,
      },
    });
  }

  res.json({ dueSoon: dueSoon.length, overdue: overdue.length });
});

// ─── Raw Material Purchases ───────────────────────────────────────────────────
router.get("/raw-material-purchases", async (_req, res) => {
  if (!db.raw_material_purchases) db.raw_material_purchases = [];
  res.json(await dbSelect("raw_material_purchases", db.raw_material_purchases));
});

router.post("/raw-material-purchases", async (req, res) => {
  if (!db.raw_material_purchases) db.raw_material_purchases = [];
  const dueDate = req.body.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  res.json(await dbInsert("raw_material_purchases", {
    id: crypto.randomUUID(),
    ...req.body,
    due_date: dueDate,
    is_paid: req.body.is_paid ?? false,
    purchase_date: new Date().toISOString(),
  }, db.raw_material_purchases));
});

router.patch("/raw-material-purchases/:id", async (req, res) => {
  if (!db.raw_material_purchases) db.raw_material_purchases = [];
  const updated = await dbUpdate("raw_material_purchases", req.params.id, req.body);
  const local = db.raw_material_purchases.find((r: any) => r.id === req.params.id);
  if (local) Object.assign(local, req.body);
  res.json(updated);
});

// ─── Employee Sessions ────────────────────────────────────────────────────────
router.get("/employee-sessions", async (_req, res) => {
  if (!db.employee_sessions) db.employee_sessions = [];
  const all = await dbSelect("employee_sessions", db.employee_sessions);
  res.json(all.sort((a: any, b: any) => new Date(b.login_time).getTime() - new Date(a.login_time).getTime()));
});

// ─── Reviews ─────────────────────────────────────────────────────────────────
router.get("/reviews", async (_req, res) => {
  if (!db.reviews) db.reviews = [];
  const all = await dbSelect("reviews", db.reviews);
  res.json(all.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
});

router.post("/reviews", async (req, res) => {
  if (!db.reviews) db.reviews = [];
  const { author, rating, text } = req.body;
  if (!author || !rating || !text)
    return res.status(400).json({ error: "author, rating and text are required" });
  const r = Number(rating);
  if (r < 1 || r > 5) return res.status(400).json({ error: "rating must be between 1 and 5" });

  res.json(await dbInsert("reviews", {
    id: crypto.randomUUID(),
    author: sanitize(author),
    rating: r,
    text: sanitize(text),
    created_at: new Date().toISOString(),
  }, db.reviews));
});

router.delete("/reviews/:id", async (req, res) => {
  if (!db.reviews) db.reviews = [];
  await dbDelete("reviews", req.params.id);
  const idx = db.reviews.findIndex((r: any) => r.id === req.params.id);
  if (idx !== -1) db.reviews.splice(idx, 1);
  res.json({ success: true });
});

// ─── Gallery ──────────────────────────────────────────────────────────────────
router.get("/gallery", async (_req, res) => {
  if (!db.gallery) db.gallery = [];
  res.json(await dbSelect("gallery", db.gallery));
});

router.post("/gallery", async (req, res) => {
  if (!db.gallery) db.gallery = [];
  const { title, url } = req.body;
  if (!title || !url) return res.status(400).json({ error: "title and url are required" });
  res.json(await dbInsert("gallery", { id: crypto.randomUUID(), title, url }, db.gallery));
});

router.delete("/gallery/:id", async (req, res) => {
  if (!db.gallery) db.gallery = [];
  await dbDelete("gallery", req.params.id);
  const idx = db.gallery.findIndex((g: any) => g.id === req.params.id);
  if (idx !== -1) db.gallery.splice(idx, 1);
  res.json({ success: true });
});

// ─── Product Variants ────────────────────────────────────────────────────────
router.get("/product-variants", async (req, res) => {
  const { product_id } = req.query;
  const all = await dbSelect("product_variants", db.product_variants);
  res.json(product_id ? all.filter((v: any) => v.product_id === product_id) : all);
});

// ─── Categories ──────────────────────────────────────────────────────────────
router.get("/categories", async (_req, res) => {
  res.json(await dbSelect("categories", db.categories));
});

router.post("/categories", async (req, res) => {
  const { name, image } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  res.json(await dbInsert("categories", { id: `cat-${Date.now()}`, name: sanitize(name), image: sanitize(image || "") }, db.categories));
});

router.put("/categories/:id", async (req, res) => {
  const updated = await dbUpdate("categories", req.params.id, req.body);
  const local = db.categories.find((c: any) => c.id === req.params.id);
  if (local) Object.assign(local, req.body);
  res.json(updated);
});

router.delete("/categories/:id", async (req, res) => {
  await dbDelete("categories", req.params.id);
  const idx = db.categories.findIndex((c: any) => c.id === req.params.id);
  if (idx !== -1) db.categories.splice(idx, 1);
  res.json({ success: true });
});

// ─── Notifications ───────────────────────────────────────────────────────────
router.get("/notifications", async (_req, res) => {
  if (!db.notifications) db.notifications = [];
  const all = await dbSelect("notifications", db.notifications);
  res.json(all.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
});

router.patch("/notifications/read-all", async (_req, res) => {
  if (!db.notifications) db.notifications = [];
  if (supabase) await supabase.from("notifications").update({ read: true }).eq("read", false);
  db.notifications.forEach((n: any) => { n.read = true; });
  res.json({ success: true });
});

router.delete("/notifications", async (_req, res) => {
  if (!db.notifications) db.notifications = [];
  if (supabase) await supabase.from("notifications").delete().neq("id", "");
  db.notifications = [];
  res.json({ success: true });
});

// ─── Analytics ───────────────────────────────────────────────────────────────
router.get("/analytics", async (_req, res) => {
  // Use IST (UTC+5:30) for "today" so metrics match India time
  const istOffset = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + istOffset);
  const today = nowIST.toISOString().split("T")[0]; // YYYY-MM-DD in IST

  const [allOrders, allProducts] = await Promise.all([
    dbSelect("orders", db.orders),
    dbSelect("products", db.products),
  ]);

  // Match orders whose IST date equals today
  const todayOrders = allOrders.filter((o: any) => {
    if (!o.timestamp) return false;
    const orderIST = new Date(new Date(o.timestamp).getTime() + istOffset);
    return orderIST.toISOString().startsWith(today);
  });
  const paidOrders = todayOrders.filter((o: any) => o.order_status === "Paid");

  res.json({
    totalRevenue:  paidOrders.reduce((s: number, o: any) => s + Number(o.grand_total), 0),
    totalSales:    paidOrders.length,
    totalOrders:   todayOrders.length,
    totalProducts: allProducts.length,
    lowStock:      allProducts.filter((p: any) => p.current_stock_qty > 0 && p.current_stock_qty <= p.safety_low_threshold).length,
    outOfStock:    allProducts.filter((p: any) => p.current_stock_qty === 0).length,
  });
});

export default router;
