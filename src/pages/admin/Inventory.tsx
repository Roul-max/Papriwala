import React, { useState, useEffect } from "react";
import { Package, AlertTriangle, XCircle, Search, Plus, X, Trash2, ArrowDownCircle, ArrowUpCircle, EyeOff, Edit2 } from "lucide-react";
import { useAccess } from "../../hooks/useAccess";
import { apiFetch } from "../../lib/apiFetch";
type Product = { id: string; name: string; category: string; sku: string; current_stock_qty: number; unit_purchase_cost: number; price: number; safety_low_threshold: number; muted?: boolean; image?: string; unit?: string; description?: string; };
type LogEntry = { id: string; type: "STOCK_IN" | "STOCK_OUT"; product_name: string; qty: number; reason: string; operator: string; timestamp: string; };

const EMPTY_PRODUCT = { name: "", sku: "", category: "", price: "", current_stock_qty: "", safety_low_threshold: "5", unit: "gm", image: "", description: "" };

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("All Items");
  const [logTab, setLogTab] = useState("All");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
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
    apiFetch("/api/categories").then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d.map((c: any) => c.name) : []));
  };

  useEffect(() => { fetchAll(); }, []);

  const categoryFilterOptions = ["All", ...categories];

  const nextSku = () => {
    const nums = products.map(p => parseInt(p.sku?.replace(/\D/g, "") || "0")).filter(n => !isNaN(n));
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return `SKU${String(next).padStart(3, "0")}`;
  };

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

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 300; canvas.height = 300;
      const ctx = canvas.getContext("2d")!;
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2, sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 300, 300);
      URL.revokeObjectURL(url);
      setAddForm(prev => ({ ...prev, image: canvas.toDataURL("image/jpeg", 0.75) }));
    };
    img.src = url;
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    if (!addForm.name || !addForm.category || !addForm.price) {
      setAddError("Name, category and price are required.");
      return;
    }
    const sku = addForm.sku || nextSku();
    if (editProductId) {
      await apiFetch(`/api/products/${editProductId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, sku, price: Number(addForm.price), current_stock_qty: Number(addForm.current_stock_qty) || 0, safety_low_threshold: Number(addForm.safety_low_threshold) })
      });
    } else {
      await apiFetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, sku, price: Number(addForm.price), current_stock_qty: Number(addForm.current_stock_qty) || 0, safety_low_threshold: Number(addForm.safety_low_threshold) })
      });
    }
    setShowAddModal(false);
    setEditProductId(null);
    setAddForm({ ...EMPTY_PRODUCT });
    fetchAll();
  };

  const handleToggleMute = async (p: Product) => {
    const updated = { ...p, muted: !p.muted };
    await apiFetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ muted: updated.muted }),
    });
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, muted: updated.muted } : x));
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
              <button onClick={() => { setStockModal(null); setAddForm({ ...EMPTY_PRODUCT, sku: nextSku() }); setShowAddModal(true); }} className="bg-maroon hover:bg-maroon-light text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-1">
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
            {categoryFilterOptions.map(c => <option key={c}>{c}</option>)}
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
                <th className="py-3 px-4">Alerts</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-500">{i + 1}</td>
                  <td className="py-3 px-4 font-medium text-gray-800">
                    <div className="flex items-center gap-2">
                      {p.image
                        ? <img src={p.image} alt={p.name} className="w-8 h-8 rounded object-cover border border-gray-200 flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display='none'; }}/>
                        : <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0"><Package size={14} className="text-gray-400" /></div>
                      }
                      {p.name}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{p.category}</td>
                  <td className="py-3 px-4 font-mono text-xs">{p.sku}</td>
                  <td className="py-3 px-4 font-bold">
                    {p.unit === "gm" && p.current_stock_qty >= 1000
                      ? <>{(p.current_stock_qty / 1000).toFixed(2)} <span className="text-xs text-gray-400 font-normal">kg</span></>
                      : <>{p.current_stock_qty} <span className="text-xs text-gray-400 font-normal">{p.unit || "pcs"}</span></>}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${p.current_stock_qty === 0 ? "bg-red-100 text-red-700" : p.current_stock_qty <= p.safety_low_threshold ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                      {p.current_stock_qty === 0 ? "Out of Stock" : p.current_stock_qty <= p.safety_low_threshold ? "Low Stock" : "In Stock"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                      {p.muted
                        ? <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">🔕 Muted</span>
                        : p.current_stock_qty === 0
                          ? <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-600">⚠ Depleted</span>
                          : <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600">🔔 Active</span>}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-1">
                      {!isReadOnly && (
                        <>
                          <button onClick={() => { setEditProductId(p.id); setAddForm({ name: p.name, sku: p.sku, category: p.category, price: String(p.price), current_stock_qty: String(p.current_stock_qty), safety_low_threshold: String(p.safety_low_threshold), unit: p.unit || "gm", image: p.image || "", description: p.description || "" }); setShowAddModal(true); }}
                            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded" title="Edit"><Edit2 size={16} /></button>
                          <button onClick={() => { setStockModal({ product: p, type: "in" }); setStockQty(""); setStockReason(""); setStockError(""); }}
                            className="text-green-600 hover:bg-green-50 p-1.5 rounded" title="Stock In"><ArrowDownCircle size={16} /></button>
                          <button onClick={() => { setStockModal({ product: p, type: "out" }); setStockQty(""); setStockReason(""); setStockError(""); }}
                            className="text-orange-500 hover:bg-orange-50 p-1.5 rounded" title="Stock Out"><ArrowUpCircle size={16} /></button>
                          <button onClick={() => handleToggleMute(p)}
                            className={`p-1.5 rounded text-xs font-bold ${p.muted ? "text-gray-400 hover:bg-gray-50" : "text-blue-500 hover:bg-blue-50"}`}
                            title={p.muted ? "Unmute" : "Mute"}>{p.muted ? "🔔" : "🔕"}</button>
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
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-xl">
              <h3 className="font-bold text-maroon text-lg">{editProductId ? "Edit Product" : "Add New Product"}</h3>
              <button onClick={() => { setShowAddModal(false); setEditProductId(null); setAddForm({ ...EMPTY_PRODUCT }); }}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleAddProduct} className="p-5 space-y-3 overflow-y-auto flex-1">
              {/* Product Image */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Product Image (optional)</label>
                <div className="mt-1 flex items-center gap-3">
                  {addForm.image
                    ? <img src={addForm.image} alt="preview" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                    : <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300"><Package size={24} /></div>
                  }
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded text-center transition-colors">
                      Upload Image
                      <input type="file" accept="image/*" className="hidden" onChange={handleProductImageUpload} />
                    </label>
                    <input
                      type="text"
                      placeholder="Or paste image URL"
                      value={addForm.image.startsWith("data:") ? "" : addForm.image}
                      onChange={e => setAddForm(prev => ({ ...prev, image: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-maroon"
                    />
                  </div>
                  {addForm.image && (
                    <button type="button" onClick={() => setAddForm(prev => ({ ...prev, image: "" }))} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Product Name</label>
                <input type="text" required value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">SKU Code (auto-generated)</label>
                <input type="text" value={addForm.sku} onChange={e => setAddForm(p => ({ ...p, sku: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon font-mono bg-gray-50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Category</label>
                <select required value={addForm.category} onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon bg-white">
                  <option value="">— Select Category —</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Unit</label>
                <select value={addForm.unit} onChange={e => setAddForm(p => ({ ...p, unit: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon bg-white">
                  <option value="gm">gm</option>
                  <option value="kg">kg</option>
                  <option value="pc">pc</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Selling Price (₹)</label>
                <input type="number" required min="0" step="0.01" value={addForm.price} onChange={e => setAddForm(p => ({ ...p, price: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Initial Quantity ({addForm.unit}) <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="number" min="0" value={addForm.current_stock_qty} onChange={e => setAddForm(p => ({ ...p, current_stock_qty: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Safety Low Threshold ({addForm.unit})</label>
                <input type="number" min="0" value={addForm.safety_low_threshold} onChange={e => setAddForm(p => ({ ...p, safety_low_threshold: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Description (optional)</label>
                <textarea
                  value={(addForm as any).description}
                  onChange={e => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Short product description for mobile app..."
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon resize-none"
                />
              </div>
              {addError && <p className="text-red-500 text-sm">{addError}</p>}
              <button type="submit" className="w-full bg-maroon text-white font-bold py-2.5 rounded hover:bg-maroon-light transition-colors mt-2">
                {editProductId ? "Save Changes" : "Add Product"}
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
