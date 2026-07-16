import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { Home, Grid, ShoppingBag, User, Menu, X, FileText, Bell } from "lucide-react";
import { useState, useEffect } from "react";

export default function MobileLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [avatar, setAvatar] = useState<string | null>(localStorage.getItem("customerAvatar"));
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);

  useEffect(() => {
    // §3.1 — QR session binding: extract table_id from URL and lock to sessionStorage
    const params = new URLSearchParams(window.location.search);
    const tableId = params.get("table_id");
    if (tableId) sessionStorage.setItem("qr_table_id", tableId);

    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    const handleProfileUpdate = () => {
      setAvatar(localStorage.getItem("customerAvatar"));
    };
    
    // Simulate checking for unread notifications based on preferences
    const checkNotifications = () => {
      const enabled = localStorage.getItem("notificationsEnabled") !== "false";
      setHasUnreadNotifications(enabled);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("customerProfileUpdated", handleProfileUpdate);
    window.addEventListener("notificationsPreferenceChanged", checkNotifications);
    
    checkNotifications();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("customerProfileUpdated", handleProfileUpdate);
      window.removeEventListener("notificationsPreferenceChanged", checkNotifications);
    };
  }, []);

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
          <Link to="/orders" className="p-1 relative">
            <Bell size={20} />
            {hasUnreadNotifications && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-maroon rounded-full"></span>
            )}
          </Link>
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
