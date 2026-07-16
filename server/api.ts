import { roleAuthMiddleware, createSession, destroySession, checkRateLimit, resetRateLimit } from "./middleware.js";
import { Router } from "express";
import { db, supabase, dbSelect, dbInsert, dbUpdate, dbDelete } from "./db.js";
import { broadcast } from "./ws.js";
import bcrypt from "bcryptjs";

const router = Router();
router.use(roleAuthMiddleware);

// Health check
router.get("/health", (req, res) => res.json({ status: "ok", supabase: !!supabase }));

// ─── Products ────────────────────────────────────────────────────────────────
router.get("/products", async (req, res) => {
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
  const newProduct = { id: `PRD-${Date.now()}`, ...req.body, current_stock_qty: Number(req.body.current_stock_qty) || 0 };
  const saved = await dbInsert("products", newProduct, db.products);
  const logEntry = { id: crypto.randomUUID(), type: "STOCK_IN", product_id: saved.id, product_name: saved.name, qty: saved.current_stock_qty, reason: "Initial Stock", operator: session?.name || "Admin", timestamp: new Date().toISOString() };
  await dbInsert("inventory_log", logEntry, db.inventory_log);
  res.json(saved);
});

router.delete("/products/:id", async (req, res) => {
  await dbDelete("products", req.params.id);
  const idx = db.products.findIndex((p: any) => p.id === req.params.id);
  if (idx !== -1) db.products.splice(idx, 1);
  res.json({ success: true });
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
  const logEntry = { id: crypto.randomUUID(), type: type === "in" ? "STOCK_IN" : "STOCK_OUT", product_id: product.id, product_name: product.name, qty: amount, reason: reason || "", operator: session?.name || "Admin", timestamp: new Date().toISOString() };
  await dbInsert("inventory_log", logEntry, db.inventory_log);
  if (newQty === 0) broadcast({ type: "INVENTORY_DEPLETED", payload: { product_id: product.id, sku_code: product.sku, remaining_qty: 0 } });
  res.json({ ...product, current_stock_qty: newQty });
});

// ─── Inventory log ───────────────────────────────────────────────────────────
router.get("/inventory-log", async (req, res) => {
  res.json(await dbSelect("inventory_log", db.inventory_log));
});

// ─── Orders ──────────────────────────────────────────────────────────────────
router.get("/orders", async (req, res) => {
  res.json(await dbSelect("orders", db.orders));
});

router.post("/orders", async (req, res) => {
  const ts = Date.now();
  const orderId = `INV-${new Date().getFullYear()}-${ts.toString().slice(-6)}`;
  const newOrder = { ...req.body, id: orderId, timestamp: new Date().toISOString() };
  const saved = await dbInsert("orders", newOrder, db.orders);
  broadcast({ type: "INBOUND_QR_ORDER", payload: { order_id: saved.id, table_number: saved.table_id || "Delivery", bill_amount: saved.grand_total } });
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
    employees: employees.filter((e: any) => e.name?.toLowerCase().includes(query) || e.id?.toLowerCase().includes(query)),
  });
});

// ─── Dealers ─────────────────────────────────────────────────────────────────
router.get("/dealers", async (req, res) => {
  res.json(await dbSelect("dealers", db.dealers));
});

router.post("/dealers", async (req, res) => {
  const newDealer = { id: crypto.randomUUID(), ...req.body };
  res.json(await dbInsert("dealers", newDealer, db.dealers));
});

router.delete("/dealers/:id", async (req, res) => {
  await dbDelete("dealers", req.params.id);
  const idx = db.dealers.findIndex((d: any) => d.id === req.params.id);
  if (idx !== -1) db.dealers.splice(idx, 1);
  res.json({ success: true });
});

// ─── Expenses ────────────────────────────────────────────────────────────────
router.get("/expenses", async (req, res) => {
  res.json(await dbSelect("expenses", db.expenses));
});

router.post("/expenses", async (req, res) => {
  const newExpense = { id: crypto.randomUUID(), ...req.body, expense_date: new Date().toISOString() };
  res.json(await dbInsert("expenses", newExpense, db.expenses));
});

