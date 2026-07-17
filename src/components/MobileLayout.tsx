import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { Home, Grid, ShoppingBag, User, Menu, X, FileText, Bell } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../lib/apiFetch";

export default function MobileLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [avatar, setAvatar] = useState<string | null>(localStorage.getItem("customerAvatar"));
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableId = params.get("table_id");
    if (tableId) sessionStorage.setItem("qr_table_id", tableId);

    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    const handleProfileUpdate = () => setAvatar(localStorage.getItem("customerAvatar"));

    window.addEventListener("resize", handleResize);
    window.addEventListener("customerProfileUpdated", handleProfileUpdate);

    // Load notifications
    const loadNotifs = () => {
      apiFetch("/api/notifications").then(r => r.json()).then((data: any[]) => {
        if (Array.isArray(data)) {
          // Mobile: only show order-related notifications
          const mobile = data.filter(n => ["INBOUND_QR_ORDER", "TABLE_STATE_CHANGE"].includes(n.type));
          setNotifications(mobile);
          setUnreadCount(mobile.filter(n => !n.read).length);
        }
      }).catch(() => {});
    };
    loadNotifs();

    // WebSocket for real-time order updates on mobile
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
          if (["INBOUND_QR_ORDER", "TABLE_STATE_CHANGE"].includes(data.type)) {
            loadNotifs();
          }
        } catch {}
      };
      ws.onclose = () => { if (!destroyed) reconnectTimer = setTimeout(connectWS, 3000); };
      ws.onerror = () => ws.close();
    };
    connectWS();

    // Close notif panel on outside click
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
    };
    document.addEventListener("mousedown", handleClick);

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("customerProfileUpdated", handleProfileUpdate);
      document.removeEventListener("mousedown", handleClick);
      ws?.close();
    };
  }, []);

  const handleBellClick = () => {
    setShowNotifs(v => !v);
    if (!showNotifs && unreadCount > 0) {
      apiFetch("/api/notifications/read-all", { method: "PATCH" }).catch(() => {});
      setUnreadCount(0);
    }
  };

  const clearNotifs = () => {
    apiFetch("/api/notifications", { method: "DELETE" }).catch(() => {});
    setNotifications([]);
    setUnreadCount(0);
  };

  if (isDesktop) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="mobile-portal flex flex-col h-screen w-full max-w-md mx-auto bg-cream-light font-sans relative overflow-hidden shadow-2xl sm:border-x sm:border-gray-200">
      {/* Top Header */}
      <header className="bg-maroon text-cream flex items-center justify-between p-4 shrink-0 z-20">
        <button onClick={() => setSidebarOpen(true)} className="p-1">
          <Menu size={24} />
        </button>
        <img src="/Logo.png" alt="Logo" className="w-12 h-12 object-contain absolute left-1/2 -translate-x-1/2" />
        <div className="flex items-center space-x-3">
          <div className="relative" ref={notifRef}>
            <button onClick={handleBellClick} className="p-1 relative">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-maroon rounded-full text-white text-[9px] font-bold flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <span className="font-bold text-gray-800 text-sm">Notifications</span>
                  <button onClick={clearNotifs} className="text-xs text-maroon font-semibold">Clear all</button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">No notifications</div>
                  ) : notifications.map(n => (
                    <div key={n.id} className={`px-4 py-3 border-b border-gray-50 ${!n.read ? "bg-amber-50" : ""}`}>
                      <p className={`text-sm font-semibold ${n.notif_type === "error" ? "text-red-600" : n.notif_type === "warning" ? "text-amber-600" : "text-gray-800"}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.description}</p>
                      <span className="text-[10px] text-gray-400 mt-1 block">{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link to="/profile" className="p-1">
            {avatar ? (
              <img src={avatar} alt="Profile" className="w-6 h-6 rounded-full object-cover border border-gold/50" />
            ) : (
              <User size={20} />
            )}
          </Link>
        </div>
      </header>

      {/* Main Content (Scrollable) */}
      <main className="flex-1 overflow-y-auto bg-cream-light pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 shrink-0 z-20 pb-safe">
        {[
          { name: "Home", path: "/", icon: Home },
          { name: "Categories", path: "/categories", icon: Grid },
          { name: "Cart", path: "/cart", icon: ShoppingBag },
          { name: "Orders", path: "/orders", icon: FileText },
          { name: "Profile", path: "/profile", icon: User }
        ].map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.name} to={item.path} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-maroon' : 'text-gray-400 hover:text-maroon-light'}`}>
              <item.icon size={20} className={isActive ? 'fill-maroon/10' : ''} />
              <span className="text-[10px] font-semibold">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Hamburger Sidebar (Overlay) */}
      {sidebarOpen && (
        <div className="absolute inset-0 z-50 flex">
          <div className="absolute inset-0 bg-maroon/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
          <div className="relative w-4/5 max-w-[300px] h-full bg-cream-light flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-6 bg-maroon text-center border-b border-maroon-light">
              <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-cream/70 hover:text-white">
                <X size={24} />
              </button>
              <div className="w-24 h-24 rounded-full border-2 border-gold mx-auto mb-3 overflow-hidden bg-white">
                <img src="/Logo.png" alt="Logo" className="w-full h-full object-contain p-1" />
              </div>
              <p className="text-[10px] text-cream/70 mt-2 uppercase tracking-widest">SWEETS | NAMKEEN | BAKERY</p>
            </div>
            
            <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
              {['Home', 'Categories', 'Feedback', 'About us', 'Wishlist', 'Orders', 'Gallery'].map((link) => (
                <Link key={link} to={link === 'Home' ? '/' : `/${link.toLowerCase().replace(' ', '-')}`} onClick={() => setSidebarOpen(false)} className="block px-4 py-3 text-maroon font-medium hover:bg-maroon/5 rounded-md transition-colors">
                  {link}
                </Link>
              ))}
            </nav>
            <div className="p-4 text-center text-xs text-maroon/50 border-t border-maroon/10">
              © 2026 Papriwale.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
