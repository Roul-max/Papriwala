// QZ Tray integration for direct thermal printing (no browser popup)
// Requires QZ Tray installed on the billing PC: https://qz.io
// Set PRINTER_NAME below to match your exact Windows printer name (Devices & Printers)

const PRINTER_NAME = "POS-80C";

const QZ_CERT = `-----BEGIN CERTIFICATE-----
MIIECzCCAvOgAwIBAgIGAaAPXccWMA0GCSqGSIb3DQEBCwUAMIGiMQswCQYDVQQG
EwJVUzELMAkGA1UECAwCTlkxEjAQBgNVBAcMCUNhbmFzdG90YTEbMBkGA1UECgwS
UVogSW5kdXN0cmllcywgTExDMRswGQYDVQQLDBJRWiBJbmR1c3RyaWVzLCBMTEMx
HDAaBgkqhkiG9w0BCQEWDXN1cHBvcnRAcXouaW8xGjAYBgNVBAMMEVFaIFRyYXkg
RGVtbyBDZXJ0MB4XDTI2MDgxNjEwNTYzOVoXDTQ2MDgxNjEwNTYzOVowgaIxCzAJ
BgNVBAYTAlVTMQswCQYDVQQIDAJOWTESMBAGA1UEBwwJQ2FuYXN0b3RhMRswGQYD
VQQKDBJRWiBJbmR1c3RyaWVzLCBMTEMxGzAZBgNVBAsMElFaIEluZHVzdHJpZXMs
IExMQzEcMBoGCSqGSIb3DQEJARYNc3VwcG9ydEBxei5pbzEaMBgGA1UEAwwRUVog
VHJheSBEZW1vIENlcnQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC1
OjiKH1z9bjacJK24dkroJLESmYqjTyryctwmTxeQaTKgjBSGLzxGkHDll8iM6D7W
ScKeFxw0i36VdSGZ1/VoMi8LkLVQ7B3GPjJeeH032g6sMUBgDNy8LVN+A6+EBz+k
iwu8vTVYIWcuJq0jDxYfq45vKLBNU5iDKwRoKvmzpI8CmC58rsBH4rWtMpbwaONI
kQ6DeymO2STJueTHmmS4L+fw/fyjg0LVlHIsNoQVbTt0mJH/9cwfk9490RCVoV8y
eyuhHM/C2ofGfimEfF7nQQnvtBlSUuMra1RKtxKeUjFmlaFLn4sJT/gy7ZXuK6Y5
ISqUEtHN/UWyWMdeTUo/AgMBAAGjRTBDMBIGA1UdEwEB/wQIMAYBAf8CAQEwDgYD
VR0PAQH/BAQDAgEGMB0GA1UdDgQWBBTap4Xcj+ctJUyAZvbHi2UOLzRPPTANBgkq
hkiG9w0BAQsFAAOCAQEADOPbgQZF3ym0Hea1sGcyTTMT1qmH1D0yU1Q4XpvsTkvH
4c4Gf2rpWwWQEgvQuGR7mu4iidyIWxasWMj8Ok0yXc93BbU8xQsB/EwyTEhUdEHP
N60DfmEn9QGgmDykTN5Pe+CAz8F8t1jtBrEEaRs2y8MQHBJFL4k0Jlao7IxRrs6/
VI27frG+SMw0qeGqzPPQmjGN1B3ttOxCf6qVWRJ3Mn9sLx9/Eug4KWf2IlAMTedW
bf+ObcsbWVG6/N2jUwukdUlQtsAESq04Ku8OojJejWTw9VeyqN4DxHFADRbQRDUt
Rn4AG4ac2sG0hhBUAkKNew8QwE1oUoVsh1U95MIKMg==
-----END CERTIFICATE-----`;

const QZ_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC1OjiKH1z9bjac
JK24dkroJLESmYqjTyryctwmTxeQaTKgjBSGLzxGkHDll8iM6D7WScKeFxw0i36V
dSGZ1/VoMi8LkLVQ7B3GPjJeeH032g6sMUBgDNy8LVN+A6+EBz+kiwu8vTVYIWcu
Jq0jDxYfq45vKLBNU5iDKwRoKvmzpI8CmC58rsBH4rWtMpbwaONIkQ6DeymO2STJ
ueTHmmS4L+fw/fyjg0LVlHIsNoQVbTt0mJH/9cwfk9490RCVoV8yeyuhHM/C2ofG
fimEfF7nQQnvtBlSUuMra1RKtxKeUjFmlaFLn4sJT/gy7ZXuK6Y5ISqUEtHN/UWy
WMdeTUo/AgMBAAECggEAAe3KPbtwqGZoXoYDjKmpYxtGvERpKQIU50VwfgLSsbdj
UfUyH8s6HEZs45bTP2wnhO1LHf0atr9kAVE6TTFZTg4AjLeQCr5AFDXhqNPhvZJf
2CNVyu/rTyBbk1Y/X0D4fywsfb2S3qRlcGjpGz4WMocphLvk3YzDOg+BWaK/McIz
bM/MXR6MnER9kyIvYbuIxXTsXdBeX+mGRZTVPD+HVhmCyQF1RlRwq6oBd5V8tOpX
9i+PBVf1fPbSDQohnkTIXvvGvky/8/ueFkNZQUb5KtpRZGQSvp7bl1H719CUMSxN
XLZdpVvqWbqlFzLELm9rInZQD18cvaU8amzflI/aQQKBgQDmnlUR9LKtGoJKz7C9
pc4BWBNZ80hIoMKusXDWFkznxrAv6uxLOmglfErtLlqjO+jI7PdMSGyB7h0vhoQA
V+SnsK28iRgswfDMJQQGCZZ5lJvhUiDrmhhdQbuJ50yUw/z8Os4k901aSXtRFg1L
AIuiEdKVA7Ebl4xEsZiEGUnVHwKBgQDJLEwTUBWrPAtaonuRPcpiWK+7b+bD9KhQ
4++l8X5IAq6XXb5aT9aOt0MV3ZQ6ykGAWu7nexXXkXtZpWXHTfVkhtyt7Ap3CUql
bxYMi3n0aNR8cvQd4SMHxKcRvDMFo4psUI4spJZp42halo4Q5DrOfe2G7RkTkgfS
UlD76Q3G4QKBgQCIuFNMutn2v+GAgpKQTCzOJS4LxKwUyqHAOVfgxAXB3svzDH4b
tzupBX/SDwoS/eBqxflyUvlpKgZJd6DoJzNaqubFAC3B0xRzono5LhP0bkLfmPYF
VyyclOyeu+5tv6dKzX4K8kX8gdXG46Dr1x3w7kn+p9qmtfilfPgjUG6yFwKBgEF9
eTqkTJmVD4Eu+hkbS4Jeqr7TPAW45P6IZaDZECozLVE7hFd0PD3zrRQ2MSY+Z7p4
X+PdrwuhYc2aSZrrZyKVwMuh1vpPfQyEMGJfGZGWeu4UoiIEA9poi5b7dIS2a769
LrubzReln3g2IQOguQA2AJh3IT28wW0XvSN1CDYhAoGBANmnZDbL+hdfsKyNr4l+
78odFR2BkylTNDGBghx5ZYRiWA9Q/+m4+/cjxNVt/1iBFXYFLdJC1Cz3OAzB8HEJ
DyE32V7IKFYbmNCDbjj+G+L0CjVzCKfyK+Q2ZYN3aLn+mJJm8+rfA6ihOdcLDJdu
pYHtfbjnWE6wdH1Qp2s2LD5a
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
