import { useState, useEffect } from "react";
import { ChevronLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Orders() {
  const navigate = useNavigate();
  const [localHistory, setLocalHistory] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("orderHistory");
    if (saved) setLocalHistory(JSON.parse(saved));
  }, []);

  return (
    <div className="flex flex-col min-h-full bg-cream-light pb-24">
      <div className="bg-white p-4 flex items-center border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="mr-4 text-maroon"><ChevronLeft size={24} /></button>
        <h2 className="font-serif text-xl text-gold font-bold uppercase tracking-wider">MY ORDERS</h2>
      </div>

      <div className="p-4 space-y-4">
        {localHistory.length === 0 ? (
          <div className="text-center text-gray-400 py-12 flex flex-col items-center">
            <FileText size={48} className="mb-4 opacity-20" />
            <p>No order history yet</p>
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
                  <div key={j} className="flex items-center gap-3 py-1">
                    {item.image
                      ? <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-100" onError={e => { (e.target as HTMLImageElement).src = "/cover.png"; }} />
                      : <img src="/cover.png" alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-100" />}
                    <div className="flex-1 flex justify-between text-xs text-gray-600">
                      <span className="font-medium">{item.name} {item.size ? `(${item.size})` : ""} x{item.qty}</span>
                      <span className="font-bold text-maroon">₹{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500 capitalize">{order.method === "upi" ? "UPI / QR" : order.method === "card" ? "Card" : "Cash"} • Table {order.tableId}</span>
                <span className="font-bold text-maroon">₹{Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
