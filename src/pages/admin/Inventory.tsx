import React, { useState, useEffect } from "react";
import { Package, AlertTriangle, XCircle, Search, Plus, X, Trash2, ArrowDownCircle, ArrowUpCircle, EyeOff } from "lucide-react";
import { useAccess } from "../../hooks/useAccess";
import { apiFetch } from "../../lib/apiFetch";

type Product = { id: string; name: string; category: string; sku: string; current_stock_qty: number; unit_purchase_cost: number; price: number; safety_low_threshold: number; };
type LogEntry = { id: string; type: "STOCK_IN" | "STOCK_OUT"; product_name: string; qty: number; reason: string; operator: string; timestamp: string; };

const EMPTY_PRODUCT = { name: "", sku: "", category: "", unit_purchase_cost: "", price: "", current_stock_qty: "", safety_low_threshold: "5" };

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState("All Items");
  const [logTab, setLogTab] = useState("All");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_PRODUCT });
  const [addError, setAddError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [stockModal, setStockModal] = useState<{ product: Product; type: "in" | "out" } | null>(null);
  const [stockQty, setStockQty] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [stockError, setStockError] = useState("");

  const access = useAccess("Inventory");
  const isReadOnly = access === "Read-Only";

  const fetchAll = () => {
    apiFetch("/api/products").then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : []));
    apiFetch("/api/inventory-log").then(r => r.json()).then(d => setLog(Array.isArray(d) ? d : []));
  };

  useEffect(() => { fetchAll(); }, []);

  const categories = ["All", ...Array.from(new Set(products.map(p => p.category)))];

  const filtered = products.filter(p => {
    const matchTab = activeTab === "All Items" || (activeTab === "Low Stock" && p.current_stock_qty > 0 && p.current_stock_qty <= p.safety_low_threshold) || (activeTab === "Out of Stock" && p.current_stock_qty === 0);
    const matchCat = catFilter === "All" || p.category === catFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchCat && matchSearch;
  });

  const metrics = [
    { label: "Total Products", value: products.length, icon: Package, color: "text-blue-500" },
    { label: "Total Stock Value", value: `₹${products.reduce((s, p) => s + p.unit_purchase_cost * p.current_stock_qty, 0).toFixed(0)}`, icon: Package, color: "text-green-500" },
    { label: "Low Stock Items", value: products.filter(p => p.current_stock_qty > 0 && p.current_stock_qty <= p.safety_low_threshold).length, icon: AlertTriangle, color: "text-yellow-500" },
    { label: "Out of Stock", value: products.filter(p => p.current_stock_qty === 0).length, icon: XCircle, color: "text-red-500" },
  ];

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    if (!addForm.name || !addForm.sku || !addForm.category || !addForm.price) {
      setAddError("All fields are required.");
      return;
    }
    await apiFetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addForm, unit_purchase_cost: Number(addForm.unit_purchase_cost), price: Number(addForm.price), current_stock_qty: Number(addForm.current_stock_qty), safety_low_threshold: Number(addForm.safety_low_threshold) })
    });
    setShowAddModal(false);
    setAddForm({ ...EMPTY_PRODUCT });
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget || !deleteConfirm) return;
    await apiFetch(`/api/products/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    setDeleteConfirm(false);
    fetchAll();
  };

  const handleStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    setStockError("");
    if (!stockModal) return;
    const qty = Number(stockQty);
    if (!qty || qty <= 0) { setStockError("Enter a valid quantity."); return; }
    if (stockModal.type === "out" && stockModal.product.current_stock_qty - qty < 0) {
      setStockError("Stock cannot go below zero."); return;
    }
    const res = await apiFetch(`/api/products/${stockModal.product.id}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: stockModal.type, qty, reason: stockReason })
    });
    if (!res.ok) { const d = await res.json(); setStockError(d.error); return; }
    setStockModal(null);
    setStockQty("");
    setStockReason("");
    fetchAll();
  };

  const displayedLog = log.filter(l => logTab === "All" || (logTab === "Stock In" && l.type === "STOCK_IN") || (logTab === "Stock Out" && l.type === "STOCK_OUT"));

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`p-3 rounded-full bg-gray-50 ${m.color}`}><m.icon size={24} /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">{m.label}</p>
              <p className="text-xl font-bold text-gray-800">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex gap-2">
            {["All Items", "Low Stock", "Out of Stock"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === tab ? "bg-maroon text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {isReadOnly && (
              <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded font-semibold">
                <EyeOff size={12} /> Read-Only Mode
              </span>
            )}
            {!isReadOnly && (
              <button onClick={() => { setStockModal(null); setShowAddModal(true); }} className="bg-maroon hover:bg-maroon-light text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-1">
                <Plus size={16} /> Add Product
              </button>
            )}
          </div>
        </div>

        <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded text-sm" />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm bg-white min-w-[150px]">
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-200">
              <tr>
                <th className="py-3 px-4"># ID</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Qty</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-500">{i + 1}</td>
                  <td className="py-3 px-4 font-medium text-gray-800">{p.name}</td>
                  <td className="py-3 px-4 text-gray-500">{p.category}</td>
                  <td className="py-3 px-4 font-mono text-xs">{p.sku}</td>
                  <td className="py-3 px-4 font-bold">{p.current_stock_qty}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${p.current_stock_qty === 0 ? "bg-red-100 text-red-700" : p.current_stock_qty <= p.safety_low_threshold ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                      {p.current_stock_qty === 0 ? "Out of Stock" : p.current_stock_qty <= p.safety_low_threshold ? "Low Stock" : "In Stock"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-1">
                      {!isReadOnly && (
                        <>
                          <button onClick={() => { setStockModal({ product: p, type: "in" }); setStockQty(""); setStockReason(""); setStockError(""); }}
                            className="text-green-600 hover:bg-green-50 p-1.5 rounded" title="Stock In"><ArrowDownCircle size={16} /></button>
                          <button onClick={() => { setStockModal({ product: p, type: "out" }); setStockQty(""); setStockReason(""); setStockError(""); }}
                            className="text-orange-500 hover:bg-orange-50 p-1.5 rounded" title="Stock Out"><ArrowUpCircle size={16} /></button>
                          <button onClick={() => { setDeleteTarget(p); setDeleteConfirm(false); }}
                            className="text-red-600 hover:bg-red-50 p-1.5 rounded" title="Delete"><Trash2 size={16} /></button>
                        </>
                      )}
                      {isReadOnly && <span className="text-xs text-gray-400 italic px-2">View only</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-400 italic">No products found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventory Audit Log */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-serif text-lg text-maroon font-bold">Inventory Audit Log</h3>
          <div className="flex gap-2">
            {["All", "Stock In", "Stock Out"].map(t => (
              <button key={t} onClick={() => setLogTab(t)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${logTab === t ? "bg-maroon text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Qty</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {displayedLog.map(l => (
                <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${l.type === "STOCK_IN" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {l.type === "STOCK_IN" ? "Stock In" : "Stock Out"}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-800">{l.product_name}</td>
                  <td className="py-3 px-4 font-bold">{l.qty}</td>
                  <td className="py-3 px-4 text-gray-500">{l.reason || "—"}</td>
                  <td className="py-3 px-4 text-gray-600">{l.operator}</td>
                  <td className="py-3 px-4 text-gray-400 text-xs">{new Date(l.timestamp).toLocaleString()}</td>
                </tr>
              ))}
              {displayedLog.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400 italic">No activity recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-xl">
              <h3 className="font-bold text-maroon text-lg">Add New Product</h3>
              <button onClick={() => setShowAddModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleAddProduct} className="p-5 space-y-3">
              {[
                { label: "Product Name", key: "name", type: "text" },
                { label: "SKU Code", key: "sku", type: "text" },
                { label: "Category", key: "category", type: "text" },
                { label: "Purchase Cost (₹)", key: "unit_purchase_cost", type: "number" },
                { label: "Selling Price (₹)", key: "price", type: "number" },
                { label: "Initial Quantity", key: "current_stock_qty", type: "number" },
                { label: "Safety Low Threshold", key: "safety_low_threshold", type: "number" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-gray-600 uppercase">{f.label}</label>
                  <input type={f.type} required value={(addForm as any)[f.key]}
                    onChange={e => setAddForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
                </div>
              ))}
              {addError && <p className="text-red-500 text-sm">{addError}</p>}
              <button type="submit" className="w-full bg-maroon text-white font-bold py-2.5 rounded hover:bg-maroon-light transition-colors mt-2">
                Add Product
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-bold text-red-600 text-lg mb-2">Delete Product</h3>
            <p className="text-gray-600 text-sm mb-4">Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.</p>
            <label className="flex items-center gap-2 text-sm text-gray-700 mb-4 cursor-pointer">
              <input type="checkbox" checked={deleteConfirm} onChange={e => setDeleteConfirm(e.target.checked)} className="accent-red-600" />
              I confirm I want to permanently delete this product.
            </label>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-gray-300 rounded py-2 text-sm font-semibold hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} disabled={!deleteConfirm}
                className="flex-1 bg-red-600 text-white rounded py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock In / Out Modal */}
      {stockModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl">
            <div className={`p-4 border-b border-gray-100 flex items-center justify-between rounded-t-xl ${stockModal.type === "in" ? "bg-green-50" : "bg-orange-50"}`}>
              <h3 className={`font-bold text-lg ${stockModal.type === "in" ? "text-green-700" : "text-orange-700"}`}>
                {stockModal.type === "in" ? "Stock In" : "Stock Out"} — {stockModal.product.name}
              </h3>
              <button onClick={() => setStockModal(null)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleStockAdjust} className="p-5 space-y-4">
              <p className="text-sm text-gray-500">Current stock: <strong>{stockModal.product.current_stock_qty}</strong></p>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Quantity</label>
                <input type="number" min="1" required value={stockQty} onChange={e => setStockQty(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Reason {stockModal.type === "out" ? "(e.g. spoilage, waste)" : "(e.g. vendor delivery)"}</label>
                <input type="text" value={stockReason} onChange={e => setStockReason(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
              </div>
              {stockError && <p className="text-red-500 text-sm">{stockError}</p>}
              <button type="submit" className={`w-full text-white font-bold py-2.5 rounded transition-colors ${stockModal.type === "in" ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600"}`}>
                Confirm {stockModal.type === "in" ? "Stock In" : "Stock Out"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
