sed -i 's|const \[items, setItems\] = useState(\[|const { items, updateQty, removeFromCart, subtotal, tax, total } = useCart();\n  // const [items, setItems] = useState([|' src/pages/mobile/Cart.tsx
sed -i 's|import { useState } from "react";|import { useState } from "react";\nimport { useCart } from "../../hooks/useCart";|' src/pages/mobile/Cart.tsx