// ─── Employees ───────────────────────────────────────────────────────────────
router.get("/employees", async (req, res) => {
  res.json(await dbSelect("employees", db.employees));
});

router.post("/employees", async (req, res) => {
  const newEmp = { id: `EMP-${Date.now()}`, ...req.body };
  res.json(await dbInsert("employees", newEmp, db.employees));
});

router.delete("/employees/:id", async (req, res) => {
  await dbDelete("employees", req.params.id);
  const idx = db.employees.findIndex((e: any) => e.id === req.params.id);
  if (idx !== -1) db.employees.splice(idx, 1);
  res.json({ success: true });
});

router.patch("/employees/:id", async (req, res) => {
  const { name, full_name, avatar } = req.body;
  const patch: any = {};
  if (name)      patch.name      = name;
  if (full_name) patch.full_name = full_name;
  if (avatar !== undefined) patch.avatar = avatar;
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
    const { data: existing } = await supabase.from("attendance").select("*").eq("employee_id", employee_id).eq("calendar_date", calendar_date).single();
    if (existing) {
      const { data } = await supabase.from("attendance").update({ status_flag }).eq("id", existing.id).select().single();
      return res.json(data);
    }
  } else {
    const existing = db.attendance.find((a: any) => a.employee_id === employee_id && a.calendar_date === calendar_date);
    if (existing) { existing.status_flag = status_flag; return res.json(existing); }
  }
  const record = { id: crypto.randomUUID(), employee_id, calendar_date, status_flag };
  res.json(await dbInsert("attendance", record, db.attendance));
});

// ─── Settings ────────────────────────────────────────────────────────────────
router.get("/settings", async (req, res) => {
  if (supabase) {
    const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
    if (data) return res.json(data.value ?? db.settings);
  }
  res.json(db.settings);
});

router.post("/settings", async (req, res) => {
  db.settings = { ...db.settings, ...req.body };
  if (supabase) {
    await supabase.from("settings").upsert({ id: 1, value: db.settings });
  }
  res.json(db.settings);
});

// ─── Password change — bcrypt §5.2 ───────────────────────────────────────────
router.post("/auth/change-password", async (req, res) => {
  const { current_pass, new_pass } = req.body;
  if (!current_pass || !new_pass) return res.status(400).json({ error: "Missing fields" });
  const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}/;
  if (!passRegex.test(new_pass)) return res.status(400).json({ error: "Password does not meet complexity requirements" });
  if (!db.adminPasswordHash) return res.status(400).json({ error: "No password set yet. Use /auth/set-password to initialise." });
  const isMatch = await bcrypt.compare(current_pass, db.adminPasswordHash);
  if (!isMatch) return res.status(401).json({ error: "Current password is incorrect" });
  const hashed = await bcrypt.hash(new_pass, 12);
  db.adminPasswordHash = hashed;
  if (supabase) await supabase.from("settings").upsert({ id: 1, value: { ...db.settings, adminPasswordHash: hashed } });
  res.json({ success: true });
});

// ─── First-time password setup (only works when no password is set yet) ───────
router.post("/auth/set-password", async (req, res) => {
  if (db.adminPasswordHash) return res.status(403).json({ error: "Password already set. Use change-password instead." });
  const { new_pass } = req.body;
  const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}/;
  if (!new_pass || !passRegex.test(new_pass)) return res.status(400).json({ error: "Password must be 8+ chars with upper, lower, number and special character." });
  const hashed = await bcrypt.hash(new_pass, 12);
  db.adminPasswordHash = hashed;
  if (supabase) await supabase.from("settings").upsert({ id: 1, value: { ...db.settings, adminPasswordHash: hashed } });
  res.json({ success: true });
});

// ─── 403 alert broadcast ─────────────────────────────────────────────────────
router.post("/auth/forbidden-alert", (req, res) => {
  const { path, role } = req.body;
  broadcast({ type: "FORBIDDEN_ACCESS_ATTEMPT", payload: { path, role, timestamp: new Date().toISOString() } });
  res.json({ ok: true });
});

