import React, { useState, useEffect } from "react";
import { Plus, X, Trash2, EyeOff, CheckCircle2, AlertCircle, Clock, AlertTriangle, Filter } from "lucide-react";
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
  const [employees, setEmployees] = useState<any[]>([]);

  const [showDealerModal, setShowDealerModal] = useState(false);
  const [dealerForm, setDealerForm] = useState({ name: "", address: "", gstin: "", phone: "" });
  const [dealerError, setDealerError] = useState("");

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ expense_code: "EXP_RAW_MATERIAL", amount: "", dealer_id: "", description: "" });
  const [expenseError, setExpenseError] = useState("");

  const [showRawModal, setShowRawModal] = useState(false);
  const [rawForm, setRawForm] = useState({ material_name: "", qty: "", unit: "kg", rate_per_unit: "", dealer_id: "", notes: "", is_paid: false, due_date: new Date(Date.now() + 7*24*60*60*1000).toISOString().split("T")[0] });
  const [rawError, setRawError] = useState("");
  const [rawFilter, setRawFilter] = useState<"all" | "pending" | "overdue" | "paid">("all");

  const access = useAccess("Financial Reports");
  const isReadOnly = access === "Read-Only";

  const fetchAll = () => {
    Promise.all([
      apiFetch("/api/dealers").then(r => r.json()).catch(() => []),
      apiFetch("/api/expenses").then(r => r.json()).catch(() => []),
      apiFetch("/api/orders").then(r => r.json()).catch(() => []),
      apiFetch("/api/products").then(r => r.json()).catch(() => []),
      apiFetch("/api/raw-material-purchases").then(r => r.json()).catch(() => []),
      apiFetch("/api/employees").then(r => r.json()).catch(() => []),
    ]).then(([d, e, o, p, rm, emps]) => { setDealers(d); setExpenses(e); setOrders(o); setProducts(p); setRawPurchases(Array.isArray(rm) ? rm : []); setEmployees(Array.isArray(emps) ? emps : []); });
  };

  useEffect(() => { fetchAll(); }, []);

  // Fire due-alerts check on mount
  useEffect(() => { apiFetch("/api/raw-material-purchases/due-alerts").catch(() => {}); }, []);

  const today = new Date().toISOString().split("T")[0];
  const twoDaysLater = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const pendingPurchases = rawPurchases.filter((r: any) => !r.is_paid);
  const overduePurchases = rawPurchases.filter((r: any) => !r.is_paid && r.due_date && r.due_date < today);
  const dueSoonPurchases = rawPurchases.filter((r: any) => !r.is_paid && r.due_date && r.due_date >= today && r.due_date <= twoDaysLater);
  const totalPending = pendingPurchases.reduce((s: number, r: any) => s + r.qty * r.rate_per_unit, 0);

  const filteredRaw = rawPurchases.filter((r: any) => {
    if (rawFilter === "pending") return !r.is_paid;
    if (rawFilter === "overdue") return !r.is_paid && r.due_date && r.due_date < today;
    if (rawFilter === "paid")    return r.is_paid;
    return true;
  });

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
    if (expenseForm.expense_code === "EXP_SALARY_DRAW" && !expenseForm.dealer_id) {
      setExpenseError("Salary Draw must be linked to an employee."); return;
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
    setRawForm({ material_name: "", qty: "", unit: "kg", rate_per_unit: "", dealer_id: "", notes: "", is_paid: false, due_date: new Date(Date.now() + 7*24*60*60*1000).toISOString().split("T")[0] });
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
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-red-500">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Total Pending</p>
              <p className="text-xl font-bold text-red-600">₹{totalPending.toFixed(0)}</p>
              <p className="text-xs text-gray-400 mt-1">{pendingPurchases.length} unpaid purchase{pendingPurchases.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-orange-500">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Overdue</p>
              <p className="text-xl font-bold text-orange-600">{overduePurchases.length}</p>
              <p className="text-xs text-gray-400 mt-1">Past due date, unpaid</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-yellow-500">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Due Soon</p>
              <p className="text-xl font-bold text-yellow-600">{dueSoonPurchases.length}</p>
              <p className="text-xs text-gray-400 mt-1">Due within 2 days</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-green-500">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Paid</p>
              <p className="text-xl font-bold text-green-600">{rawPurchases.filter((r: any) => r.is_paid).length}</p>
              <p className="text-xs text-gray-400 mt-1">Cleared purchases</p>
            </div>
          </div>

          {/* Due Soon Banner */}
          {dueSoonPurchases.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex items-center gap-3">
              <Clock size={18} className="text-yellow-600 shrink-0" />
              <p className="text-yellow-800 text-sm font-semibold">
                ⚠ {dueSoonPurchases.length} payment{dueSoonPurchases.length > 1 ? "s" : ""} due within 2 days —
                {dueSoonPurchases.map((r: any) => ` ${r.material_name} (₹${(r.qty * r.rate_per_unit).toFixed(0)})`).join(",")}
              </p>
            </div>
          )}
          {overduePurchases.length > 0 && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-center gap-3">
              <AlertTriangle size={18} className="text-red-600 shrink-0" />
              <p className="text-red-800 text-sm font-semibold">
                🚨 {overduePurchases.length} payment{overduePurchases.length > 1 ? "s" : ""} overdue —
                {overduePurchases.map((r: any) => ` ${r.material_name} (₹${(r.qty * r.rate_per_unit).toFixed(0)})`).join(",")}
              </p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-800">Raw Material Purchase Log</h3>
                <div className="flex gap-1 ml-2">
                  {(["all", "pending", "overdue", "paid"] as const).map(f => (
                    <button key={f} onClick={() => setRawFilter(f)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors capitalize ${
                        rawFilter === f ? "bg-maroon text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
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
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRaw.map((r: any) => {
                    const isOverdue  = !r.is_paid && r.due_date && r.due_date < today;
                    const isDueSoon  = !r.is_paid && r.due_date && r.due_date >= today && r.due_date <= twoDaysLater;
                    const rowBg = isOverdue ? "bg-red-50" : isDueSoon ? "bg-yellow-50" : "";
                    return (
                      <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 ${rowBg}`}>
                        <td className="py-3 px-4 text-gray-500 text-xs">{new Date(r.purchase_date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-bold text-gray-800">{r.material_name}</td>
                        <td className="py-3 px-4">{r.qty}</td>
                        <td className="py-3 px-4 text-gray-500">{r.unit}</td>
                        <td className="py-3 px-4">₹{Number(r.rate_per_unit).toFixed(2)}</td>
                        <td className="py-3 px-4 font-bold">₹{(r.qty * r.rate_per_unit).toFixed(2)}</td>
                        <td className="py-3 px-4 text-gray-500 text-xs">{dealers.find((d: any) => d.id === r.dealer_id)?.name || "—"}</td>
                        <td className="py-3 px-4 text-xs">
                          <span className={isOverdue ? "text-red-600 font-bold" : isDueSoon ? "text-yellow-600 font-bold" : "text-gray-500"}>
                            {r.due_date || "—"}
                            {isDueSoon && <span className="ml-1 text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded">Soon</span>}
                            {isOverdue && <span className="ml-1 text-[10px] bg-red-100 text-red-700 px-1 rounded">Overdue</span>}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {r.is_paid
                            ? <span className="flex items-center gap-1 text-green-600 text-xs font-bold"><CheckCircle2 size={12} /> Paid</span>
                            : <button onClick={async () => { await apiFetch(`/api/raw-material-purchases/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_paid: true }) }); fetchAll(); }}
                                className="text-xs bg-green-600 text-white px-2 py-1 rounded font-semibold hover:bg-green-700">
                                Mark Paid
                              </button>
                          }
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-xs">{r.notes || "—"}</td>
                      </tr>
                    );
                  })}
                  {filteredRaw.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-gray-400 italic">No purchases found.</td></tr>}
                </tbody>
              </table>
            </div>
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
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Dealer / Employee</th>
                  <th className="py-3 px-4">Description</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-500 text-xs">{new Date(e.expense_date || Date.now()).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-mono text-xs"><span className="bg-gray-100 px-2 py-1 rounded">{expenseCodeLabel[e.expense_code] || e.expense_code}</span></td>
                    <td className="py-3 px-4 font-bold text-gray-800">₹{Number(e.amount).toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {e.expense_code === "EXP_SALARY_DRAW"
                        ? (() => { const emp = employees.find((em: any) => em.id === e.dealer_id); return emp ? `${emp.full_name || emp.name} (${emp.designation_tag})` : "—"; })()
                        : dealers.find(d => d.id === e.dealer_id)?.name || "—"}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{e.description || "—"}</td>
                  </tr>
                ))}
                {expenses.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-500 italic">No expenses recorded.</td></tr>}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Due Date</label>
                  <input type="date" value={rawForm.due_date} onChange={e => setRawForm(p => ({ ...p, due_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={rawForm.is_paid} onChange={e => setRawForm(p => ({ ...p, is_paid: e.target.checked }))} className="accent-green-600" />
                    Already Paid
                  </label>
                </div>
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
              {expenseForm.expense_code === "EXP_SALARY_DRAW" && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Employee <span className="text-red-500">*</span></label>
                  <select required value={expenseForm.dealer_id} onChange={e => setExpenseForm(p => ({ ...p, dealer_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon bg-white">
                    <option value="">— Select Employee —</option>
                    {employees.filter(e => !e.last_working_date || e.last_working_date >= new Date().toISOString().split("T")[0]).map(e => (
                      <option key={e.id} value={e.id}>{e.full_name || e.name} ({e.designation_tag})</option>
                    ))}
                  </select>
                </div>
              )}
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