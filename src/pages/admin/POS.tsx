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
  const [variantCustomPrice, setVariantCustomPrice] = useState<number | "">("");
  const [quickAddModal, setQuickAddModal] = useState<{ product: any } | null>(null);
  const [quickQty, setQuickQty] = useState(1);
  const [quickPrice, setQuickPrice] = useState<number>(0);
  const [quickUnit, setQuickUnit] = useState("");
  const [variantUnit, setVariantUnit] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [totalUnitsSold, setTotalUnitsSold] = useState(0);
  const [invoiceNo, setInvoiceNo] = useState("");

  // Generate a stable invoice number once per billing session
  const generateInvoiceNo = () => {
    const ts = Date.now();
    setInvoiceNo(`INV-${new Date().getFullYear()}-${ts.toString().slice(-6)}`);
  };

  const access = useAccess("POS Billing");
  const isReadOnly = access === "Read-Only";

  const refreshAnalytics = () => {
    apiFetch("/api/analytics").then(res => res.json()).then(data => setAnalytics(data || analytics));
    const today = new Date().toISOString().split("T")[0];
    apiFetch("/api/orders").then(res => res.json()).then((orders: any[]) => {
      const units = (Array.isArray(orders) ? orders : [])
        .filter((o: any) => o.order_status === "Paid" && o.timestamp?.startsWith(today))
        .reduce((sum: number, o: any) => sum + (o.items?.reduce((s: number, it: any) => s + (it.qty || 1), 0) || 0), 0);
      setTotalUnitsSold(units);
    });
  };

  useEffect(() => {
    apiFetch("/api/products").then(res => res.json()).then(data => {
      const list = Array.isArray(data) ? data : [];
      setProducts(list);
      setFilteredProducts(list);
    });
    refreshAnalytics();
    apiFetch("/api/product-variants").then(res => res.json()).then(data => setAllVariants(Array.isArray(data) ? data : []));
    generateInvoiceNo();
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

  const handleAddToBill = (product: any) => {
    const productVariants = allVariants.filter(v => v.product_id === product.id);
    if (productVariants.length > 0) {
      setVariantModal({ product, variants: productVariants });
      setVariantSize(productVariants[0].size_label);
      setVariantQty(1);
      const defaultPrice = product.price * productVariants[0].variant_price_modifier;
      setVariantCustomPrice(defaultPrice);
      setVariantUnit(product.unit || "pcs");
    } else {
      setQuickAddModal({ product });
      setQuickQty(1);
      setQuickPrice(product.price);
      setQuickUnit(product.unit || "pcs");
    }
  };

  const confirmVariantAdd = () => {
    if (!variantModal) return;
    const finalPrice = variantCustomPrice !== "" ? Number(variantCustomPrice) : (() => {
      const v = variantModal.variants.find(v => v.size_label === variantSize);
      return v ? variantModal.product.price * v.variant_price_modifier : variantModal.product.price;
    })();
    const key = `${variantModal.product.id}-${variantSize}`;
    setCart(prev => {
      const existing = prev.find(item => item.id === key);
      if (existing) return prev.map(item => item.id === key ? { ...item, qty: item.qty + variantQty, price: finalPrice } : item);
      return [...prev, { ...variantModal.product, id: key, product_id: variantModal.product.id, size: variantSize, price: finalPrice, qty: variantQty, unit: variantUnit }];
    });
    setVariantModal(null);
  };

  const confirmQuickAdd = () => {
    if (!quickAddModal) return;
    const p = quickAddModal.product;
    setCart(prev => {
      const existing = prev.find(item => item.id === p.id);
      if (existing) return prev.map(item => item.id === p.id ? { ...item, qty: item.qty + quickQty, price: quickPrice } : item);
      return [...prev, { ...p, price: quickPrice, qty: quickQty, unit: quickUnit }];
    });
    setQuickAddModal(null);
  };

  const updateCartPrice = (id: string, price: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, price: Math.max(0, price) } : item));
  };

  const updateCartQty = (id: string, qty: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, qty: Math.max(1, qty) } : item));
  };

  const updateCartUnit = (id: string, unit: string) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, unit } : item));
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
    const pageW = 210;
    const margin = 14;
    const rightEdge = pageW - margin;

    const buildPDF = (logoDataUrl?: string, imgW?: number, imgH?: number) => {
      // ── Header background ──
      doc.setFillColor(92, 26, 27);
      doc.rect(0, 0, pageW, 38, "F");

      // ── Logo (top-left, white box area) ──
      if (logoDataUrl && imgW && imgH) {
        try {
          const maxW = 18, maxH = 18;
          const ratio = Math.min(maxW / imgW, maxH / imgH);
          doc.addImage(logoDataUrl, "PNG", margin, 10, imgW * ratio, imgH * ratio);
        } catch {}
      }

      // ── Brand name & address (centered in header) ──
      doc.setFont(undefined as any, "bold");
      doc.setFontSize(15); doc.setTextColor(255, 255, 255);
      doc.text("SHRI BADRINARAYAN PAPRIWALE", pageW / 2, 17, { align: "center" });
      doc.setFont(undefined as any, "normal");
      doc.setFontSize(8); doc.setTextColor(220, 200, 180);
      doc.text("Main Road, Buxar, Bihar - 802101  |  GSTIN: 10AAAAA0000A1Z5  |  Ph: +91 9876543210", pageW / 2, 24, { align: "center" });

      // ── TAX INVOICE label (gold, right-aligned in header) ──
      doc.setFont(undefined as any, "bold");
      doc.setFontSize(9); doc.setTextColor(201, 162, 39);
      doc.text("TAX INVOICE", rightEdge, 33, { align: "right" });

      // ── Gold divider ──
      doc.setDrawColor(201, 162, 39); doc.setLineWidth(0.5);
      doc.line(margin, 42, rightEdge, 42);

      // ── Invoice meta (two columns) ──
      doc.setFont(undefined as any, "normal"); doc.setFontSize(9); doc.setTextColor(60);
      doc.setFont(undefined as any, "bold"); doc.text("Invoice No:", margin, 50);
      doc.setFont(undefined as any, "normal"); doc.text(invoiceNo, margin + 24, 50);
      doc.setFont(undefined as any, "bold"); doc.text("Date:", margin, 56);
      doc.setFont(undefined as any, "normal"); doc.text(new Date().toLocaleString(), margin + 14, 56);
      doc.setFont(undefined as any, "bold"); doc.text("Payment:", rightEdge - 50, 50);
      doc.setFont(undefined as any, "normal"); doc.text(paymentMode, rightEdge - 50 + 22, 50);

      doc.setDrawColor(220); doc.setLineWidth(0.3);
      doc.line(margin, 61, rightEdge, 61);

      // ── Table header ──
      let y = 68;
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y - 5, rightEdge - margin, 8, "F");
      doc.setFont(undefined as any, "bold"); doc.setFontSize(8); doc.setTextColor(80);
      doc.text("#",    margin + 1, y);
      doc.text("ITEM", margin + 8, y);
      doc.text("UNIT", 110, y);
      doc.text("QTY",  130, y);
      doc.text("RATE", 148, y);
      doc.text("AMOUNT", rightEdge, y, { align: "right" });
      doc.setDrawColor(180); doc.setLineWidth(0.3);
      doc.line(margin, y + 2, rightEdge, y + 2);
      y += 8;

      // ── Table rows ──
      doc.setFont(undefined as any, "normal"); doc.setFontSize(9); doc.setTextColor(30);
      cart.forEach((item, i) => {
        if (i % 2 === 1) { doc.setFillColor(250, 250, 250); doc.rect(margin, y - 5, rightEdge - margin, 8, "F"); }
        doc.text(String(i + 1), margin + 1, y);
        const itemName = item.name + (item.size ? ` (${item.size})` : "");
        doc.text(itemName.length > 32 ? itemName.slice(0, 31) + "…" : itemName, margin + 8, y);
        doc.text(item.unit || "pcs", 110, y);
        doc.text(String(item.qty), 130, y);
        doc.text(`Rs.${item.price.toFixed(2)}`, 148, y);
        doc.text(`Rs.${(item.price * item.qty).toFixed(2)}`, rightEdge, y, { align: "right" });
        y += 8;
      });

      doc.setDrawColor(180); doc.line(margin, y, rightEdge, y); y += 6;

      // ── Summary block (right-aligned) ──
      const labelX = 148, valX = rightEdge;
      doc.setFontSize(9); doc.setTextColor(80);
      const summaryRow = (label: string, val: string, bold = false, color?: [number,number,number]) => {
        if (bold) doc.setFont(undefined as any, "bold"); else doc.setFont(undefined as any, "normal");
        if (color) doc.setTextColor(...color); else doc.setTextColor(80);
        doc.text(label, labelX, y);
        doc.text(val, valX, y, { align: "right" });
        y += 7;
      };
      summaryRow("Subtotal:",     `Rs.${subtotal.toFixed(2)}`);
      if (discountTotal > 0) summaryRow("Discount:", `-Rs.${discountTotal.toFixed(2)}`, false, [34, 139, 34]);
      summaryRow("Tax (5%):",     `Rs.${taxes.toFixed(2)}`);
      if (otherCharges > 0) summaryRow("Other Charges:", `Rs.${otherCharges.toFixed(2)}`);
      doc.setDrawColor(92, 26, 27); doc.setLineWidth(0.5);
      doc.line(labelX, y - 2, rightEdge, y - 2);
      doc.setFillColor(92, 26, 27);
      doc.rect(labelX - 2, y, rightEdge - labelX + 10, 11, "F");
      doc.setFont(undefined as any, "bold"); doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("GRAND TOTAL:", labelX + 1, y + 7.5);
      doc.text(`Rs. ${grandTotal.toFixed(2)}`, rightEdge + 4, y + 7.5, { align: "right" });
      y += 20;

      // ── Footer ──
      doc.setDrawColor(220); doc.setLineWidth(0.3);
      doc.line(margin, 265, rightEdge, 265);
      doc.setFont(undefined as any, "normal"); doc.setFontSize(8); doc.setTextColor(120);
      doc.text("Thank you for visiting! Have a sweet day. 🙏", pageW / 2, 271, { align: "center" });
      doc.line(margin, 278, margin + 45, 278);
      doc.text("Authorised Signatory", margin, 283);

      doc.save(`invoice-${invoiceNo}.pdf`);
    };

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      buildPDF(canvas.toDataURL("image/png"), img.width, img.height);
    };
    img.onerror = () => buildPDF();
    img.src = "/Logo.png";
  };

  const handlePrint = () => {
    const printWindow = window.open("", "", "height=800,width=900");
    if (!printWindow) return;
    const itemsHtml = cart.map((item, i) =>
      `<tr class="${i % 2 === 1 ? "alt" : ""}"><td>${i+1}</td><td>${item.name}${item.size ? ` (${item.size})` : ""}</td><td>${item.unit || "pcs"}</td><td>${item.qty}</td><td>&#8377;${item.price.toFixed(2)}</td><td>&#8377;${(item.price * item.qty).toFixed(2)}</td></tr>`
    ).join("");
    const logoHtml = `<img src="${window.location.origin}/Logo.png" style="height:46px;width:auto;object-fit:contain;" onerror="this.style.display='none'" />`;
    const discountRow = discountTotal > 0 ? `<tr><td>Discount</td><td style="color:#228B22">-&#8377;${discountTotal.toFixed(2)}</td></tr>` : "";
    const otherRow = otherCharges > 0 ? `<tr><td>Other Charges</td><td>&#8377;${otherCharges.toFixed(2)}</td></tr>` : "";
    printWindow.document.write(`<html><head><title>Invoice ${invoiceNo}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#222;background:#fff}.header{background:#5C1A1B;color:#fff;padding:16px 24px;display:flex;align-items:center;gap:16px}.header-text{flex:1;text-align:center}.brand{font-family:Georgia,serif;font-size:19px;font-weight:bold}.sub{font-size:11px;color:#ddc8b0;margin-top:3px}.tag{font-size:10px;color:#C9A227;font-weight:bold;margin-top:5px;letter-spacing:1px}.gold-bar{height:3px;background:#C9A227}.meta{display:flex;justify-content:space-between;padding:10px 24px;border-bottom:1px solid #eee;font-size:12px;background:#fafafa}.meta p{margin:2px 0}.meta-right{text-align:right}table.items{width:100%;border-collapse:collapse}table.items th{background:#f5f5f5;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#555;border-bottom:2px solid #5C1A1B;text-align:left}table.items th:nth-child(n+3){text-align:right}table.items td{padding:8px 12px;font-size:12px;border-bottom:1px solid #f0f0f0}table.items td:nth-child(n+3){text-align:right}tr.alt td{background:#fafafa}.sw{display:flex;justify-content:flex-end;padding:14px 24px}table.sum{width:250px;border-collapse:collapse;font-size:13px}table.sum td{padding:5px 8px}table.sum td:last-child{text-align:right;font-weight:600}.tr{background:#5C1A1B;color:#fff;font-size:14px;font-weight:bold}.tr td{padding:8px!important}.footer{padding:12px 24px;display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #eee}.footer p{font-size:11px;color:#888}.sl{border-top:1px solid #999;width:150px;margin-left:auto;margin-bottom:3px}.sign{font-size:11px;color:#555;text-align:right}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="header">${logoHtml}<div class="header-text"><div class="brand">SHRI BADRINARAYAN PAPRIWALE</div><div class="sub">Main Road, Buxar, Bihar - 802101 &nbsp;|&nbsp; GSTIN: 10AAAAA0000A1Z5 &nbsp;|&nbsp; Ph: +91 9876543210</div><div class="tag">TAX INVOICE</div></div></div><div class="gold-bar"></div><div class="meta"><div><p><strong>Invoice No:</strong> ${invoiceNo}</p><p><strong>Date:</strong> ${new Date().toLocaleString()}</p></div><div class="meta-right"><p><strong>Payment Mode:</strong> ${paymentMode}</p></div></div><table class="items"><thead><tr><th>#</th><th>Item</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${itemsHtml}</tbody></table><div class="sw"><table class="sum"><tr><td>Subtotal</td><td>&#8377;${subtotal.toFixed(2)}</td></tr>${discountRow}<tr><td>Tax (5%)</td><td>&#8377;${taxes.toFixed(2)}</td></tr>${otherRow}<tr class="tr"><td>GRAND TOTAL</td><td>&#8377;${grandTotal.toFixed(2)}</td></tr></table></div><div class="footer"><p>Thank you for visiting! Have a sweet day.</p><div class="sign"><div class="sl"></div>Authorised Signatory</div></div></body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const handleWhatsAppShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone || customerPhone.length !== 10) return;
    const msg = encodeURIComponent(`Your invoice ${invoiceNo} total: Rs.${grandTotal.toFixed(2)}. Thank you for visiting Papriwale!`);
    window.open(`https://wa.me/91${customerPhone}?text=${msg}`, "_blank");
    setShowWhatsAppModal(false);
    setCustomerPhone("");
  };

  const handlePlaceOrder = async (mode: string) => {
    if (cart.length === 0) return;
    setPaymentMode(mode);
    const createdBy = localStorage.getItem("adminName") || "Admin";
    await apiFetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_source: "Direct POS", order_status: "Paid", payment_mode: mode, items: cart, grand_total: grandTotal, discount_applied: discountTotal, tax_collected: taxes, extraneous_charges: otherCharges, created_by: createdBy })
    });
    setCart([]); setDiscountFlat(0); setDiscountPercent(0); setOtherCharges(0);
    generateInvoiceNo(); // fresh invoice number for next bill
    refreshAnalytics();
  };

  // §2.2.1 — 6 ribbon cards (no revenue per requirement)
  const ribbonCards = [
    { label: "Today's Sales", val: String(analytics.totalSales) },
    { label: "Today's Orders", val: String(analytics.totalOrders) },
    { label: "Total Products", val: String(analytics.totalProducts) },
    { label: "Total Product Sale", val: String(totalUnitsSold) },
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
          <div className="flex-1 overflow-auto">
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 py-16 flex flex-col items-center">
                <ShoppingCart size={48} className="mb-3 opacity-20" />
                <p className="text-sm">Cart is empty</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b-2 border-gray-200 z-10">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs text-gray-500 font-semibold uppercase w-[35%]">Item</th>
                    <th className="text-center px-2 py-2 text-xs text-gray-500 font-semibold uppercase w-[15%]">Unit</th>
                    <th className="text-center px-2 py-2 text-xs text-gray-500 font-semibold uppercase w-[18%]">Price ₹</th>
                    <th className="text-center px-2 py-2 text-xs text-gray-500 font-semibold uppercase w-[12%]">Qty</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-500 font-semibold uppercase w-[15%]">Total</th>
                    <th className="w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cart.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-gray-800 leading-tight">{item.name}</p>
                        {item.size && <p className="text-xs text-gray-400 mt-0.5">{item.size}</p>}
                      </td>
                      <td className="px-2 py-3">
                        <input type="text" value={item.unit || "pcs"} onChange={e => updateCartUnit(item.id, e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-center focus:border-maroon focus:outline-none" />
                      </td>
                      <td className="px-2 py-3">
                        <input type="number" min="0" step="0.01" value={item.price} onChange={e => updateCartPrice(item.id, Number(e.target.value))}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-center focus:border-maroon focus:outline-none" />
                      </td>
                      <td className="px-2 py-3">
                        <input type="number" min="1" value={item.qty} onChange={e => updateCartQty(item.id, Number(e.target.value))}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-center focus:border-maroon focus:outline-none" />
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-maroon whitespace-nowrap">₹{(item.price * item.qty).toFixed(2)}</td>
                      <td className="pr-2 py-3">
                        <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 space-y-1.5">
            {/* Discount + Other Charges inline */}
            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <label className="text-[9px] text-gray-400 uppercase font-semibold">Disc ₹</label>
                <input type="number" min="0" max={subtotal} value={discountFlat} onChange={e => setDiscountFlat(Math.min(Number(e.target.value), subtotal))} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label className="text-[9px] text-gray-400 uppercase font-semibold">Disc %</label>
                <input type="number" min="0" max="100" value={discountPercent} onChange={e => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label className="text-[9px] text-gray-400 uppercase font-semibold">Other ₹</label>
                <input type="number" min="0" value={otherCharges} onChange={e => setOtherCharges(Number(e.target.value))} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
            </div>
            {/* Summary row */}
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal: <span className="font-semibold text-gray-700">₹{subtotal.toFixed(2)}</span></span>
              <span>Tax 5%: <span className="font-semibold text-gray-700">₹{taxes.toFixed(2)}</span></span>
              {discountTotal > 0 && <span>Disc: <span className="font-semibold text-green-600">-₹{discountTotal.toFixed(2)}</span></span>}
            </div>
            {/* Grand Total */}
            <div className="flex justify-between items-center py-1 border-t border-gray-200">
              <span className="text-sm font-bold text-maroon">Grand Total</span>
              <span className="text-xl font-bold text-maroon">₹{grandTotal.toFixed(2)}</span>
            </div>
            {/* Payment + Action buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              {["Cash", "UPI", "Card"].map(mode => (
                <button key={mode} disabled={isReadOnly}
                  onClick={() => setPaymentMode(mode)}
                  className={`border-2 rounded py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${paymentMode === mode ? "border-maroon bg-maroon text-white" : "bg-white border-gray-300 hover:border-maroon hover:text-maroon"}`}>
                  {mode}
                </button>
              ))}
            </div>
            <button onClick={() => handlePlaceOrder(paymentMode)} disabled={isReadOnly || cart.length === 0}
              className="w-full bg-maroon hover:bg-maroon-light text-white font-bold py-2 rounded text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Place Order
            </button>
            <div className="grid grid-cols-3 gap-1.5">
              <button onClick={handlePrint} className="bg-maroon hover:bg-maroon-light text-white font-semibold py-1.5 rounded flex items-center justify-center gap-1 text-xs">
                <Printer size={13} /> Print
              </button>
              <button onClick={handleExportPDF} className="bg-gold hover:bg-yellow-600 text-white font-semibold py-1.5 rounded flex items-center justify-center gap-1 text-xs">
                <FileDown size={13} /> PDF
              </button>
              <button onClick={() => setShowWhatsAppModal(true)} className="bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold py-1.5 rounded flex items-center justify-center gap-1 text-xs">
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-3.5 h-3.5" /> WA
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
              <div className="space-y-2 mb-4">
                {variantModal.variants.map(v => {
                  const price = variantModal.product.price * v.variant_price_modifier;
                  return (
                    <label key={v.size_label} onClick={() => { setVariantSize(v.size_label); setVariantCustomPrice(price); }} className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${variantSize === v.size_label ? "border-maroon bg-maroon/5" : "border-gray-200"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${variantSize === v.size_label ? "border-maroon" : "border-gray-300"}`}>
                          {variantSize === v.size_label && <div className="w-2 h-2 rounded-full bg-maroon" />}
                        </div>
                        <span className="font-medium text-gray-800">{v.size_label}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-600">[Rs. {price.toFixed(2)} Base]</span>
                    </label>
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-semibold">Unit</label>
                  <input type="text" value={variantUnit} onChange={e => setVariantUnit(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="pcs, kg..." />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-semibold">Price (₹)</label>
                  <input type="number" min="0" step="0.01" value={variantCustomPrice} onChange={e => setVariantCustomPrice(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-semibold">Quantity</label>
                  <input type="number" min="1" value={variantQty} onChange={e => setVariantQty(Math.max(1, Number(e.target.value)))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
              </div>
              <button onClick={confirmVariantAdd} className="w-full bg-maroon text-white font-bold py-3 rounded-lg hover:bg-maroon-light transition-colors uppercase tracking-wider text-sm">
                CONFIRM AND ADD TO CHECKOUT TRAY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Modal for products without variants */}
      {quickAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-cream-light flex items-center justify-between">
              <h3 className="font-serif text-lg text-maroon font-bold">ADD TO BILL</h3>
              <button onClick={() => setQuickAddModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5">
              <p className="font-semibold text-gray-800 mb-4">{quickAddModal.product.name}</p>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-semibold">Unit</label>
                  <input type="text" value={quickUnit} onChange={e => setQuickUnit(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="pcs, kg, ltr..." />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-semibold">Price (₹)</label>
                  <input type="number" min="0" step="0.01" value={quickPrice} onChange={e => setQuickPrice(Number(e.target.value))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-semibold">Quantity</label>
                  <input type="number" min="1" value={quickQty} onChange={e => setQuickQty(Math.max(1, Number(e.target.value)))} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
              </div>
              <p className="text-center text-sm text-gray-500 mb-4">Total: <span className="font-bold text-maroon">₹{(quickPrice * quickQty).toFixed(2)}</span></p>
              <button onClick={confirmQuickAdd} className="w-full bg-maroon text-white font-bold py-3 rounded-lg hover:bg-maroon-light transition-colors uppercase tracking-wider text-sm">
                ADD TO BILL
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
