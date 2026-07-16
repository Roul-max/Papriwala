import { createClient, SupabaseClient } from "@supabase/supabase-js";
import "dotenv/config";

// ─── Supabase client (only created when env vars are present) ────────────────
let supabase: SupabaseClient | null = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  console.log("✅ Supabase connected:", process.env.SUPABASE_URL);
} else {
  console.warn("⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — using in-memory store.");
}

export { supabase };

// ─── In-memory fallback store (used when Supabase is not configured) ─────────
export const db: any = {
  products: [
    { id: "p1", name: "Kaju Katli", category: "Sweets", current_stock_qty: 25, unit_purchase_cost: 400, safety_low_threshold: 5, price: 520, image: "https://images.unsplash.com/photo-1626804475297-4160ebba5270?auto=format&fit=crop&q=80&w=200", sku: "SW-001", unit: "kg", description: "Premium cashew fudge made with pure desi ghee and finest kaju. A signature delicacy perfect for every celebration and gifting." },
    { id: "p2", name: "Motichoor Ladoo", category: "Sweets", current_stock_qty: 40, unit_purchase_cost: 150, safety_low_threshold: 10, price: 200, image: "https://images.unsplash.com/photo-1634563450917-fa254dfb2344?auto=format&fit=crop&q=80&w=200", sku: "SW-002", unit: "kg", description: "Soft, melt-in-mouth ladoos made from fine boondi, sugar syrup, and cardamom. A festive favourite across generations." },
    { id: "p3", name: "Soan Papdi", category: "Sweets", current_stock_qty: 15, unit_purchase_cost: 180, safety_low_threshold: 10, price: 250, image: "https://images.unsplash.com/photo-1559564104-e3c79a528c0b?auto=format&fit=crop&q=80&w=200", sku: "SW-003", unit: "kg", description: "Light, flaky and melt-in-the-mouth — our signature Soan Papdi is handcrafted with pure ghee, gram flour, sugar and cardamom." },
    { id: "p4", name: "Aloo Bhujia", category: "Namkeen", current_stock_qty: 100, unit_purchase_cost: 80, safety_low_threshold: 20, price: 120, image: "https://images.unsplash.com/photo-1605337298642-e931139edaf1?auto=format&fit=crop&q=80&w=200", sku: "NM-001", unit: "kg", description: "Crispy, spiced potato noodles — a classic Bihari namkeen snack enjoyed with tea or as an anytime munch." },
  ],
  product_variants: [
    { variant_id: "v1", product_id: "p1", size_label: "250g", variant_price_modifier: 0.25 },
    { variant_id: "v2", product_id: "p1", size_label: "500g", variant_price_modifier: 0.5 },
    { variant_id: "v3", product_id: "p1", size_label: "1kg", variant_price_modifier: 1.0 },
    { variant_id: "v4", product_id: "p3", size_label: "500g", variant_price_modifier: 0.5 },
    { variant_id: "v5", product_id: "p3", size_label: "1kg", variant_price_modifier: 1.0 },
  ],
  dealers: [
    { id: "d1", name: "Amul Distributors", address: "Main Road, Buxar", gstin: "10AAAAA1234A1Z1", phone: "9876543210" }
  ],
  expenses: [],
  employees: [
    { id: "e1", name: "Ramesh Kumar",  designation_tag: "Cashier", phone_number: "9876500001", salary_type_flag: "Monthly", base_compensation_rate: 15000, joining_date: "2024-01-15" },
    { id: "e2", name: "Suresh Yadav",  designation_tag: "Chef",    phone_number: "9876500002", salary_type_flag: "Monthly", base_compensation_rate: 18000, joining_date: "2024-02-01" },
    { id: "e3", name: "Priya Sharma",  designation_tag: "Manager", phone_number: "9876500003", salary_type_flag: "Monthly", base_compensation_rate: 25000, joining_date: "2024-01-01" },
  ],
  attendance: [],
  orders: [],
  inventory_log: [] as any[],
  adminPasswordHash: "",
  settings: {
    permissions: {
      Cashier:  { "POS Billing": "Full Access", Orders: "Read-Only",  Inventory: "Hidden",      "Financial Reports": "Hidden",    Settings: "Hidden", Employees: "Hidden" },
      Chef:     { "POS Billing": "Hidden",      Orders: "Full Access", Inventory: "Read-Only",   "Financial Reports": "Hidden",    Settings: "Hidden", Employees: "Hidden" },
      Manager:  { "POS Billing": "Full Access", Orders: "Full Access", Inventory: "Full Access", "Financial Reports": "Read-Only", Settings: "Hidden", Employees: "Read-Only" },
    },
    lowStockAlerts: true,
    dailyReportSummary: false,
  },
  categories: [
    { id: "c1", name: "Sweets",    image: "https://images.unsplash.com/photo-1626804475297-4160ebba5270?auto=format&fit=crop&q=80&w=400" },
    { id: "c2", name: "Namkeen",   image: "https://images.unsplash.com/photo-1605337298642-e931139edaf1?auto=format&fit=crop&q=80&w=400" },
    { id: "c3", name: "Bakery",    image: "https://images.unsplash.com/photo-1621236378699-8597ffc34082?auto=format&fit=crop&q=80&w=400" },
    { id: "c4", name: "Beverages", image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&q=80&w=400" },
    { id: "c5", name: "Snacks",    image: "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&q=80&w=400" },
  ],
  reviews: [
    { id: "r1", author: "Rahul S.",  rating: 5, text: "The best Kaju Katli in town. Have been a customer for 10 years!",        created_at: "2024-01-10T10:00:00Z" },
    { id: "r2", author: "Priya M.",  rating: 4, text: "Very fast delivery, samosas were still warm.",                           created_at: "2024-02-14T12:00:00Z" },
    { id: "r3", author: "Amit K.",   rating: 5, text: "Love the new digital ordering system. Soan Papdi is amazing.",          created_at: "2024-03-05T09:30:00Z" },
  ],
  gallery: [
    { id: "g1", title: "Premium Assorted Sweets", url: "https://images.pexels.com/photos/1028714/pexels-photo-1028714.jpeg?auto=compress&cs=tinysrgb&w=600" },
    { id: "g2", title: "Fresh Jalebi",            url: "https://images.pexels.com/photos/9609847/pexels-photo-9609847.jpeg?auto=compress&cs=tinysrgb&w=600" },
    { id: "g3", title: "Samosa & Namkeen",        url: "https://images.pexels.com/photos/4449068/pexels-photo-4449068.jpeg?auto=compress&cs=tinysrgb&w=600" },
    { id: "g4", title: "Gulab Jamun",             url: "https://images.pexels.com/photos/14477896/pexels-photo-14477896.jpeg?auto=compress&cs=tinysrgb&w=600" },
    { id: "g5", title: "Bakery Delights",         url: "https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg?auto=compress&cs=tinysrgb&w=600" },
  ],
};

// ─── Bootstrap: load persisted settings (incl. adminPasswordHash) on startup ─
export async function bootstrapDb() {
  if (!supabase) return;
  const { data } = await supabase.from("settings").select("value").eq("id", 1).single().catch(() => ({ data: null }));
  if (data?.value) {
    Object.assign(db.settings, data.value);
    if (data.value.adminPasswordHash) {
      db.adminPasswordHash = data.value.adminPasswordHash;
      console.log("✅ Admin password hash loaded from Supabase.");
    } else {
      console.warn("⚠️  No adminPasswordHash found in Supabase settings.");
    }
  }
}

// ─── Generic Supabase helpers (used by api.ts) ────────────────────────────────
// Each helper tries Supabase first; falls back to in-memory db array on error or missing config.

export async function dbSelect(table: string, fallback: any[], query?: Record<string, any>) {
  if (!supabase) return fallback;
  let q = supabase.from(table).select("*");
  if (query) Object.entries(query).forEach(([k, v]) => { q = (q as any).eq(k, v); });
  const { data, error } = await q;
  if (error) { console.error(`Supabase SELECT ${table}:`, error.message); return fallback; }
  return data ?? fallback;
}

export async function dbInsert(table: string, row: any, fallbackArr: any[]) {
  if (!supabase) { fallbackArr.unshift ? fallbackArr.unshift(row) : fallbackArr.push(row); return row; }
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) { console.error(`Supabase INSERT ${table}:`, error.message); fallbackArr.push(row); return row; }
  return data;
}

export async function dbUpdate(table: string, id: string, patch: any, idCol = "id") {
  if (!supabase) return patch;
  const { data, error } = await supabase.from(table).update(patch).eq(idCol, id).select().single();
  if (error) { console.error(`Supabase UPDATE ${table}:`, error.message); return patch; }
  return data;
}

export async function dbDelete(table: string, id: string, idCol = "id") {
  if (!supabase) return;
  const { error } = await supabase.from(table).delete().eq(idCol, id);
  if (error) console.error(`Supabase DELETE ${table}:`, error.message);
}
