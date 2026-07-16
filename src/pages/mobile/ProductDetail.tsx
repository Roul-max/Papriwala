import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { ChevronLeft, ShoppingBag, Heart } from "lucide-react";
import { useWishlist } from "../../hooks/useWishlist";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedSize, setSelectedSize] = useState("");
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(res => res.json())
      .then(data => setProduct(data?.id ? data : null));
    fetch(`/api/product-variants?product_id=${id}`)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setVariants(list);
        if (list.length > 0) setSelectedSize(list[0].size_label);
      });
  }, [id]);

  if (!product) return null;

  const getPrice = () => {
    if (variants.length === 0) return product.price;
    const v = variants.find(v => v.size_label === selectedSize);
    return v ? product.price * v.variant_price_modifier : product.price;
  };

  const handleAddToCart = () => {
    addToCart(product, selectedSize || undefined, qty);
    navigate("/cart");
  };

  return (
    <div className="flex flex-col min-h-full bg-white pb-40">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-maroon shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <button onClick={() => navigate("/cart")} className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-maroon shadow-sm">
          <ShoppingBag size={20} />
        </button>
      </div>

      {/* Image */}
      <div className="w-full h-72 bg-amber-50">
        {product.image
          ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = "/cover.png"; }} />
          : <img src="/cover.png" alt={product.name} className="w-full h-full object-cover" />}
      </div>

      {/* Details */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h2 className="font-serif text-3xl text-maroon font-bold">{product.name}</h2>
          <button
            onClick={() => toggleWishlist(product.id)}
            className={`pt-1 ${isInWishlist(product.id) ? 'text-maroon' : 'text-gray-300 hover:text-maroon'}`}
          >
            <Heart size={28} fill={isInWishlist(product.id) ? 'currentColor' : 'none'} />
          </button>
        </div>
        <p className="text-gold font-bold text-xl mb-4">₹{getPrice().toFixed(2)} <span className="text-sm font-normal text-gray-500">/ unit</span></p>

        {product.description && (
          <p className="text-gray-500 text-sm leading-relaxed mb-6">{product.description}</p>
        )}

        {/* Variant Size Selection — only if variants exist */}
        {variants.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Select Size</h3>
            <div className="flex flex-wrap gap-2">
              {variants.map(v => (
                <button
                  key={v.size_label}
                  onClick={() => setSelectedSize(v.size_label)}
                  className={`px-4 py-2 text-sm font-semibold rounded-full border transition-colors ${
                    selectedSize === v.size_label ? "bg-maroon text-white border-maroon" : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {v.size_label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Qty Stepper */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full px-2 py-1">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-full font-bold text-xl">-</button>
            <span className="w-12 text-center font-bold text-lg">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-full font-bold text-xl">+</button>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-[64px] left-0 right-0 max-w-md mx-auto p-4 bg-white border-t border-gray-100 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-30">
        <button onClick={handleAddToCart} className="w-full bg-maroon text-cream font-bold py-4 rounded-xl hover:bg-maroon-light transition-colors shadow-md flex items-center justify-center gap-2 text-lg">
          <ShoppingBag size={20} /> Add to Cart
        </button>
      </div>
    </div>
  );
}
