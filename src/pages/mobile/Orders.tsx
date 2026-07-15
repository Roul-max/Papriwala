import { useState, useEffect } from "react";
import { ChevronLeft, FileText, Check, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/apiFetch";

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [localHistory, setLocalHistory] = useState<any[]>([]);
  const [tab, setTab] = useState<"live" | "history">("live");

  useEffect(() => {
    apiFetch("/api/orders").then(r => r.json()).then(data => setOrders(Array.isArray(data) ? data : []));
    // §3.6 — Device-local history from localStorage
    const saved = localStorage.getItem("orderHistory");
    if (saved) setLocalHistory(JSON.parse(saved));
  }, []);

  const steps = ["Pending", "In-Preparation", "Ready to Serve", "Paid"];

  return (
    <div className="flex flex-col min-h-full bg-cream-light pb-24">
      <div className="bg-white p-4 flex items-center border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="mr-4 text-maroon"><ChevronLeft size={24} /></button>
        <h2 className="font-serif text-xl text-gold font-bold uppercase tracking-wider">ORDERS</h2>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-white border-b border-gray-100 px-4 gap-4">
        <button onClick={() => setTab("live")} className={`py-3 text-sm font-semibold border-b-2 transition-colors ${tab === "live" ? "border-maroon text-maroon" : "border-transparent text-gray-400"}`}>
          Live Orders
        </button>
        <button onClick={() => setTab("history")} className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1 ${tab === "history" ? "border-maroon text-maroon" : "border-transparent text-gray-400"}`}>
          <Smartphone size={14} /> Device History
        </button>
      </div>

      <div className="p-4 space-y-4">
        {tab === "live" && (
          orders.length === 0 ? (
            <div className="text-center text-gray-400 py-12 flex flex-col items-center">
              <FileText size={48} className="mb-4 opacity-20" />
              <p>No orders yet</p>
            </div>
          ) : (
            orders.map((order, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-3">
                  <span className="font-bold text-gray-800">Order #{order.id || i + 1}</span>
                  <span className="text-xs text-gray-500">{order.timestamp ? new Date(order.timestamp).toLocaleString() : ""}</span>
                </div>

                <div className="mb-5 mt-4">
                  <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 right-0 top-1/2 h-[3px] bg-gray-100 -z-10 -translate-y-1/2 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 transition-all duration-500"
                        style={{ width: `${(Math.max(0, steps.indexOf(order.order_status)) / (steps.length - 1)) * 100}%` }} />
                    </div>
                    {steps.map((step, idx) => {
                      const currentIdx = steps.indexOf(order.order_status) >= 0 ? steps.indexOf(order.order_status) : 0;
                      const isCompleted = idx <= currentIdx;
                      const isActive = idx === currentIdx;
                      return (
                        <div key={step} className="flex flex-col items-center gap-1 z-10 bg-white px-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors shadow-sm ${isCompleted ? "bg-green-500 text-white" : "bg-white border-2 border-gray-200 text-gray-400"}`}>
                            {isCompleted ? <Check size={12} strokeWidth={3} /> : idx + 1}
                          </div>
                          <span className={`text-[10px] font-bold text-center uppercase tracking-tight ${isActive ? "text-maroon" : isCompleted ? "text-gray-700" : "text-gray-400"}`}>
                            {step === "In-Preparation" ? "Preparing" : step === "Ready to Serve" ? "Ready" : step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                  <span className="text-sm font-semibold text-gray-600">Total Amount</span>
                  <span className="font-bold text-lg text-maroon">₹{Number(order.grand_total).toFixed(2)}</span>
                </div>
              </div>
            ))
          )
        )}

        {tab === "history" && (
          localHistory.length === 0 ? (
            <div className="text-center text-gray-400 py-12 flex flex-col items-center">
              <Smartphone size={48} className="mb-4 opacity-20" />
              <p>No local order history on this device</p>
            </div>
          ) : (
            localHistory.map((order, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-800 text-sm">Order #{i + 1}</span>
                  <span className="text-xs text-gray-400">{new Date(order.timestamp).toLocaleString()}</span>
                </div>
                <div className="space-y-1 mb-3">
                  {order.items?.map((item: any, j: number) => (
                    <div key={j} className="flex justify-between text-xs text-gray-600">
                      <span>{item.name} {item.size ? `(${item.size})` : ""} x{item.qty}</span>
                      <span>₹{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500 capitalize">{order.method} • Table {order.tableId}</span>
                  <span className="font-bold text-maroon">₹{Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
