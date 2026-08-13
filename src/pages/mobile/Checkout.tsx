import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { useCart } from "../../hooks/useCart";
import { apiFetch } from "../../lib/apiFetch";

export default function Checkout() {
  const navigate = useNavigate();
  const { total, items, clearCart } = useCart();
  const [method, setMethod] = useState("upi");
  const [success, setSuccess] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [loading, setLoading] = useState(false);

  const isGuest = !localStorage.getItem("customerToken");

  const urlParams = new URLSearchParams(window.location.search);
  const tableId = urlParams.get("table_id") || sessionStorage.getItem("qr_table_id") || "Counter";

  if (isGuest) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-cream-light p-6 text-center pb-20">
        <p className="text-gray-600 mb-4 font-semibold">Please sign in with your phone number to place an order.</p>
        <button onClick={() => navigate("/login")} className="w-full bg-maroon text-cream font-bold py-4 rounded-xl hover:bg-maroon-light transition-colors shadow-md text-lg">
          Sign In
        </button>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    setOrderError("");
    setLoading(true);

    if (method === "upi") {
      const upiUrl = `upi://pay?pa=papriwale@upi&pn=Papriwale&am=${total.toFixed(2)}&cu=INR&tn=TableOrder`;
      window.location.href = upiUrl;
      await new Promise(r => setTimeout(r, 1500));
    }

    try {
      const res = await apiFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: tableId,
          grand_total: total,
          order_status: method === "cash" ? "Pending" : "Paid",
          order_source: "QR Table Menu",
          payment_method: method,
          customer_id: localStorage.getItem("customerId") || null,
          items: items.map(i => ({ name: i.name, size: i.size, price: i.price, qty: i.qty, unit: i.unit || "pcs", note: i.note || "" })),
          tax_collected: (total / 1.05 * 0.05),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setOrderError(data.items?.length
          ? `Not enough stock: ${data.items.join(", ")}`
          : (data.error || "Failed to place order. Please try again."));
        return;
      }

      clearCart();
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-cream-light p-6 text-center pb-20">
        <CheckCircle2 size={80} className="text-green-500 mb-6" />
        <h2 className="font-serif text-3xl text-maroon font-bold mb-2">Order Placed!</h2>
        <p className="text-gray-600 mb-8">Your sweetness is being prepared. Track it from the orders menu.</p>
        <button onClick={() => navigate("/")} className="w-full bg-maroon text-cream font-bold py-4 rounded-xl hover:bg-maroon-light transition-colors shadow-md text-lg">
          Back to Home
        </button>
      </div>
    );
  }

  const methods = [
    { id: "upi", name: "UPI (GPay, PhonePe, Paytm)" },
    { id: "card", name: "Credit / Debit Card" },
  ];

  return (
    <div className="flex flex-col min-h-full bg-cream-light pb-40">
      <div className="bg-white p-4 flex items-center border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="mr-4 text-maroon"><ChevronLeft size={24} /></button>
        <h2 className="font-serif text-xl text-gold font-bold uppercase tracking-wider">CHECKOUT</h2>
        {tableId !== "Counter" && <span className="ml-auto text-xs bg-maroon text-white px-2 py-1 rounded font-semibold">Table {tableId}</span>}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Payment Method</h3>
        <div className="space-y-3">
          {methods.map(m => (
            <label key={m.id} onClick={() => setMethod(m.id)} className={`flex items-center p-4 rounded-xl border-2 transition-colors cursor-pointer ${method === m.id ? "border-maroon bg-maroon/5" : "border-gray-200 bg-white"}`}>
              <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center shrink-0 ${method === m.id ? "border-maroon" : "border-gray-300"}`}>
                {method === m.id && <div className="w-2.5 h-2.5 rounded-full bg-maroon" />}
              </div>
              <span className="font-semibold text-gray-800">{m.name}</span>
              {m.id === "upi" && <span className="ml-auto text-xs text-green-600 font-semibold">Instant</span>}
            </label>
          ))}
        </div>
      </div>

      <div className="fixed bottom-[64px] left-0 right-0 max-w-md mx-auto p-4 bg-white border-t border-gray-100 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-30">
        {orderError && (
          <p className="text-red-600 text-sm font-semibold mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{orderError}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total to pay</span>
            <span className="text-xl font-bold text-maroon">₹{total.toFixed(2)}</span>
          </div>
          <button onClick={handlePlaceOrder} disabled={loading}
            className="bg-maroon text-cream font-bold px-8 py-3.5 rounded-xl hover:bg-maroon-light transition-colors shadow-md text-lg disabled:opacity-60">
            {loading ? "Placing..." : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
