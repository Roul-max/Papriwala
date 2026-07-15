import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Image as ImageIcon, X, CheckCircle2, EyeOff } from "lucide-react";
import { apiFetch } from "../../lib/apiFetch";
import { useAccess } from "../../hooks/useAccess";

const EMPTY = { name: "", image: "" };

export default function AdminCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [modal, setModal] = useState<{ open: boolean; editing: any | null }>({ open: false, editing: null });
  const [form, setForm] = useState(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const access = useAccess("Inventory");
  const isReadOnly = access === "Read-Only";

  const load = () => apiFetch("/api/categories").then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : []));
  useEffect(() => { load(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const openAdd = () => { setForm(EMPTY); setModal({ open: true, editing: null }); };
  const openEdit = (cat: any) => { setForm({ name: cat.name, image: cat.image || "" }); setModal({ open: true, editing: cat }); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (modal.editing) {
      await apiFetch(`/api/categories/${modal.editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      showToast("Category updated.");
    } else {
      await apiFetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      showToast("Category added.");
    }
    setSaving(false);
    setModal({ open: false, editing: null });
    load();
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
    setDeleteId(null);
    showToast("Category deleted.");
    load();
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-semibold">
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}

      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <h3 className="font-serif text-xl text-maroon font-bold">Product Categories</h3>
        {isReadOnly ? (
          <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded font-semibold">
            <EyeOff size={12} /> Read-Only Mode
          </span>
        ) : (
          <button onClick={openAdd} className="bg-maroon hover:bg-maroon-light text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2">
            <Plus size={16} /> Add Category
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden group">
            <div className="aspect-square relative overflow-hidden bg-gray-100">
              {cat.image ? (
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={48} /></div>
              )}
              {!isReadOnly && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(cat)} className="bg-white p-1.5 rounded shadow text-blue-600 hover:bg-blue-50"><Edit2 size={14} /></button>
                  <button onClick={() => setDeleteId(cat.id)} className="bg-white p-1.5 rounded shadow text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
            <div className="p-3 text-center border-t border-gray-100">
              <h4 className="font-bold text-gray-800">{cat.name}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-serif text-xl text-maroon font-bold">{modal.editing ? "Edit Category" : "Add Category"}</h3>
              <button onClick={() => setModal({ open: false, editing: null })}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
                  placeholder="e.g. Sweets"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Image URL</label>
                <input
                  value={form.image}
                  onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
                  placeholder="https://..."
                />
                {form.image && (
                  <img src={form.image} alt="preview" className="mt-2 h-24 w-full object-cover rounded-lg border border-gray-200" onError={e => (e.currentTarget.style.display = "none")} />
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal({ open: false, editing: null })} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="flex-1 bg-maroon text-white font-semibold py-2.5 rounded-lg hover:bg-maroon-light disabled:opacity-60">
                {saving ? "Saving..." : modal.editing ? "Update" : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <Trash2 size={40} className="text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-800 text-lg mb-2">Delete Category?</h3>
            <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
