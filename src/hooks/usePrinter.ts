// QZ Tray integration for direct thermal printing (no browser popup)
// Requires QZ Tray installed on the billing PC: https://qz.io
// Set PRINTER_NAME below to match your exact Windows printer name (Devices & Printers)

const PRINTER_NAME = "POS-80C"; // e.g. "EPSON TM-T82" — leave empty to use QZ default printer

declare const qz: any;

function loadQzScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof qz !== "undefined") { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load QZ Tray script"));
    document.head.appendChild(s);
  });
}

async function connectQz(): Promise<boolean> {
  try {
    await loadQzScript();
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect({ retries: 2, delay: 1 });
    }
    return true;
  } catch {
    return false;
  }
}

// Build ESC/POS receipt data from order details
function buildReceiptData(params: {
  invoiceNo: string;
  cashier: string;
  paymentMode: string;
  items: { name: string; size?: string; unit?: string; qty: number; price: number }[];
  subtotal: number;
  discountTotal: number;
  taxes: number;
  grandTotal: number;
  otherCharges?: number;
}): string[] {
  const { invoiceNo, cashier, paymentMode, items, subtotal, discountTotal, taxes, grandTotal, otherCharges } = params;
  const now = new Date();
  const date = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;
  const time = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

  const ESC  = "\x1B";
  const GS   = "\x1D";
  const INIT = ESC + "\x40";           // Initialize
  const CENTER = ESC + "\x61\x01";     // Center align
  const LEFT   = ESC + "\x61\x00";     // Left align
  const BOLD_ON  = ESC + "\x45\x01";
  const BOLD_OFF = ESC + "\x45\x00";
  const DOUBLE_ON  = GS + "\x21\x11";  // Double width+height
  const DOUBLE_OFF = GS + "\x21\x00";
  const CUT  = GS + "\x56\x41\x10";   // Partial cut
  const DRAWER = ESC + "\x70\x00\x19\xFA"; // Open cash drawer pin 2

  const LW = 42; // characters per line on 80mm printer

  const pad = (left: string, right: string, width = LW) => {
    const gap = width - left.length - right.length;
    return left + " ".repeat(Math.max(1, gap)) + right;
  };

  const divider = "-".repeat(LW) + "\n";

  let itemLines = "";
  items.forEach(item => {
    const isGm = (item.unit || "").toLowerCase() === "gm";
    const displayQty = isGm
      ? (item.qty >= 1000 ? `${(item.qty/1000).toFixed(3)}kg` : `${item.qty}gm`)
      : String(item.qty);
    const name = (item.name + (item.size ? ` (${item.size})` : "")).slice(0, 22);
    const amt  = `${(item.price * item.qty).toFixed(2)}`;
    itemLines += pad(`${name} x${displayQty}`, `Rs.${amt}`) + "\n";
  });

  const data: string[] = [
    INIT,
    CENTER, BOLD_ON, DOUBLE_ON,
    "Shri Badrinarayan\n",
    DOUBLE_OFF,
    "Papriwale\n",
    BOLD_OFF,
    "Sweets | Namkeen | Bakery\n",
    "Main Road, Buxar, Bihar - 802101\n",
    "Ph: +91 9876543210\n",
    "GST: 10AAAAA0000A1Z5\n",
    LEFT,
    divider,
    pad(`Date: ${date}`, `Time: ${time}`) + "\n",
    pad(`Cashier: ${cashier.toUpperCase()}`, `Bill: ${invoiceNo.slice(-6)}`) + "\n",
    `Payment: ${paymentMode}\n`,
    divider,
    BOLD_ON,
    pad("Item", "Amount") + "\n",
    BOLD_OFF,
    divider,
    itemLines,
    divider,
    pad("Subtotal:", `Rs.${subtotal.toFixed(2)}`) + "\n",
    ...(discountTotal > 0 ? [pad("Discount:", `-Rs.${discountTotal.toFixed(2)}`) + "\n"] : []),
    ...((otherCharges ?? 0) > 0 ? [pad("Other Charges:", `Rs.${(otherCharges!).toFixed(2)}`) + "\n"] : []),
    pad("Tax 5% (incl.):", `Rs.${taxes.toFixed(2)}`) + "\n",
    divider,
    CENTER, BOLD_ON, DOUBLE_ON,
    `TOTAL: Rs.${grandTotal.toFixed(2)}\n`,
    DOUBLE_OFF, BOLD_OFF,
    divider,
    CENTER,
    "Thank You & Visit Again!\n",
    "www.papriwale.com\n",
    "\n\n\n",
    CUT,
  ];

  return data;
}

// Main hook
export function usePrinter() {
  const printReceipt = async (
    params: Parameters<typeof buildReceiptData>[0],
    openDrawer = false
  ): Promise<{ ok: boolean; fallback?: boolean }> => {
    const connected = await connectQz();

    if (!connected) {
      // QZ Tray not running — fall back to browser iframe print
      return { ok: false, fallback: true };
    }

    try {
      const printerName = PRINTER_NAME || await qz.printers.getDefault();
      const config = qz.configs.create(printerName);
      const data = buildReceiptData(params);

      if (openDrawer) {
        // Append cash drawer open command after cut
        data.push("\x1B\x70\x00\x19\xFA");
      }

      await qz.print(config, [{ type: "raw", format: "plain", data: data.join("") }]);
      return { ok: true };
    } catch (e: any) {
      console.error("[usePrinter] QZ print error:", e?.message);
      return { ok: false, fallback: true };
    }
  };

  const openCashDrawer = async (): Promise<void> => {
    const connected = await connectQz();
    if (!connected) return;
    try {
      const printerName = PRINTER_NAME || await qz.printers.getDefault();
      const config = qz.configs.create(printerName);
      await qz.print(config, [{ type: "raw", format: "plain", data: "\x1B\x70\x00\x19\xFA" }]);
    } catch {}
  };

  return { printReceipt, openCashDrawer };
}
