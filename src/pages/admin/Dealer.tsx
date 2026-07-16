import React, { useState, useEffect } from "react";
import { Plus, X, Trash2, EyeOff } from "lucide-react";
import { apiFetch } from "../../lib/apiFetch";
import { useAccess } from "../../hooks/useAccess";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function DealerExpenses() {
  const [tab, setTab] = useState<"overview" | "rawmat">("overview");
  const [dealers, setDealers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [rawPurchases, setRawPurchases] = useState<any[]>([]);

  const [showDealerModal, setShowDealerModal] = useState(false);
  const [dealerForm, setDealerForm] = useState({ name: "", address: "", gstin: "", phone: "" });
  const [dealerError, setDealerError] = useState("");

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ expense_code: "EXP_RAW_MATERIAL", amount: "", dealer_id: "", description: "" });
  const [expenseError, setExpenseError] = useState("");

  const [showRawModal, setShowRawModal] = useState(false);
  const [rawForm, setRawForm] = useState({ material_name: "", qty: "", unit: "kg", rate_per_unit: "", dealer_id: "", notes: "" });
  const [rawError, setRawError] = useState("");

  const access = useAccess("Financial Reports");
  const isReadOnly = access === "Read-Only";

  const fetchAll = () => {
    Promise.all([
      apiFetch("/api/dealers").then(r => r.json()).catch(() => []),
      apiFetch("/api/expenses").then(r => r.json()).catch(() => []),
      apiFetch("/api/orders").then(r => r.json()).catch(() => []),
      apiFetch("/api/products").then(r => r.json()).catch(() => []),
      apiFetch("/api/raw-material-purchases").then(r => r.json()).catch(() => []),
    ]).then(([d, e, o, p, rm]) => { setDealers(d); setExpenses(e); setOrders(o); setProducts(p); setRawPurchases(Array.isArray(rm) ? rm : []); });
  };

  useEffect(() => { fetchAll(); }, []);

  const totalPOSInflows = orders.reduce((s, o) => s + (Number(o.grand_total) || 0), 0);
  const totalStockValue = products.reduce((s, p) => s + (Number(p.unit_purchase_cost) * Number(p.current_stock_qty) || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const netIncome = totalPOSInflows - totalExpenses;
  // §2.4.3 Outstanding procurement balances due to dealers
  const outstandingPayables = expenses
    .filter(e => e.expense_code === "EXP_RAW_MATERIAL")
    .reduce((s, e) => s + Number(e.amount), 0);

  const handleAddDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    setDealerError("");
    if (dealerForm.name.length > 100) { setDealerError("Name must be ≤ 100 characters."); return; }
    if (!GSTIN_REGEX.test(dealerForm.gstin)) { setDealerError("Invalid GSTIN format (15-char alphanumeric)."); return; }
    if (!/^\d{10}$/.test(dealerForm.phone)) { setDealerError("Phone must be exactly 10 digits."); return; }
    await apiFetch("/api/dealers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dealerForm) });
    setShowDealerModal(false);
    setDealerForm({ name: "", address: "", gstin: "", phone: "" });
    fetchAll();
  };

  const handleDeleteDealer = async (id: string) => {
    if (!confirm("Delete this dealer?")) return;
    await apiFetch(`/api/dealers/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError("");
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) { setExpenseError("Enter a valid amount."); return; }
    if (expenseForm.expense_code === "EXP_RAW_MATERIAL" && !expenseForm.dealer_id) {
      setExpenseError("Raw Material expenses must be linked to a dealer."); return;
    }
    await apiFetch("/api/expenses", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...expenseForm, amount: Number(expenseForm.amount), dealer_id: expenseForm.dealer_id || null })
    });
    setShowExpenseModal(false);
    setExpenseForm({ expense_code: "EXP_RAW_MATERIAL", amount: "", dealer_id: "", description: "" });
    fetchAll();
  };

  const handleAddRawPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setRawError("");
    if (!rawForm.material_name || !rawForm.qty || !rawForm.rate_per_unit) { setRawError("Fill all required fields."); return; }
    await apiFetch("/api/raw-material-purchases", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rawForm, qty: Number(rawForm.qty), rate_per_unit: Number(rawForm.rate_per_unit), dealer_id: rawForm.dealer_id || null })
    });
    setShowRawModal(false);
    setRawForm({ material_name: "", qty: "", unit: "kg", rate_per_unit: "", dealer_id: "", notes: "" });
    fetchAll();
  };

  const expenseCodeLabel: Record<string, string> = {
    EXP_RAW_MATERIAL: "Raw Material",
    EXP_SALARY_DRAW: "Salary Draw",
    EXP_MISC_OPERATIONAL: "Misc Operational",
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex gap-2">
        <button onClick={() => setTab("overview")} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${tab === "overview" ? "bg-maroon text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>Dealer & Expenses</button>
        <button onClick={() => setTab("rawmat")} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${tab === "rawmat" ? "bg-maroon text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>Raw Material Purchases</button>
      </div>

      {tab === "rawmat" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-800">Raw Material Purchase Log</h3>
            {!isReadOnly && (
              <button onClick={() => { setShowRawModal(true); setRawError(""); }}
                className="bg-maroon hover:bg-maroon-light text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1">
                <Plus size={14} /> Log Purchase
              </button>
            )}
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Material</th>
                  <th className="py-3 px-4">Qty</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Rate/Unit</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Dealer</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rawPurchases.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-500 text-xs">{new Date(r.purchase_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-bold text-gray-800">{r.material_name}</td>
                    <td className="py-3 px-4">{r.qty}</td>
                    <td className="py-3 px-4 text-gray-500">{r.unit}</td>
                    <td className="py-3 px-4">₹{Number(r.rate_per_unit).toFixed(2)}</td>
                    <td className="py-3 px-4 font-bold">₹{(r.qty * r.rate_per_unit).toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{dealers.find(d => d.id === r.dealer_id)?.name || "—"}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{r.notes || "—"}</td>
                  </tr>
                ))}
                {rawPurchases.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-gray-400 italic">No raw material purchases recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "overview" && (<>
      {/* Balance Sheet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
          <p className="text-sm text-gray-500 font-semibold mb-1">Total POS Inflows</p>
          <p className="text-2xl font-bold text-gray-800">₹{totalPOSInflows.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-500 font-semibold mb-1">Remaining Stock Value</p>
          <p className="text-2xl font-bold text-gray-800">₹{totalStockValue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
          <p className="text-sm text-gray-500 font-semibold mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-800">₹{totalExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-maroon">
          <p className="text-sm text-gray-500 font-semibold mb-1">Net Income</p>
          <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>₹{netIncome.toFixed(2)}</p>
        </div>
      </div>

      {/* §2.4.3 Liabilities & Equity Ledger */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider">Liabilities &amp; Equity Ledger</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-100 rounded-lg p-3 bg-red-50">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Outstanding Dealer Payables</p>
            <p className="text-xl font-bold text-red-600">₹{outstandingPayables.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">Raw material procurement balances due to dealers</p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3 bg-orange-50">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Salary Draws</p>
            <p className="text-xl font-bold text-orange-600">₹{expenses.filter(e => e.expense_code === "EXP_SALARY_DRAW").reduce((s, e) => s + Number(e.amount), 0).toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">Payroll &amp; owner compensation disbursed</p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3 bg-yellow-50">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Misc Operational Costs</p>
            <p className="text-xl font-bold text-yellow-600">₹{expenses.filter(e => e.expense_code === "EXP_MISC_OPERATIONAL").reduce((s, e) => s + Number(e.amount), 0).toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">Rent, utilities, maintenance &amp; auxiliary</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        {/* Dealer Roster */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-800">Dealer Roster</h3>
            {isReadOnly ? (
              <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded font-semibold"><EyeOff size={12} /> Read-Only</span>
            ) : (
              <button onClick={() => { setShowDealerModal(true); setDealerError(""); }}
                className="bg-maroon hover:bg-maroon-light text-white px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1">
                <Plus size={14} /> Add Dealer
              </button>
            )}
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {dealers.map((d) => (
                  <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-800">{d.name}</td>
                    <td className="py-3 px-4 font-mono text-xs">{d.gstin}</td>
                    <td className="py-3 px-4 text-gray-600">{d.phone}</td>
                    <td className="py-3 px-4">
                      {!isReadOnly && <button onClick={() => handleDeleteDealer(d.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                    </td>
                  </tr>
                ))}
                {dealers.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-gray-500 italic">No dealers registered.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expense Ledger */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-800">Expense Ledger</h3>
            {!isReadOnly && (
              <button onClick={() => { setShowExpenseModal(true); setExpenseError(""); }}
                className="bg-maroon hover:bg-maroon-light text-white px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1">
                <Plus size={14} /> Log Expense
              </button>
            )}
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Dealer</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-500 text-xs">{new Date(e.expense_date || Date.now()).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-mono text-xs"><span className="bg-gray-100 px-2 py-1 rounded">{expenseCodeLabel[e.expense_code] || e.expense_code}</span></td>
                    <td className="py-3 px-4 font-bold text-gray-800">₹{Number(e.amount).toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{dealers.find(d => d.id === e.dealer_id)?.name || "—"}</td>
                  </tr>
                ))}
                {expenses.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-gray-500 italic">No expenses recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      </>)}

      {/* Add Raw Material Purchase Modal */}
      {showRawModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-xl">
              <h3 className="font-bold text-maroon text-lg">Log Raw Material Purchase</h3>
              <button onClick={() => setShowRawModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleAddRawPurchase} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Material Name</label>
                <input type="text" required value={rawForm.material_name} onChange={e => setRawForm(p => ({ ...p, material_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Qty</label>
                  <input type="number" min="0.01" step="0.01" required value={rawForm.qty} onChange={e => setRawForm(p => ({ ...p, qty: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Unit</label>
                  <input type="text" value={rawForm.unit} onChange={e => setRawForm(p => ({ ...p, unit: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" placeholder="kg, ltr, pcs" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Rate/Unit (₹)</label>
                  <input type="number" min="0" step="0.01" required value={rawForm.rate_per_unit} onChange={e => setRawForm(p => ({ ...p, rate_per_unit: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Dealer (optional)</label>
                <select value={rawForm.dealer_id} onChange={e => setRawForm(p => ({ ...p, dealer_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon bg-white">
                  <option value="">— Select Dealer —</option>
                  {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Notes</label>
                <input type="text" value={rawForm.notes} onChange={e => setRawForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
              </div>
              {rawError && <p className="text-red-500 text-sm">{rawError}</p>}
              <button type="submit" className="w-full bg-maroon text-white font-bold py-2.5 rounded hover:bg-maroon-light transition-colors mt-2">Log Purchase</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Dealer Modal */}
      {showDealerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-xl">
              <h3 className="font-bold text-maroon text-lg">Add Dealer</h3>
              <button onClick={() => setShowDealerModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleAddDealer} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Dealer Name (max 100 chars)</label>
                <input type="text" maxLength={100} required value={dealerForm.name} onChange={e => setDealerForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Address</label>
                <textarea value={dealerForm.address} onChange={e => setDealerForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" rows={2} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">GSTIN (15-char)</label>
                <input type="text" maxLength={15} required value={dealerForm.gstin} onChange={e => setDealerForm(p => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                  placeholder="e.g. 10AAAAA1234A1Z1"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon font-mono" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Phone (10 digits)</label>
                <input type="text" maxLength={10} required value={dealerForm.phone} onChange={e => setDealerForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "") }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
              </div>
              {dealerError && <p className="text-red-500 text-sm">{dealerError}</p>}
              <button type="submit" className="w-full bg-maroon text-white font-bold py-2.5 rounded hover:bg-maroon-light transition-colors mt-2">Add Dealer</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-xl">
              <h3 className="font-bold text-maroon text-lg">Log Expense</h3>
              <button onClick={() => setShowExpenseModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleAddExpense} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Expense Category</label>
                <select value={expenseForm.expense_code} onChange={e => setExpenseForm(p => ({ ...p, expense_code: e.target.value, dealer_id: "" }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon bg-white">
                  <option value="EXP_RAW_MATERIAL">Raw Material (EXP_RAW_MATERIAL)</option>
                  <option value="EXP_SALARY_DRAW">Salary Draw (EXP_SALARY_DRAW)</option>
                  <option value="EXP_MISC_OPERATIONAL">Misc Operational (EXP_MISC_OPERATIONAL)</option>
                </select>
              </div>
              {expenseForm.expense_code === "EXP_RAW_MATERIAL" && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Linked Dealer <span className="text-red-500">*</span></label>
                  <select required value={expenseForm.dealer_id} onChange={e => setExpenseForm(p => ({ ...p, dealer_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon bg-white">
                    <option value="">— Select Dealer —</option>
                    {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Amount (₹)</label>
                <input type="number" min="0.01" step="0.01" required value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Description</label>
                <input type="text" value={expenseForm.description} onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
              </div>
              {expenseError && <p className="text-red-500 text-sm">{expenseError}</p>}
              <button type="submit" className="w-full bg-maroon text-white font-bold py-2.5 rounded hover:bg-maroon-light transition-colors mt-2">Log Expense</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}