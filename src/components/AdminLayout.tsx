import { Outlet, Link, useLocation, Navigate, useNavigate } from "react-router-dom";
import { Search, Bell, Settings, User, ShoppingCart, Package, List, Users, FileText, Star, AlertTriangle, X, ExternalLink, LayoutDashboard, Image } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../lib/apiFetch";

export default function AdminLayout() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{products: any[], dealers: any[], employees: any[]} | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showNotifs, setShowNotifs] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(localStorage.getItem("adminAvatar"));
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [badgeFlash, setBadgeFlash] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [searchBlocked, setSearchBlocked] = useState<string | null>(null);

  // §2.1.2 INVENTORY_DEPLETED — persistent critical error badge on inventory sidebar link
  const [inventoryDepleted, setInventoryDepleted] = useState(false);

  // §2.1.2 DEALER_INVOICE_DUE — high-contrast modal action list window
  const [dealerInvoiceModal, setDealerInvoiceModal] = useState<{
    dealer_name: string; amount_due: string; expiry_date: string; dealer_id: string;
  } | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const alertChimeRef = useRef<HTMLAudioElement | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    const handleOffline = () => setIsOffline(true);
    const handleOnline  = () => setIsOffline(false);
    const handleAvatarChange = () => setAvatar(localStorage.getItem("adminAvatar"));

    window.addEventListener("resize", handleResize);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online",  handleOnline);
    window.addEventListener("avatarChanged", handleAvatarChange);

    // Load notifications from DB
    apiFetch("/api/notifications").then(r => r.json()).then((data: any[]) => {
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    }).catch(() => {});

    // Close notif panel on any click outside the bell+panel
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchResults(null);
    };
    document.addEventListener("click", handleOutsideClick);

    // §2.1.2 Hardware-Level Sound Driver Infrastructure
    const initAudio = () => {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
          alertChimeRef.current = new Audio();
          alertChimeRef.current.src = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
        }
      }
      window.removeEventListener("click", initAudio);
    };
    window.addEventListener("click", initAudio);

    // WebSocket Real-Time Logic — with auto-reconnect
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    const connectWS = () => {
      if (destroyed) return;
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${window.location.host}/api/ws`);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const addNotif = (title: string, desc: string, type: string) => {
            const n = { id: Math.random().toString(), title, description: desc, notif_type: type, read: false, created_at: new Date().toISOString() };
            setNotifications(prev => [n, ...prev]);
            setUnreadCount(prev => prev + 1);
            setBadgeFlash(true);
            setTimeout(() => setBadgeFlash(false), 700);
          };

          if (data.type === "INBOUND_QR_ORDER") {
            addNotif(`New QR Order #${data.payload.order_id}`, `Table ${data.payload.table_number} • ₹${data.payload.bill_amount}`, "info");
            if (alertChimeRef.current) { alertChimeRef.current.currentTime = 0; alertChimeRef.current.play().catch(() => {}); }
          }
          if (data.type === "INVENTORY_DEPLETED") {
            setInventoryDepleted(true);
            addNotif(`🚫 Out of Stock: SKU ${data.payload.sku_code}`, `Product ${data.payload.product_id} has reached zero stock.`, "error");
          }
          if (data.type === "LOW_STOCK_ALERT") {
            addNotif(`⚠️ Low Stock: ${data.payload.product_name}`, `Only ${data.payload.remaining_qty} units left.`, "warning");
          }
          if (data.type === "DEALER_INVOICE_DUE") {
            setDealerInvoiceModal({ dealer_id: data.payload.dealer_id, dealer_name: data.payload.dealer_name, amount_due: data.payload.amount_due, expiry_date: data.payload.expiry_date });
          }
        } catch {}
      };

      ws.onclose = () => {
        if (!destroyed) reconnectTimer = setTimeout(connectWS, 3000);
      };

      ws.onerror = () => ws.close();
    };

    connectWS();

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("avatarChanged", handleAvatarChange);
      window.removeEventListener("click", initAudio);
      document.removeEventListener("click", handleOutsideClick);
      ws?.close();
    };
  }, []);

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults(null); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) setSearchResults(await res.json());
      } catch { setIsOffline(true); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const navigate = useNavigate();

  const role = localStorage.getItem("adminRole") || "";
  const permissions: Record<string, Record<string, string>> = JSON.parse(localStorage.getItem("accessPermissions") || "{}");
  const rolePerms: Record<string, string> = permissions[role] || {};
  const canSee = (module: string) => role === "Admin" || (rolePerms[module] || "Full Access") !== "Hidden";

  const goTo = (path: string, requiredModule: string | null) => {
    if (requiredModule && !canSee(requiredModule)) {
      setSearchBlocked(requiredModule);
      setTimeout(() => setSearchBlocked(null), 3000);
      return;
    }
    setSearchQuery("");
    setSearchResults(null);
    navigate(path);
  };

  if (isMobile) return <Navigate to="/" replace />;

  const allNavItems = [
    { name: "Dashboard",          path: "/admin/dashboard", icon: LayoutDashboard, module: null },
    { name: "POS Billing",        path: "/admin/pos",       icon: ShoppingCart,    module: "POS Billing" },
    { name: "Orders",             path: "/admin/orders",    icon: ShoppingCart,    module: "Orders",     badge: false },
    { name: "Products Inventory", path: "/admin/inventory", icon: Package,         module: "Inventory",  badge: inventoryDepleted },
    { name: "Categories",         path: "/admin/categories",icon: List,            module: "Inventory" },
    { name: "Dealer & Expenses",  path: "/admin/dealer",    icon: FileText,        module: "Financial Reports" },
    { name: "Employee",           path: "/admin/employee",  icon: Users,           module: "Employees" },
    { name: "Report",             path: "/admin/report",    icon: FileText,        module: "Financial Reports" },
    { name: "Reviews",            path: "/admin/reviews",   icon: Star,            module: null },
    { name: "Settings",           path: "/admin/settings",  icon: Settings,        module: "Settings" },
  ];

  const navItems = allNavItems.filter(item => item.module === null || canSee(item.module));

  return (
    <div className="flex h-screen w-full bg-cream">
      {/* Sidebar */}
      <aside className="w-64 bg-maroon text-cream-light flex flex-col fixed h-full z-10">
        <div className="p-6 text-center border-b border-maroon-light">
          <div className="w-20 h-20 rounded-full border-2 border-gold mx-auto mb-3 flex items-center justify-center bg-cream-light overflow-hidden">
            <img src="/Logo.png" alt="Logo" className="w-full h-full object-contain p-1" />
          </div>
          <h1 className="font-serif text-lg text-gold font-bold leading-tight">SHRI BADRINARAYAN</h1>
          <p className="text-xs tracking-widest uppercase mt-1">Papriwale</p>
          <p className="text-[10px] text-cream/70 mt-1">SWEETS | NAMKEEN | BAKERY</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <Link key={item.name} to={item.path}
              onClick={() => { if (item.path === "/admin/inventory") setInventoryDepleted(false); }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors relative ${location.pathname === item.path ? "bg-gold text-maroon font-semibold" : "hover:bg-maroon-light text-cream/90"}`}>
              <item.icon size={18} />
              {item.name}
              {/* §2.1.2 Persistent critical error icon marker badge on inventory link */}
              {(item as any).badge && (
                <span className="ml-auto flex items-center gap-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  <AlertTriangle size={9} /> DEPLETED
                </span>
              )}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col h-full overflow-hidden">
        {/* §2.1 Header: position fixed, top 0, width 100vw, z-index 9999 */}
        <header style={{ position: "fixed", top: 0, left: "256px", width: "calc(100vw - 256px)", zIndex: 9999 }}
          className="h-16 bg-cream border-b border-gold/20 flex items-center justify-between px-6">

          <h2 className="font-serif text-2xl text-maroon font-semibold capitalize">
            {location.pathname.split("/").pop()?.replace("-", " ") || "Dashboard"}
          </h2>

          <div className="flex items-center gap-6">
            {/* Omni-Search */}
            <div className="relative" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text" placeholder="Omni-Search..."
                className={`pl-10 pr-4 py-2 rounded-full border bg-white text-sm focus:outline-none focus:border-gold w-64 ${isOffline ? "border-red-500" : "border-gray-300"}`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchResults && (
                <div className={`absolute top-full left-0 right-0 mt-2 bg-white rounded-md shadow-lg border max-h-[400px] overflow-y-auto z-50 ${isOffline ? "border-red-500" : "border-gray-100"}`}>
                  <div className="p-3 text-sm">
                    {isOffline && <div className="text-red-500 text-xs text-center pb-2 border-b border-gray-100 mb-2">Network offline. Local lookup only.</div>}
                    {searchResults.products.length === 0 && searchResults.dealers.length === 0 && searchResults.employees.length === 0 && (
                      <div className="text-gray-500 text-center py-2 search-no-match">No matching ecosystem records found.</div>
                    )}
                    {searchBlocked && (
                      <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-2 text-xs font-semibold">
                        🚫 Access denied — "{searchBlocked}" module is hidden for your role.
                      </div>
                    )}
                    {searchResults.products.length > 0 && (
                      <div className="mb-2">
                        <h4 className="font-semibold text-xs text-maroon uppercase mb-1">Products</h4>
                        {searchResults.products.map(p => (
                          <button key={p.id} onClick={() => goTo("/admin/inventory", "Inventory")}
                            className="w-full text-left py-1.5 hover:bg-maroon/5 px-2 rounded cursor-pointer flex items-center justify-between group">
                            <span className="font-medium text-gray-800 group-hover:text-maroon">{p.name}</span>
                            <span className="text-xs text-gray-400">{p.sku}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.dealers.length > 0 && (
                      <div className="mb-2">
                        <h4 className="font-semibold text-xs text-maroon uppercase mb-1">Dealers</h4>
                        {searchResults.dealers.map(d => (
                          <button key={d.id} onClick={() => goTo("/admin/dealer", "Financial Reports")}
                            className="w-full text-left py-1.5 hover:bg-maroon/5 px-2 rounded cursor-pointer flex items-center justify-between group">
                            <span className="font-medium text-gray-800 group-hover:text-maroon">{d.name}</span>
                            <span className="text-xs text-gray-400">{d.gstin}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.employees.length > 0 && (
                      <div className="mb-2">
                        <h4 className="font-semibold text-xs text-maroon uppercase mb-1">Employees</h4>
                        {searchResults.employees.map(e => (
                          <button key={e.id} onClick={() => goTo("/admin/employee", "Employees")}
                            className="w-full text-left py-1.5 hover:bg-maroon/5 px-2 rounded cursor-pointer flex items-center justify-between group">
                            <span className="font-medium text-gray-800 group-hover:text-maroon">{e.name || e.full_name}</span>
                            <span className="text-xs text-gray-400">{e.id}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bell / Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                className="relative w-10 h-10 flex items-center justify-center text-maroon hover:text-gold transition-colors focus:outline-none"
                onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) { setUnreadCount(0); apiFetch("/api/notifications/read-all", { method: "PATCH" }).catch(() => {}); } }}>
                <Bell size={24} />
                {unreadCount > 0 && (
                  <span className={`absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${badgeFlash ? "badge-flash" : ""}`}>
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-full mt-3 w-80 bg-white border border-gray-100 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-100 bg-gray-50"><h3 className="font-bold text-gray-800">Notifications</h3></div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
                    ) : notifications.map(notif => (
                      <div key={notif.id} className="p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                        <p className={`text-sm font-semibold ${notif.notif_type === "error" ? "text-red-600" : notif.notif_type === "warning" ? "text-amber-600" : "text-gray-800"}`}>{notif.title}</p>
                        <p className="text-xs text-gray-600">{notif.description}</p>
                        <span className="text-[10px] text-gray-400 mt-1 block">{new Date(notif.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 text-center border-t border-gray-100 bg-gray-50">
                    <button onClick={() => { apiFetch("/api/notifications", { method: "DELETE" }).catch(() => {}); setNotifications([]); setUnreadCount(0); }} className="text-xs font-semibold text-maroon hover:text-maroon-light">Clear all</button>
                  </div>
                </div>
              )}
            </div>

            {canSee("Settings") && (
              <Link to="/admin/settings" className="w-10 h-10 flex items-center justify-center text-maroon hover:text-gold cursor-pointer transition-colors">
                <Settings size={24} />
              </Link>
            )}

            <div className="relative group">
              <div className="flex items-center gap-2 border-l border-gray-300 pl-4 cursor-pointer">
                <div className="text-right">
                  <p className="text-sm font-semibold text-maroon">{localStorage.getItem("adminName") || "Super Admin"}</p>
                  <p className="text-[10px] text-gray-500 uppercase">{localStorage.getItem("adminRole") || "Admin"}</p>
                </div>
                <div className="w-10 h-10 bg-maroon rounded-full flex items-center justify-center text-gold overflow-hidden">
                  {avatar ? <img src={avatar} alt="Admin" className="w-full h-full object-cover" /> : <User size={20} />}
                </div>
              </div>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                <Link to="/admin/profile" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-maroon border-b border-gray-50 font-medium">Profile Settings</Link>
                <button onClick={() => {
                  const token = localStorage.getItem("sessionToken") || "";
                  if (token) apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
                  localStorage.clear(); sessionStorage.clear();
                  setNotifications([]); setUnreadCount(0);
                  setSearchQuery(""); setSearchResults(null);
                  window.location.replace("/admin/login");
                }} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-medium">Logout</button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-white relative mt-16">
          <Outlet />
        </main>
      </div>

      {/* §2.1.2 DEALER_INVOICE_DUE — High-contrast modal action list window */}
      {dealerInvoiceModal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border-2 border-amber-400">
            {/* High-contrast header */}
            <div className="bg-amber-400 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle size={24} className="text-amber-900" />
                <h3 className="font-serif text-xl font-bold text-amber-900">DEALER INVOICE DUE</h3>
              </div>
              <button onClick={() => setDealerInvoiceModal(null)} className="text-amber-900 hover:text-amber-700">
                <X size={22} />
              </button>
            </div>
            {/* Action list */}
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Dealer</span>
                  <span className="font-bold text-gray-900 text-lg">{dealerInvoiceModal.dealer_name}</span>
                </div>
                <div className="flex justify-between items-center border-t border-amber-200 pt-3">
                  <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Amount Due</span>
                  <span className="font-bold text-red-600 text-2xl">₹{dealerInvoiceModal.amount_due}</span>
                </div>
                <div className="flex justify-between items-center border-t border-amber-200 pt-3">
                  <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Due Date</span>
                  <span className="font-bold text-amber-700 text-lg">{dealerInvoiceModal.expiry_date}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link
                  to="/admin/dealer"
                  onClick={() => setDealerInvoiceModal(null)}
                  className="flex items-center justify-center gap-2 bg-maroon text-white font-bold py-3 rounded-xl hover:bg-maroon-light transition-colors text-sm">
                  <ExternalLink size={16} /> View Dealer
                </Link>
                <button
                  onClick={() => setDealerInvoiceModal(null)}
                  className="bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors text-sm">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
