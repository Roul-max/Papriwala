import { useCart } from "../../hooks/useCart";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Trash2 } from "lucide-react";

export default function Cart() {
  const navigate = useNavigate();
  const { items, updateQty, removeFromCart, updateNote, subtotal, tax, total } = useCart();

  return (
    <div className="flex flex-col min-h-full bg-cream-light pb-40">
      <div className="bg-white p-4 flex items-center border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="mr-4 text-maroon"><ChevronLeft size={24} /></button>
        <h2 className="font-serif text-xl text-gold font-bold uppercase tracking-wider">MY CART</h2>
      </div>

      <div className="p-4 space-y-4">
        {items.length === 0 && (
          <div className="text-center text-gray-400 py-16">
            <p className="text-lg font-semibold">Your cart is empty</p>
            <button onClick={() => navigate("/")} className="mt-4 text-maroon font-semibold text-sm underline">Browse Menu</button>
          </div>
        )}
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col gap-3 relative">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">{item.name}</h3>
                    <p className="text-gray-500 text-xs">{item.size} • ₹{item.price}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-300 hover:text-red-500 ml-2">
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-maroon">₹{(item.price * item.qty).toFixed(2)}</span>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full px-1">
                    <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold">-</button>
                    <span className="w-6 text-center font-bold text-sm">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold">+</button>
                  </div>
                </div>
              </div>
            </div>
            {/* §3.4 Per-item prep note */}
            <input
              type="text"
              placeholder='Prep note (e.g. "No onions", "Extra sweet")'
              value={item.note || ""}
              onChange={e => updateNote(item.id, e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-maroon bg-gray-50"
            />
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <>
          <div className="bg-white mx-4 rounded-xl p-5 shadow-sm border border-gray-100 space-y-3 mb-6">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-800">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Taxes (5%)</span>
              <span className="font-semibold text-gray-800">₹{tax.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
              <span className="font-bold text-gray-800">Total</span>
              <span className="font-bold text-xl text-maroon">₹{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="fixed bottom-[64px] left-0 right-0 max-w-md mx-auto p-4 bg-white border-t border-gray-100 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-30">
            <button onClick={() => navigate("/checkout")} className="w-full bg-maroon text-cream font-bold py-4 rounded-xl hover:bg-maroon-light transition-colors shadow-md text-lg">
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
