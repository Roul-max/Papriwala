sed -i 's|import { useNavigate, useParams } from "react-router-dom";|import { useNavigate, useParams } from "react-router-dom";\nimport { useCart } from "../../hooks/useCart";|' src/pages/mobile/ProductDetail.tsx
sed -i 's|const { toggleWishlist, isInWishlist } = useWishlist();|const { toggleWishlist, isInWishlist } = useWishlist();\n  const { addToCart } = useCart();|' src/pages/mobile/ProductDetail.tsx
sed -i 's|<button onClick={() => navigate("/cart")} className="w-full bg-maroon text-cream font-bold py-4 rounded-xl hover:bg-maroon-light transition-colors shadow-md flex items-center justify-center gap-2 text-lg">|<button onClick={() => { addToCart(product, selectedSize, qty); navigate("/cart"); }} className="w-full bg-maroon text-cream font-bold py-4 rounded-xl hover:bg-maroon-light transition-colors shadow-md flex items-center justify-center gap-2 text-lg">|' src/pages/mobile/ProductDetail.tsx

sed -i 's|import { useNavigate, useParams, Link } from "react-router-dom";|import { useNavigate, useParams, Link } from "react-router-dom";\nimport { useCart } from "../../hooks/useCart";|' src/pages/mobile/ProductList.tsx
sed -i 's|const { toggleWishlist, isInWishlist } = useWishlist();|const { toggleWishlist, isInWishlist } = useWishlist();\n  const { addToCart } = useCart();|' src/pages/mobile/ProductList.tsx
sed -i 's|<Link to={`/product/${product.id}`} className="self-end bg-maroon text-white text-xs font-bold px-4 py-1.5 rounded-full hover:bg-maroon-light">|<button onClick={() => addToCart(product)} className="self-end bg-maroon text-white text-xs font-bold px-4 py-1.5 rounded-full hover:bg-maroon-light">|' src/pages/mobile/ProductList.tsx
sed -i 's|Add\n              </Link>|Add\n              </button>|' src/pages/mobile/ProductList.tsx

sed -i 's|import { Link } from "react-router-dom";|import { Link } from "react-router-dom";\nimport { useCart } from "../../hooks/useCart";|' src/pages/mobile/Home.tsx
sed -i 's|const { toggleWishlist, isInWishlist } = useWishlist();|const { toggleWishlist, isInWishlist } = useWishlist();\n  const { addToCart } = useCart();|' src/pages/mobile/Home.tsx
sed -i 's|<Link to={`/product/${product.id}`} className="self-end bg-maroon text-white text-xs font-bold px-4 py-1.5 rounded-full hover:bg-maroon-light">|<button onClick={() => addToCart(product)} className="self-end bg-maroon text-white text-xs font-bold px-4 py-1.5 rounded-full hover:bg-maroon-light">|' src/pages/mobile/Home.tsx
sed -i 's|Add\n              </Link>|Add\n              </button>|' src/pages/mobile/Home.tsx