// ─── Login ────────────────────────────────────────────────────────────────────
router.post("/auth/login", async (req, res) => {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.socket.remoteAddress || "unknown";
  const { allowed, retryAfterSecs } = checkRateLimit(ip);
  if (!allowed) return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(retryAfterSecs / 60)} min.` });

  const { username, password, role } = req.body;
  const u = (username ?? "").trim();
  const p = (password ?? "").trim();

  if (role === "Admin" && u === "admin") {
    if (!db.adminPasswordHash) return res.status(401).json({ error: "Admin password not set. Please set it first." });
    const isMatch = await bcrypt.compare(p, db.adminPasswordHash);
    if (isMatch) {
      resetRateLimit(ip);
      const token = await createSession("Admin", "Super Admin");
      return res.json({ success: true, role: "Admin", name: "Super Admin", sessionToken: token });
    }
  }

  if (role === "Employee") {
    const employees = await dbSelect("employees", db.employees);
    const emp = employees.find((e: any) => e.name?.toLowerCase() === u.toLowerCase() && e.phone_number === p);
    if (emp) {
      resetRateLimit(ip);
      const token = await createSession(emp.designation_tag, emp.name, emp.id);
      if (!db.employee_sessions) db.employee_sessions = [];
      const sess = { id: crypto.randomUUID(), employee_id: emp.id, login_time: new Date().toISOString(), logout_time: null, session_token: token };
      await dbInsert("employee_sessions", sess, db.employee_sessions);
      return res.json({
        success: true, role: emp.designation_tag, name: emp.name,
        employee_id: emp.id, avatar: emp.avatar || null,
        permissions: db.settings?.permissions?.[emp.designation_tag] || {},
        sessionToken: token,
      });
    }
  }

  res.status(401).json({ error: "Invalid credentials" });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post("/auth/logout", async (req, res) => {
  const token = req.header("X-Session-Token") || "";
  if (token) {
    await destroySession(token);
    if (db.employee_sessions) {
      const s = db.employee_sessions.find((s: any) => s.session_token === token && !s.logout_time);
      if (s) {
        s.logout_time = new Date().toISOString();
        if (supabase) await supabase.from("employee_sessions").update({ logout_time: s.logout_time }).eq("session_token", token).catch(() => {});
      }
    }
  }
  res.json({ success: true });
});

// ─── OTP store (in-memory, expires in 5 min) ─────────────────────────────────
const otpStore = new Map<string, { otp: string; expires: number; employeeId: string }>();

// ─── Send OTP ────────────────────────────────────────────────────────────────
router.post("/auth/send-otp", async (req, res) => {
  const phone = (req.body.phone ?? "").trim();
  if (!phone) return res.status(400).json({ error: "Phone number required" });
  const employees = await dbSelect("employees", db.employees);
  const emp = employees.find((e: any) => e.phone_number === phone);
  if (!emp) return res.status(404).json({ error: "No employee found with this phone number" });
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(phone, { otp, expires: Date.now() + 5 * 60 * 1000, employeeId: emp.id });
  console.log(`[OTP] Phone: ${phone} | OTP: ${otp} | Employee: ${emp.name}`);
  res.json({ success: true, message: "OTP sent" });
});

// ─── Verify OTP ──────────────────────────────────────────────────────────────
router.post("/auth/verify-otp", async (req, res) => {
  const phone = (req.body.phone ?? "").trim();
  const otp   = (req.body.otp   ?? "").trim();
  const entry = otpStore.get(phone);
  if (!entry) return res.status(400).json({ error: "No OTP requested for this number" });
  if (Date.now() > entry.expires) { otpStore.delete(phone); return res.status(400).json({ error: "OTP expired. Please request a new one." }); }
  if (entry.otp !== otp) return res.status(401).json({ error: "Invalid OTP" });
  otpStore.delete(phone);
  const employees = await dbSelect("employees", db.employees);
  const emp = employees.find((e: any) => e.id === entry.employeeId);
  if (!emp) return res.status(404).json({ error: "Employee not found" });
  const settings = db.settings;
  const token = await createSession(emp.designation_tag, emp.name, emp.id);
  res.json({ success: true, role: emp.designation_tag, name: emp.name, employee_id: emp.id, permissions: settings?.permissions?.[emp.designation_tag] || {}, sessionToken: token });
});

// ─── Dealer invoice due ──────────────────────────────────────────────────────
router.post("/dealers/:id/invoice-due", async (req, res) => {
  const dealers = await dbSelect("dealers", db.dealers);
  const dealer = dealers.find((d: any) => d.id === req.params.id);
  if (!dealer) return res.status(404).json({ error: "Not found" });
  const { amount_due, expiry_date } = req.body;
  broadcast({ type: "DEALER_INVOICE_DUE", payload: { dealer_id: dealer.id, dealer_name: dealer.name, amount_due, expiry_date } });
  res.json({ ok: true });
});

// ─── Raw Material Purchases ─────────────────────────────────────────────────
router.get("/raw-material-purchases", async (req, res) => {
  if (!db.raw_material_purchases) db.raw_material_purchases = [];
  res.json(await dbSelect("raw_material_purchases", db.raw_material_purchases));
});

router.post("/raw-material-purchases", async (req, res) => {
  if (!db.raw_material_purchases) db.raw_material_purchases = [];
  const entry = { id: crypto.randomUUID(), ...req.body, purchase_date: new Date().toISOString() };
  res.json(await dbInsert("raw_material_purchases", entry, db.raw_material_purchases));
});

// ─── Employee Sessions ────────────────────────────────────────────────────────
router.get("/employee-sessions", async (req, res) => {
  if (!db.employee_sessions) db.employee_sessions = [];
  const all = await dbSelect("employee_sessions", db.employee_sessions);
  res.json(all.sort((a: any, b: any) => new Date(b.login_time).getTime() - new Date(a.login_time).getTime()));
});

// ─── Reviews ─────────────────────────────────────────────────────────────────
router.get("/reviews", async (req, res) => {
  if (!db.reviews) db.reviews = [];
  const all = await dbSelect("reviews", db.reviews);
  res.json(all.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
});

router.post("/reviews", async (req, res) => {
  if (!db.reviews) db.reviews = [];
  const { author, rating, text } = req.body;
  if (!author || !rating || !text) return res.status(400).json({ error: "author, rating and text are required" });
  const entry = { id: crypto.randomUUID(), author, rating: Number(rating), text, created_at: new Date().toISOString() };
  res.json(await dbInsert("reviews", entry, db.reviews));
});

router.delete("/reviews/:id", async (req, res) => {
  if (!db.reviews) db.reviews = [];
  await dbDelete("reviews", req.params.id);
  const idx = db.reviews.findIndex((r: any) => r.id === req.params.id);
  if (idx !== -1) db.reviews.splice(idx, 1);
  res.json({ success: true });
});

// ─── Gallery ──────────────────────────────────────────────────────────────────
router.get("/gallery", async (req, res) => {
  if (!db.gallery) db.gallery = [];
  res.json(await dbSelect("gallery", db.gallery));
});

router.post("/gallery", async (req, res) => {
  if (!db.gallery) db.gallery = [];
  const { title, url } = req.body;
  if (!title || !url) return res.status(400).json({ error: "title and url are required" });
  const entry = { id: crypto.randomUUID(), title, url };
  res.json(await dbInsert("gallery", entry, db.gallery));
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
router.get("/categories", async (req, res) => {
  res.json(await dbSelect("categories", db.categories));
});

router.post("/categories", async (req, res) => {
  const cat = { id: `cat-${Date.now()}`, ...req.body };
  res.json(await dbInsert("categories", cat, db.categories));
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

// ─── Analytics ───────────────────────────────────────────────────────────────
router.get("/analytics", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const [allOrders, allProducts] = await Promise.all([
    dbSelect("orders", db.orders),
    dbSelect("products", db.products),
  ]);
  const todayOrders = allOrders.filter((o: any) => o.timestamp?.startsWith(today));
  const paidOrders  = todayOrders.filter((o: any) => o.order_status === "Paid");
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
