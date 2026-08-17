// QZ Tray integration for direct thermal printing (no browser popup)
// Requires QZ Tray installed on the billing PC: https://qz.io
// Set PRINTER_NAME below to match your exact Windows printer name (Devices & Printers)

const PRINTER_NAME = "POS-80C";

const QZ_CERT = `-----BEGIN CERTIFICATE-----
MIIECzCCAvOgAwIBAgIGAaAPmCS5MA0GCSqGSIb3DQEBCwUAMIGiMQswCQYDVQQG
EwJVUzELMAkGA1UECAwCTlkxEjAQBgNVBAcMCUNhbmFzdG90YTEbMBkGA1UECgwS
UVogSW5kdXN0cmllcywgTExDMRswGQYDVQQLDBJRWiBJbmR1c3RyaWVzLCBMTEMx
HDAaBgkqhkiG9w0BCQEWDXN1cHBvcnRAcXouaW8xGjAYBgNVBAMMEVFaIFRyYXkg
RGVtbyBDZXJ0MB4XDTI2MDgxNjEyMDAyNFoXDTQ2MDgxNjEyMDAyNFowgaIxCzAJ
BgNVBAYTAlVTMQswCQYDVQQIDAJOWTESMBAGA1UEBwwJQ2FuYXN0b3RhMRswGQYD
VQQKDBJRWiBJbmR1c3RyaWVzLCBMTEMxGzAZBgNVBAsMElFaIEluZHVzdHJpZXMs
IExMQzEcMBoGCSqGSIb3DQEJARYNc3VwcG9ydEBxei5pbzEaMBgGA1UEAwwRUVog
VHJheSBEZW1vIENlcnQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCT
+eVSvEcCfWwl0eAsZ1Tp9PuDTo+rEtqOlf3vcGtRbG3/++zqJiBKoD5WL+Dnjkxp
173+lS5IYVuK4ekIBZUKIRB2WxpjdXI4ooanwz096/FIK0rrKvF7ES3frUbq3EQ4
CmVyprY+oR/aiQQi8DDrWDzQMIQtkZRDMscaN9QScL+iMV3I6uDuHKt1xA/5xOgn
D2o6VgucfM0hwlTx1rIEtcsBZEpY6e/qLiwIRvsivcJv0ea7RbatH3l6k6t3jXPS
iWlLUgm0Ja6xxzndFJmU/kmDEvYVmZ2F/uy/QZaWZkXsuEWC9HEFMKXreyE2ds/M
v+0Uk+EoJnuRqobbD1RjAgMBAAGjRTBDMBIGA1UdEwEB/wQIMAYBAf8CAQEwDgYD
VR0PAQH/BAQDAgEGMB0GA1UdDgQWBBT/8sbw6TY/jAS2xb19TIEymrNaijANBgkq
hkiG9w0BAQsFAAOCAQEAAuWkil2yi+hvicXn578MEfKnPzuRKqKBoBhRpso8B6oi
5IzjzJwpDpedmuCzunIx3/nEXuiTT70ZYyMfA1elIojEqBatya2OSGmwjf0FIG9t
GjZVUohwpkYzavjNMUuKrkIiCpHY92tQnCRuL80lNWgjwWiyvIljFXo2i+8qqcvz
I/OZwFLXs2kD4rYPUn+9BlMRkg21Z5nRlzT6nZO9I26YZHafCpEyTqHwDx/QSLZB
08hlhBY28XvoBcaGSis94Ksj7EfWw+/FT2dP13fwYu7fCnFzoYXq+w1RaaL1d9Ub
tdvqUR9BMQfcynehgud3Xkuud/TxKWGZxxKOODOvjw==
-----END CERTIFICATE-----`;

