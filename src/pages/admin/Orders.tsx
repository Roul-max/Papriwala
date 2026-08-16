import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Check, Clock, MessageCircle, EyeOff, Filter, Printer, Trash2, X } from "lucide-react";
import { useAccess } from "../../hooks/useAccess";
import { apiFetch } from "../../lib/apiFetch";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  name: string;
  size?: string;
  unit?: string;
  price: number;
  qty: number;
}

interface Order {
  id: string;
  timestamp: string;
  order_status: string;
  order_source: string;
  table_id?: string;
  payment_mode?: string;
  created_by?: string;
  customer_phone?: string;
  items: OrderItem[];
  grand_total: number;
  tax_collected?: number;
  discount_applied?: number;
}

type Tab = "orders" | "deleted";
type FilterMode = "all" | "month" | "custom";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function paymentLabel(order: Order): string {
  const raw = (order as any).payment_method || order.payment_mode || "—";
  if (raw === "upi")  return "UPI / QR";
  if (raw === "card") return "Credit / Debit Card";
  if (raw === "cash") return "Counter Cash";
  return raw;
}

function printOrder(order: Order) {
  const dash = `<div style="text-align:center;font-size:10px;margin:4px 0">----------------------------------------</div>`;
  const dt   = order.timestamp ? new Date(order.timestamp).toLocaleString() : "—";

  const itemsHtml = order.items.map(it =>
    `<div style="display:flex;justify-content:space-between;font-size:10px;margin:2px 0">
      <span style="flex:2">${it.name}${it.size ? ` (${it.size})` : ""} x${it.qty || 1}</span>
      <span>₹${((it.price || 0) * (it.qty || 1)).toFixed(2)}</span>
    </div>`
  ).join("");

  const discountRow = Number(order.discount_applied) > 0
    ? `<div style="display:flex;justify-content:space-between;font-size:10px"><span>Discount</span><span>-₹${Number(order.discount_applied).toFixed(2)}</span></div>`
    : "";

  const html = `<html><head><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',monospace;font-size:11px;width:300px;margin:0 auto;padding:10px 6px}
    @page{size:80mm auto;margin:0}
  </style></head><body>
    <div style="text-align:center;font-size:14px;font-weight:bold">Shri Badrinarayan Papriwale</div>
    <div style="text-align:center;font-size:10px">Sweets | Namkeen | Bakery</div>
    <div style="text-align:center;font-size:10px">Main Road, Buxar, Bihar</div>
    ${dash}
    <div style="display:flex;justify-content:space-between;font-size:10px"><span>Order: ${order.id}</span><span>${dt}</span></div>
    <div style="font-size:10px">Source: ${order.order_source || "—"} | Payment: ${paymentLabel(order)}</div>
    ${order.created_by ? `<div style="font-size:10px">Cashier: ${order.created_by}</div>` : ""}
    ${dash}
    ${itemsHtml}
    ${dash}
    ${discountRow}
    <div style="display:flex;justify-content:space-between;font-size:10px"><span>Tax (GST)</span><span>₹${Number(order.tax_collected || 0).toFixed(2)}</span></div>
    ${dash}
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold"><span>Grand Total</span><span>₹${Number(order.grand_total).toFixed(2)}</span></div>
    ${dash}
    <div style="text-align:center;font-weight:bold;margin-top:4px">Thank You &amp; Visit Again!</div>
  </body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open(); doc.write(html); doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 300);
}

const STATUS_COLOR: Record<string, string> = {
  "Pending":        "bg-yellow-100 text-yellow-700",
  "Ready to Serve": "bg-green-100 text-green-700",
  "Paid":           "bg-gray-100 text-gray-500",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminOrders() {
  const [tab,         setTab]         = useState<Tab>("orders");
  const [orders,      setOrders]      = useState<Order[]>([]);
  const [deletedBills, setDeletedBills] = useState<any[]>([]);
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [analytics,   setAnalytics]   = useState({ totalRevenue: 0, totalOrders: 0 });
  const [filterMode,  setFilterMode]  = useState<FilterMode>("all");
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterFrom,  setFilterFrom]  = useState("");
  const [filterTo,    setFilterTo]    = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const access     = useAccess("Orders");
  const isReadOnly = access === "Read-Only";

  const fetchOrders    = () => apiFetch("/api/orders").then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : []));
  const fetchAnalytics = () => apiFetch("/api/analytics").then(r => r.json()).then(d => { if (d && !d.error) setAnalytics(d); });
  const fetchDeletedBills = () => apiFetch("/api/deleted-bills").then(r => r.json()).then(d => setDeletedBills(Array.isArray(d) ? d : []));

  useEffect(() => { fetchOrders(); fetchAnalytics(); fetchDeletedBills(); }, []);

  const handleSetReady = async (orderId: string) => {
    await apiFetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_status: "Ready to Serve" }),
    });
    fetchOrders();
  };

  const handleSetPaid = async (orderId: string) => {
    await apiFetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_status: "Paid" }),
    });
    fetchOrders();
    fetchAnalytics();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await apiFetch(`/api/orders/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    fetchOrders();
    fetchAnalytics();
    fetchDeletedBills();
  };

  const filteredOrders = orders
    .filter(o => {
      if (o.order_status === "In-Preparation") return false;
      if (!o.timestamp) return filterMode === "all";
      if (filterMode === "month")  return o.timestamp.startsWith(filterMonth);
      if (filterMode === "custom" && filterFrom && filterTo) {
        const d = o.timestamp.slice(0, 10);
        return d >= filterFrom && d <= filterTo;
      }
      return true;
    })
    .sort((a, b) => (b.timestamp ? new Date(b.timestamp).getTime() : 0) - (a.timestamp ? new Date(a.timestamp).getTime() : 0));

  const totalPrepared = filteredOrders.filter(o => ["Ready to Serve", "Paid"].includes(o.order_status)).length;

  const metrics = [
    { label: "Total Daily Orders", val: String(analytics.totalOrders) },
    { label: "Gross Revenue",      val: `₹${analytics.totalRevenue.toFixed(0)}` },
    { label: "Total Prepared",     val: String(totalPrepared) },
  ];

  return (
    <div className="space-y-6">

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button onClick={() => setTab("orders")}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            tab === "orders" ? "border-maroon text-maroon" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>Orders</button>
        <button onClick={() => setTab("deleted")}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            tab === "deleted" ? "border-red-500 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>
          Deleted Bills {deletedBills.length > 0 && <span className="ml-1 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">{deletedBills.length}</span>}
        </button>
      </div>

      {/* ── Deleted Bills Tab ── */}
      {tab === "deleted" && (
        <div className="space-y-3">
          {deletedBills.length === 0 ? (
            <div className="bg-white p-8 text-center text-gray-400 rounded-lg border border-gray-100">No deleted bills.</div>
          ) : deletedBills.map(bill => (
            <div key={bill.id} className="bg-white rounded-lg border border-red-100 shadow-sm overflow-hidden">
              <div className="p-4 flex items-center justify-between bg-red-50 border-b border-red-100 flex-wrap gap-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-bold text-red-700 text-lg">#{bill.id}</span>
                  <span className="text-gray-500 text-sm">₹{Number(bill.grand_total).toFixed(2)}</span>
                  <span className="text-xs text-gray-500">{bill.timestamp ? new Date(bill.timestamp).toLocaleString() : "—"}</span>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">DELETED</span>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  <span>Deleted by: <span className="font-semibold text-gray-700">{bill.deleted_by}</span></span>
                  <span className="ml-3">{bill.deleted_at ? new Date(bill.deleted_at).toLocaleString() : ""}</span>
                </div>
              </div>
              <div className="p-4 text-sm text-gray-600 space-y-1">
                {(bill.items || []).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.name} x{item.qty}</span>
                    <span>₹{(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Orders Tab ── */}
      {tab === "orders" && (<>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-semibold">{m.label}</span>
            <span className="block text-xl font-bold text-gray-800 mt-1">{m.val}</span>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-wrap items-center gap-3">
        <Filter size={15} className="text-gray-400" />
        <span className="text-xs font-semibold text-gray-500 uppercase">Filter:</span>
        {(["all", "month", "custom"] as FilterMode[]).map(m => (
          <button key={m} onClick={() => setFilterMode(m)}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${filterMode === m ? "bg-maroon text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {m === "all" ? "All Orders" : m === "month" ? "By Month" : "Custom Range"}
          </button>
        ))}
        {filterMode === "month" && (
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
        )}
        {filterMode === "custom" && (
          <>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
          </>
        )}
        <span className="ml-auto text-xs text-gray-400">{filteredOrders.length} order(s)</span>
      </div>

      {/* Orders List */}
      <div className="space-y-4 overflow-y-auto" style={{ maxHeight: "calc(7 * 120px)" }}>
        {filteredOrders.length === 0 ? (
          <div className="bg-white p-8 text-center text-gray-500 rounded-lg border border-gray-100">No orders found.</div>
        ) : filteredOrders.map(order => (
          <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">

            {/* Order header row */}
            <div className="p-4 flex items-center justify-between bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-bold text-maroon text-lg">#{order.id}</span>
                <span className="text-gray-500 text-sm flex items-center gap-1">
                  <Clock size={14} /> {order.timestamp ? relativeTime(order.timestamp) : "—"}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLOR[order.order_status] || "bg-gray-100 text-gray-600"}`}>
                  {order.order_status?.toUpperCase()}
                </span>
                <span className="text-sm font-medium text-gray-700">Source: [{order.order_source}]</span>
                {order.table_id && <span className="text-sm text-gray-600">Table: {order.table_id}</span>}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{paymentLabel(order)}</span>
                <span className="text-sm text-gray-600">Items: {order.items?.length || 0}</span>
                <span className="text-sm font-bold text-maroon">₹{Number(order.grand_total).toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2">
                {isReadOnly && (
                  <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded font-semibold">
                    <EyeOff size={12} /> Read-Only
                  </span>
                )}
                <button onClick={() => printOrder(order)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1">
                  <Printer size={13} /> Print
                </button>
                {!isReadOnly && (
                  <button onClick={() => setDeleteId(order.id)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1">
                    <Trash2 size={13} /> Delete
                  </button>
                )}

                {!isReadOnly && order.order_status === "Pending" && (
                  <button onClick={() => handleSetReady(order.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2">
                    <Check size={16} /> SET READY
                  </button>
                )}
                {!isReadOnly && order.order_status === "Ready to Serve" && (
                  <button onClick={() => handleSetPaid(order.id)}
                    className="bg-maroon hover:bg-maroon-light text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2">
                    <Check size={16} /> MARK PAID
                  </button>
                )}
                <button onClick={() => setExpanded(expanded === order.id ? null : order.id)} className="p-2 text-gray-500 hover:text-maroon">
                  {expanded === order.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>
            </div>

            {/* Expanded detail */}
            {expanded === order.id && (
              <div className="p-4 bg-white grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">Line Items</h4>
                  <div className="space-y-3">
                    {order.items?.length > 0 ? order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <div>
                          <span className="font-semibold">{item.name} {item.size ? `(${item.size})` : ""}</span>
                          {item.unit && <span className="text-gray-400 text-xs ml-1">{item.unit}</span>}
                          {item.qty > 1 && <span className="text-gray-400 text-xs ml-1">x{item.qty}</span>}
                        </div>
                        <span>₹{(item.price * item.qty).toFixed(2)}</span>
                      </div>
                    )) : <p className="text-gray-400 text-sm italic">No item details.</p>}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded border border-gray-100">
                  <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">Summary</h4>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base</span>
                      <span>₹{(Number(order.grand_total) - Number(order.tax_collected || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">GST</span>
                      <span>₹{Number(order.tax_collected || 0).toFixed(2)}</span>
                    </div>
                    {Number(order.discount_applied) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-₹{Number(order.discount_applied).toFixed(2)}</span>
                      </div>
                    )}
                    {order.created_by && (
                      <div className="flex justify-between text-gray-500 text-xs border-t pt-2 mt-2">
                        <span>Processed by</span>
                        <span className="font-semibold">{order.created_by}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t text-maroon">
                      <span>Net Total</span>
                      <span>₹{Number(order.grand_total).toFixed(2)}</span>
                    </div>
                  </div>
                  {order.customer_phone && (
                    <a href={`https://wa.me/91${order.customer_phone}`} target="_blank" rel="noreferrer"
                      className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold py-2 rounded shadow transition-colors flex items-center justify-center gap-2 text-sm">
                      <MessageCircle size={16} /> Contact Customer
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      </>)}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-gray-800 text-lg">Delete Order #{deleteId}?</h3>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
