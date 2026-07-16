import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Check, Clock, MessageCircle, EyeOff, Filter } from "lucide-react";
import { useAccess } from "../../hooks/useAccess";
import { apiFetch } from "../../lib/apiFetch";

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState({ totalRevenue: 0, totalOrders: 0 });
  const [filterMode, setFilterMode] = useState<"all" | "month" | "custom">("all");
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const fetchOrders = () => apiFetch("/api/orders").then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : []));
  const fetchAnalytics = () => apiFetch("/api/analytics").then(r => r.json()).then(d => { if (d && typeof d === "object" && !d.error) setAnalytics(d); });

  useEffect(() => { fetchOrders(); fetchAnalytics(); }, []);

  const handleSetPreparing = async (orderId: string) => {
    await apiFetch(`/api/orders/${orderId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_status: "In-Preparation" })
    });
    fetchOrders();
  };

  const handleSetReady = async (orderId: string) => {
    await apiFetch(`/api/orders/${orderId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_status: "Ready to Serve" })
    });
    fetchOrders();
  };

  const handleSetPaid = async (orderId: string) => {
    await apiFetch(`/api/orders/${orderId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_status: "Paid" })
    });
    fetchOrders();
    fetchAnalytics();
  };

  const relativeTime = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff} Secs Ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} Mins Ago`;
    return `${Math.floor(diff / 3600)} Hrs Ago`;
  };

  const access = useAccess("Orders");
  const isReadOnly = access === "Read-Only";

  const filteredOrders = orders.filter(o => {
    if (!o.timestamp) return filterMode === "all";
    if (filterMode === "month") return o.timestamp.startsWith(filterMonth);
    if (filterMode === "custom" && filterFrom && filterTo) {
      const d = o.timestamp.slice(0, 10);
      return d >= filterFrom && d <= filterTo;
    }
    return true;
  });

  const liveQueue = filteredOrders.filter(o => o.order_status !== "Paid").length;
  const totalPrepared = filteredOrders.filter(o => ["Ready to Serve", "Paid"].includes(o.order_status)).length;

  const metrics = [
    { label: "Total Daily Orders", val: String(analytics.totalOrders) },
    { label: "Gross Intraday Revenue", val: `₹${analytics.totalRevenue.toFixed(0)}` },
    { label: "Total Prepared Items", val: String(totalPrepared) },
    { label: "Live Active Prep Queue", val: String(liveQueue) },
    { label: "Mean Prep Velocity", val: "~8 mins" },
  ];

  const statusColor: Record<string, string> = {
    "Pending": "bg-yellow-100 text-yellow-700",
    "In-Preparation": "bg-blue-100 text-blue-700",
    "Ready to Serve": "bg-green-100 text-green-700",
    "Paid": "bg-gray-100 text-gray-500",
  };

  return (
    <div className="space-y-6">
      {/* 5 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-semibold">{m.label}</span>
            <span className="block text-xl font-bold text-gray-800 mt-1">{m.val}</span>
          </div>
        ))}
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-wrap items-center gap-3">
        <Filter size={15} className="text-gray-400" />
        <span className="text-xs font-semibold text-gray-500 uppercase">Filter:</span>
        {(["all", "month", "custom"] as const).map(m => (
          <button key={m} onClick={() => setFilterMode(m)}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${filterMode === m ? "bg-maroon text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {m === "all" ? "All Orders" : m === "month" ? "By Month" : "Custom Range"}
          </button>
        ))}
        {filterMode === "month" && (
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm" />
        )}
        {filterMode === "custom" && (
          <>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm" />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm" />
          </>
        )}
        <span className="ml-auto text-xs text-gray-400">{filteredOrders.length} order(s)</span>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white p-8 text-center text-gray-500 rounded-lg border border-gray-100">No orders found for selected filter.</div>
        ) : (
          filteredOrders.map((order: any) => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              {/* Collapsed View */}
              <div className="p-4 flex items-center justify-between bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-bold text-maroon text-lg">#{order.id}</span>
                  <span className="text-gray-500 text-sm flex items-center gap-1">
                    <Clock size={14} /> {order.timestamp ? relativeTime(order.timestamp) : "—"}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor[order.order_status] || "bg-gray-100 text-gray-600"}`}>
                    {order.order_status?.toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-gray-700">Source: [{order.order_source}]</span>
                  {order.table_id && <span className="text-sm text-gray-600">Table: {order.table_id}</span>}
                  <span className="text-sm text-gray-600">Items: {order.items?.length || 0}</span>
                </div>
                <div className="flex items-center gap-3">
                  {isReadOnly && (
                    <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded font-semibold">
                      <EyeOff size={12} /> Read-Only
                    </span>
                  )}
                  {!isReadOnly && order.order_status === "Pending" && (
                    <button onClick={() => handleSetPreparing(order.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2">
                      <Check size={16} /> SET PREPARING
                    </button>
                  )}
                  {!isReadOnly && order.order_status === "In-Preparation" && (
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

              {/* Expanded View */}
              {expanded === order.id && (
                <div className="p-4 bg-white grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">Line Items</h4>
                    <div className="space-y-3">
                      {order.items?.length > 0 ? order.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <div>
                            <span className="font-semibold">{item.name} {item.size ? `(${item.size})` : ""}</span>
                            {item.qty > 1 && <span className="text-gray-400 text-xs ml-1">x{item.qty}</span>}
                            {item.note && <p className="text-xs text-red-500 italic">Note: {item.note}</p>}
                          </div>
                          <span>₹{(item.price * item.qty).toFixed(2)}</span>
                        </div>
                      )) : (
                        <p className="text-gray-400 text-sm italic">No item details available.</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">Summary & Contact</h4>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between"><span className="text-gray-600">Base</span><span>₹{(Number(order.grand_total) - Number(order.tax_collected || 0)).toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">GST</span><span>₹{Number(order.tax_collected || 0).toFixed(2)}</span></div>
                      {Number(order.discount_applied) > 0 && (
                        <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{Number(order.discount_applied).toFixed(2)}</span></div>
                      )}
                      {order.created_by && (
                        <div className="flex justify-between text-gray-500 text-xs border-t pt-2 mt-2">
                          <span>Processed by</span><span className="font-semibold">{order.created_by}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t text-maroon">
                        <span>Net Total</span><span>₹{Number(order.grand_total).toFixed(2)}</span>
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
          ))
        )}
      </div>
    </div>
  );
}
