import React, { useState, useEffect } from "react";
import { Search, Plus, Trash2, Printer, ShoppingCart, X, FileDown, EyeOff } from "lucide-react";
import jsPDF from "jspdf";
import { useAccess } from "../../hooks/useAccess";
import { apiFetch } from "../../lib/apiFetch";

export default function POS() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [discountFlat, setDiscountFlat] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [analytics, setAnalytics] = useState({ totalRevenue: 0, totalSales: 0, totalOrders: 0, lowStock: 0, outOfStock: 0, totalProducts: 0 });
  const [allVariants, setAllVariants] = useState<any[]>([]);
  const [variantModal, setVariantModal] = useState<{ product: any; variants: any[] } | null>(null);
  const [variantSize, setVariantSize] = useState("");
  const [variantQty, setVariantQty] = useState(1);

  const access = useAccess("POS Billing");
  const isReadOnly = access === "Read-Only";

  useEffect(() => {
    apiFetch("/api/products").then(res => res.json()).then(data => {
      const list = Array.isArray(data) ? data : [];
      setProducts(list);
      setFilteredProducts(list);
    });
    apiFetch("/api/analytics").then(res => res.json()).then(data => setAnalytics(data || analytics));
    apiFetch("/api/product-variants").then(res => res.json()).then(data => setAllVariants(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    let result = products;
    if (categoryFilter !== "All") result = result.filter(p => p.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    }
    setFilteredProducts(result);
  }, [categoryFilter, searchQuery, products]);

  const categories = ["All", ...Array.from(new Set(products.map(p => p.category)))];

  const addToCart = (product: any, size?: string, qty: number = 1) => {
    const key = size ? `${product.id}-${size}` : product.id;
    const price = size
      ? (() => { const v = allVariants.find(v => v.product_id === product.id && v.size_label === size); return v ? product.price * v.variant_price_modifier : product.price; })()
      : product.price;
    setCart(prev => {
      const existing = prev.find(item => item.id === key);
      if (existing) return prev.map(item => item.id === key ? { ...item, qty: item.qty + qty } : item);
      return [...prev, { ...product, id: key, product_id: product.id, size: size || "", price, qty }];
    });
  };

  const handleAddToBill = (product: any) => {
    const productVariants = allVariants.filter(v => v.product_id === product.id);
    if (productVariants.length > 0) {
      setVariantModal({ product, variants: productVariants });
      setVariantSize(productVariants[0].size_label);
      setVariantQty(1);
    } else {
      addToCart(product);
    }
  };

  const confirmVariantAdd = () => {
    if (!variantModal) return;
    addToCart(variantModal.product, variantSize, variantQty);
    setVariantModal(null);
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const clampedFlat = Math.min(Math.max(0, discountFlat), subtotal);
  const clampedPercent = Math.min(Math.max(0, discountPercent), 100);
  const discountTotal = clampedFlat + (subtotal * (clampedPercent / 100));
  const taxes = (subtotal - discountTotal) * 0.05;
  const grandTotal = Math.max(0, (subtotal - discountTotal) + taxes + otherCharges);

  const handleExportPDF = () => {
    if (cart.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(92, 26, 27);
    doc.text("SHRI BADRINARAYAN PAPRIWALE", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Main Road, Buxar, Bihar | GSTIN: 10AAAAA0000A1Z5", 14, 28);
    doc.text(`Date: ${new Date().toLocaleString()}`, 14, 35);
    doc.setDrawColor(201, 162, 39);
    doc.line(14, 39, 196, 39);
    doc.setFontSize(11);
    doc.setTextColor(30);
    let y = 47;
    doc.setFont(undefined as any, "bold");
    doc.text("Item", 14, y); doc.text("Qty", 130, y); doc.text("Amount", 165, y);
    doc.setFont(undefined as any, "normal");
    y += 6;
    doc.line(14, y, 196, y); y += 6;
    cart.forEach(item => {
      doc.text(item.name + (item.size ? ` (${item.size})` : ""), 14, y);
      doc.text(String(item.qty), 130, y);
      doc.text(`Rs.${(item.price * item.qty).toFixed(2)}`, 165, y);
      y += 8;
    });
    doc.line(14, y, 196, y); y += 8;
    doc.text(`Subtotal: Rs.${subtotal.toFixed(2)}`, 120, y); y += 7;
    doc.text(`Discount: -Rs.${discountTotal.toFixed(2)}`, 120, y); y += 7;
    doc.text(`Taxes (5%): Rs.${taxes.toFixed(2)}`, 120, y); y += 7;
    doc.setFont(undefined as any, "bold");
    doc.setTextColor(92, 26, 27);
    doc.text(`Grand Total: Rs.${grandTotal.toFixed(2)}`, 120, y);
    doc.setFontSize(9); doc.setTextColor(150); doc.setFont(undefined as any, "normal");
    doc.text("Thank you for visiting! Have a sweet day.", 14, 285);
    doc.save(`invoice-${Date.now()}.pdf`);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "", "height=600,width=800");
    if (!printWindow) return;
    const itemsHtml = cart.map(item => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${item.name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.qty}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">Rs.${(item.price * item.qty).toFixed(2)}</td></tr>`).join("");
    printWindow.document.write(`<html><head><title>Invoice</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#333}.header{text-align:center;margin-bottom:30px}h1{margin:0;color:#5C1A1B;font-family:serif}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{border-bottom:2px solid #5C1A1B;padding:10px;text-align:left}.summary{width:50%;float:right}.sr{display:flex;justify-content:space-between;padding:5px 0}.tr{font-weight:bold;font-size:18px;border-top:2px solid #5C1A1B;padding-top:10px;margin-top:10px;color:#5C1A1B}.footer{clear:both;text-align:center;margin-top:50px;font-size:12px;color:#888}</style></head><body><div class="header"><h1>SHRI BADRINARAYAN PAPRIWALE</h1><p>Main Road, Buxar, Bihar | GSTIN: 10AAAAA0000A1Z5 | Ph: +91 9876543210</p><h2>TAX INVOICE</h2><p style="text-align:left">Date: ${new Date().toLocaleString()}</p></div><table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr></thead><tbody>${itemsHtml}</tbody></table><div class="summary"><div class="sr"><span>Subtotal:</span><span>Rs.${subtotal.toFixed(2)}</span></div><div class="sr"><span>Discount:</span><span>-Rs.${discountTotal.toFixed(2)}</span></div><div class="sr"><span>Taxes (5%):</span><span>Rs.${taxes.toFixed(2)}</span></div><div class="sr"><span>Other Charges:</span><span>Rs.${otherCharges.toFixed(2)}</span></div><div class="sr tr"><span>Grand Total:</span><span>Rs.${grandTotal.toFixed(2)}</span></div></div><div class="footer"><p>Thank you for visiting! Have a sweet day.</p></div></body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const handleWhatsAppShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone || customerPhone.length !== 10) return;
    const orderId = `INV-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const msg = encodeURIComponent(`Your invoice ${orderId} total: Rs.${grandTotal.toFixed(2)}. Thank you for visiting Papriwale!`);
    window.open(`https://wa.me/91${customerPhone}?text=${msg}`, "_blank");
    setShowWhatsAppModal(false);
    setCustomerPhone("");
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    await apiFetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_source: "Direct POS", order_status: "Paid", items: cart, grand_total: grandTotal, discount_applied: discountTotal, tax_collected: taxes, extraneous_charges: otherCharges })
    });
    setCart([]); setDiscountFlat(0); setDiscountPercent(0); setOtherCharges(0);
    apiFetch("/api/analytics").then(res => res.json()).then(setAnalytics);
  };

  // §2.2.1 — exact 6 SRS ribbon cards with correct formulas
  const ribbonCards = [
    { label: "Total Revenue", val: `₹${analytics.totalRevenue.toFixed(0)}` },
    { label: "Total Sales", val: String(analytics.totalSales) },
    { label: "Total Orders", val: String(analytics.totalOrders) },
    { label: "Total Products", val: String(analytics.totalProducts) },
    { label: "Low Stock", val: String(analytics.lowStock), alert: analytics.lowStock > 0 },
    { label: "Out of Stock", val: String(analytics.outOfStock), alert: analytics.outOfStock > 0 },
  ];

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* §2.2.1 Live Analytics Ribbon */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {ribbonCards.map((m, i) => (
          <div key={i} className={`p-2 rounded border bg-white flex flex-col justify-center ${(m as any).alert ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
            <span className="text-[10px] text-gray-500 uppercase font-semibold truncate">{m.label}</span>
            <span className={`text-lg font-bold ${(m as any).alert ? "text-red-600" : "text-gray-800"}`}>{m.val}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Product Catalog */}
        <div className="flex-[2] bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 flex gap-4 items-center bg-gray-50">
            <select className="border border-gray-300 rounded px-3 py-2 text-sm bg-white min-w-[150px]" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Search products by name or SKU..." className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-800">{p.name}</td>
                    <td className="py-3 px-4 text-gray-500">{p.category}</td>
                    <td className="py-3 px-4">{p.current_stock_qty}</td>
                    <td className="py-3 px-4">₹{p.price}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${p.current_stock_qty > p.safety_low_threshold ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {p.current_stock_qty > p.safety_low_threshold ? "In Stock" : "Low Stock"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => handleAddToBill(p)} className="text-maroon hover:bg-maroon hover:text-white p-1.5 rounded transition-colors border border-maroon">
                        <Plus size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400 italic">No products match your filter.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Billing Summary */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col shadow-sm">
          <div className="p-4 border-b border-gray-100 bg-maroon text-white font-serif font-semibold rounded-t-lg flex items-center justify-between">
            <span>Billing Summary</span>
            {isReadOnly && (
              <span className="flex items-center gap-1 text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded font-bold">
                <EyeOff size={11} /> READ-ONLY
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 py-10 flex flex-col items-center">
                <ShoppingCart size={48} className="mb-4 opacity-20" />
                <p>Cart is empty</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-800">{item.name}{item.size ? ` (${item.size})` : ""}</p>
                    <p className="text-xs text-gray-500">₹{item.price.toFixed(2)} x {item.qty}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white border border-gray-300 rounded">
                      <button onClick={() => updateQty(item.id, -1)} className="px-2 py-0.5 text-gray-600 hover:bg-gray-100">-</button>
                      <span className="px-2 text-sm font-medium">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="px-2 py-0.5 text-gray-600 hover:bg-gray-100">+</button>
                    </div>
                    <p className="font-bold text-sm w-16 text-right">₹{item.price * item.qty}</p>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Discount (Flat ₹)</label>
                <input type="number" min="0" max={subtotal} value={discountFlat} onChange={e => setDiscountFlat(Math.min(Number(e.target.value), subtotal))} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Discount (%)</label>
                <input type="number" min="0" max="100" value={discountPercent} onChange={e => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Taxes (5%)</span>
              <span className="font-semibold">₹{taxes.toFixed(2)}</span>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase">Other Charges</label>
              <input type="number" min="0" value={otherCharges} onChange={e => setOtherCharges(Number(e.target.value))} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="Packaging, delivery..." />
            </div>
            <div className="flex justify-between items-center py-2 border-t border-gray-200 mt-2">
              <span className="text-lg font-bold text-maroon">Grand Total</span>
              <span className="text-2xl font-bold text-maroon">₹{grandTotal.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button onClick={handlePlaceOrder} disabled={isReadOnly} className="bg-white border-2 border-gray-300 hover:border-maroon hover:text-maroon rounded py-2 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Cash</button>
              <button onClick={handlePlaceOrder} disabled={isReadOnly} className="bg-white border-2 border-gray-300 hover:border-maroon hover:text-maroon rounded py-2 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">UPI</button>
              <button onClick={handlePlaceOrder} disabled={isReadOnly} className="bg-white border-2 border-gray-300 hover:border-maroon hover:text-maroon rounded py-2 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Card</button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button onClick={handlePrint} className="bg-maroon hover:bg-maroon-light text-white font-semibold py-2.5 rounded shadow transition-colors flex items-center justify-center gap-1 text-sm">
                <Printer size={15} /> Print
              </button>
              <button onClick={handleExportPDF} className="bg-gold hover:bg-yellow-600 text-white font-semibold py-2.5 rounded shadow transition-colors flex items-center justify-center gap-1 text-sm">
                <FileDown size={15} /> PDF
              </button>
              <button onClick={() => setShowWhatsAppModal(true)} className="bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold py-2.5 rounded shadow transition-colors flex items-center justify-center gap-1 text-sm">
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-4 h-4" /> WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* §2.2.2 Variant Size Selection Modal for POS */}
      {variantModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-cream-light flex items-center justify-between">
              <h3 className="font-serif text-lg text-maroon font-bold">CHOOSE ITEM SPECIFICATIONS</h3>
              <button onClick={() => setVariantModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5">
              <p className="font-bold text-gray-800 text-sm mb-3">Select Serving Size Volume Option:</p>
              <div className="space-y-2 mb-5">
                {variantModal.variants.map(v => {
                  const price = variantModal.product.price * v.variant_price_modifier;
                  return (
                    <label key={v.size_label} className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${variantSize === v.size_label ? "border-maroon bg-maroon/5" : "border-gray-200"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${variantSize === v.size_label ? "border-maroon" : "border-gray-300"}`}>
                          {variantSize === v.size_label && <div className="w-2 h-2 rounded-full bg-maroon" />}
                        </div>
                        <input type="radio" className="hidden" checked={variantSize === v.size_label} onChange={() => setVariantSize(v.size_label)} />
                        <span className="font-medium text-gray-800">{v.size_label}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-600">[Rs. {price.toFixed(2)} Base]</span>
                    </label>
                  );
                })}
              </div>
              <p className="font-bold text-gray-800 text-sm mb-3 text-center">Adjust Intended Item Order Volume Balance:</p>
              <div className="flex items-center justify-center gap-4 mb-5">
                <button onClick={() => setVariantQty(Math.max(1, variantQty - 1))} className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-full text-maroon font-bold text-xl hover:bg-maroon/10">-</button>
                <span className="w-10 text-center font-bold text-xl">{variantQty}</span>
                <button onClick={() => setVariantQty(variantQty + 1)} className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-full text-maroon font-bold text-xl hover:bg-maroon/10">+</button>
              </div>
              <button onClick={confirmVariantAdd} className="w-full bg-maroon text-white font-bold py-3 rounded-lg hover:bg-maroon-light transition-colors uppercase tracking-wider text-sm">
                CONFIRM AND ADD TO CHECKOUT TRAY
              </button>
            </div>
          </div>
        </div>
      )}

      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl relative">
            <button onClick={() => setShowWhatsAppModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            <h3 className="text-lg font-bold text-maroon mb-2 flex items-center gap-2"><img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-5 h-5" /> Share Invoice via WhatsApp</h3>
            <p className="text-sm text-gray-500 mb-4">Enter customer phone number to send the invoice via WhatsApp.</p>
            <form onSubmit={handleWhatsAppShare}>
              <div className="flex bg-gray-50 border border-gray-300 rounded overflow-hidden focus-within:border-maroon focus-within:ring-1 focus-within:ring-maroon">
                <span className="px-3 py-2 bg-gray-100 border-r border-gray-300 text-gray-600 font-medium">+91</span>
                <input type="text" maxLength={10} pattern="\d{10}" placeholder="Enter 10-digit number" className="w-full px-3 py-2 bg-transparent focus:outline-none" value={customerPhone} onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ""))} required />
              </div>
              <button type="submit" className="w-full mt-4 bg-[#25D366] text-white font-semibold py-2 rounded shadow hover:bg-[#128C7E] transition-colors">Send to WhatsApp</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
