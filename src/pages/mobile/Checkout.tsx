import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { useCart } from "../../hooks/useCart";

export default function Checkout() {
  const navigate = useNavigate();
  const { total, items, clearCart } = useCart();
  const [method, setMethod] = useState("upi");
  const [success, setSuccess] = useState(false);

  // §3.1 — Extract table_id from QR URL params, fall back to sessionStorage set at scan time
  const urlParams = new URLSearchParams(window.location.search);
  const tableId = urlParams.get("table_id") || sessionStorage.getItem("qr_table_id") || "Counter";

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    const isCash = method === "cash";
    const isUPI = method === "upi";

    // §3.5 UPI deep-link for digital payments
    if (isUPI) {
      const upiUrl = `upi://pay?pa=papriwale@upi&pn=Papriwale&am=${total.toFixed(2)}&cu=INR&tn=TableOrder`;
      window.location.href = upiUrl;
      // Small delay to allow UPI app to open before placing order
      await new Promise(r => setTimeout(r, 1500));
    }
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table_id: tableId,
        grand_total: total,
        order_status: isCash ? "Pending" : "In-Preparation",
        order_source: "QR Table Menu",
        payment_method: method,
        items: items.map(i => ({ name: i.name, size: i.size, price: i.price, qty: i.qty, note: i.note || "" })),
        tax_collected: (total / 1.05 * 0.05),
      })
    });

    // §3.6 — Persist to device-local history
    const history = JSON.parse(localStorage.getItem("orderHistory") || "[]");
    history.unshift({ id: Date.now(), timestamp: new Date().toISOString(), items, total, tableId, method });
    localStorage.setItem("orderHistory", JSON.stringify(history.slice(0, 20)));

    clearCart();
    setSuccess(true);
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
    { id: "cash", name: "Counter Cash (Pay at Counter)" },
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
            <label key={m.id} className={`flex items-center p-4 rounded-xl border-2 transition-colors cursor-pointer ${method === m.id ? "border-maroon bg-maroon/5" : "border-gray-200 bg-white"}`}>
              <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${method === m.id ? "border-maroon" : "border-gray-300"}`}>
                {method === m.id && <div className="w-2.5 h-2.5 rounded-full bg-maroon" />}
              </div>
              <span className="font-semibold text-gray-800">{m.name}</span>
              {m.id === "cash" && <span className="ml-auto text-xs text-orange-500 font-semibold">Pay Later</span>}
            </label>
          ))}
        </div>
      </div>

      <div className="fixed bottom-[64px] left-0 right-0 max-w-md mx-auto p-4 bg-white border-t border-gray-100 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-30 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total to pay</span>
          <span className="text-xl font-bold text-maroon">₹{total.toFixed(2)}</span>
        </div>
        <button onClick={handlePlaceOrder} className="bg-maroon text-cream font-bold px-8 py-3.5 rounded-xl hover:bg-maroon-light transition-colors shadow-md text-lg">
          Place Order
        </button>
      </div>
    </div>
  );
}
