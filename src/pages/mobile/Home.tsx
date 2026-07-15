import { useEffect, useState, useRef } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../../hooks/useCart";

export default function Home() {
  const [categories, setCategories] = useState<any[]>([]);
  const [bestsellers, setBestsellers] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/products")
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setAllProducts(list);
        setBestsellers(list.slice(0, 6));
      });

    fetch("/api/categories")
      .then(res => res.json())
      .then(data => setCategories(Array.isArray(data) ? data : []));
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -120 : 120;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col min-h-full space-y-6 pb-6 bg-cream-light">
      {/* Hero Banner */}
      <div className="w-full relative shrink-0 px-4 pt-4">
        <div className="h-56 w-full relative rounded-3xl overflow-hidden shadow-md">
          <img src="https://images.unsplash.com/photo-1559564104-e3c79a528c0b?auto=format&fit=crop&q=80&w=600" alt="Assorted Sweets" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-5">
            <h2 className="text-white font-serif text-3xl font-bold leading-tight">Premium Sweets</h2>
            <p className="text-white/90 text-sm mt-1">Crafted with pure desi ghee</p>
          </div>
        </div>
      </div>

      {/* Categories Rail */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-serif text-maroon font-bold text-lg">Categories</h3>
        </div>
        <div className="relative group">
          <button 
            onClick={() => scroll('left')} 
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 p-1.5 rounded-full bg-white/95 backdrop-blur border border-gray-200 text-maroon shadow-md focus:outline-none"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div ref={scrollRef} className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide snap-x relative z-0">
            {categories.map(cat => (
              <Link key={cat.id} to={`/categories`} className="flex flex-col items-center space-y-2 shrink-0 w-20 snap-start">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-gold/50 shadow-sm">
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-xs font-semibold text-gray-700">{cat.name}</span>
              </Link>
            ))}
          </div>
          <button 
            onClick={() => scroll('right')} 
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 p-1.5 rounded-full bg-white/95 backdrop-blur border border-gray-200 text-maroon shadow-md focus:outline-none"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Best Sellers */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-serif text-maroon font-bold text-lg">Best Sellers</h3>
          <Link to="/categories" className="text-xs font-bold text-gold hover:text-gold-light">VIEW ALL</Link>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          {bestsellers.map(product => (
            <Link key={product.id} to={`/product/${product.id}`} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
              <div className="h-24 w-full">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-2 flex flex-col flex-1 justify-between">
                <h4 className="font-bold text-[11px] text-gray-800 line-clamp-2 leading-tight mb-1">{product.name}</h4>
                <p className="text-maroon font-bold text-[10px] mt-1">₹{product.price}/kg</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