const QZ_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCT+eVSvEcCfWwl
0eAsZ1Tp9PuDTo+rEtqOlf3vcGtRbG3/++zqJiBKoD5WL+Dnjkxp173+lS5IYVuK
4ekIBZUKIRB2WxpjdXI4ooanwz096/FIK0rrKvF7ES3frUbq3EQ4CmVyprY+oR/a
iQQi8DDrWDzQMIQtkZRDMscaN9QScL+iMV3I6uDuHKt1xA/5xOgnD2o6VgucfM0h
wlTx1rIEtcsBZEpY6e/qLiwIRvsivcJv0ea7RbatH3l6k6t3jXPSiWlLUgm0Ja6x
xzndFJmU/kmDEvYVmZ2F/uy/QZaWZkXsuEWC9HEFMKXreyE2ds/Mv+0Uk+EoJnuR
qobbD1RjAgMBAAECggEAKiPu1jZvBHsCWuzfadXNfUj6fWTYji/y1MtLQy5hKZF2
7ADq8a2E4aurxPCinF7OTRAW99K1GQC8yJrYOaQZUwaigQolxDA0pINIVKtJnAI+
tr45eipDFbiJN1tJyGWM+eagCFwIp2JMR3hgmLCNReBdhS5j3fRI5DAoOkOu3ccW
ISuUlcmi5Tjr4P1nL/Ntqcu2nrtBTApiwEa5EyCWIjxQH5wpWslLsIde1x9BuVIz
LAdwKwvQDFaG1YyNlGu5bCmT5O3qrAatCgeCR50kzdYyY84kPUjRhpkIKjRemH47
gpuNjvXEpSLmhS604hon34T4CWVBXvfLrRnBX2p52QKBgQDKuLsKEMyx9iCNMazK
tmw94b56YmwqzIv+k5zEuv2ddp0LPQ80Beuz8nirtTzX79qXh0OoOCg4c6huCRG6
s3Ujfa2Ss6eFlNmpHjkFEGnD/1vxlHhmSDU25QZcNNoBHSZNcHnSNuKegrIEEBUo
d3NjpOWq1rbLONW3Nh6ppqVMiwKBgQC63dklFaQ/RBZNRibBEjuAhWwlGxQlQQ1c
YD6T3y0QQ6MDtNQlCTWaCBz88J1d6yTH96R0nhiWjH9ciPNozqqTgNdPnTCKLAxz
hOKJ4cc6lIerHc1cT6h3H8l/0t5379GSi7Af4R+iLHhlWha1ldsr4lNCU2iNc5Nd
tfQXEqHaiQKBgFabi5UmTj1tmMSZx2enfiEF89nXeLzkPJ8bs2s9NCL0zO1DPd6M
9QEhAzrgqEjc+Tepm1cf/tb3WqsABuoLx2zNQb2eMWDZkhA1kEjAlV8eFsrkEngo
O0vjls8H6Wd2a6nD9te/iRwNXD5uHIv4VHzqsxBEwT2bX3rxjTIPtyk3AoGBALjm
MSl3q4iKR4L4qfoan1PBMUvZ6moeXykLdn/8sWtJcbCGKe/nl+kso/pH336B4GgZ
Ctn1YSD+LjuSqz8GV1QShXmacOAXS862Ky4BgI/fTgqsN3piu6/7fPcE4OpOGtFl
dMVmjVV7qTmoFZZhjHd0v6t+OpLUTHnKQ5bc8df5AoGBAJQIMHjWGREMGkt9luMx
pBPU9gurkYswCvjH4iO9a6MqFTRe21AbeNmYizZJBhqjpLOzoBG1OIRPQspXPAfk
hcYye0eAtiHk/u3/73ebCz9N0HuzigOKYilwp8AA7aFFupe001IJbSaigUgmRxUx
0egK87STUy5ZVunNEqs5a9w8
-----END PRIVATE KEY-----`;

declare const qz: any;

function loadQzScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof qz !== "undefined") { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.6/qz-tray.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load QZ Tray script"));
    document.head.appendChild(s);
  });
}

async function connectQz(): Promise<boolean> {
  try {
    await loadQzScript();

    qz.security.setCertificatePromise((resolve: any) => resolve(QZ_CERT));
    qz.security.setSignaturePromise((toSign: any) => {
      return (resolve: any, reject: any) => {
        const keyData = QZ_PRIVATE_KEY
          .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, "")
          .replace(/\s+/g, "");
        const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
        crypto.subtle.importKey(
          "pkcs8", binaryKey.buffer,
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" },
          false, ["sign"]
        ).then(key => {
          const encoder = new TextEncoder();
          return crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(toSign));
        }).then(sig => {
          resolve(btoa(String.fromCharCode(...new Uint8Array(sig))));
        }).catch(reject);
      };
    });

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
