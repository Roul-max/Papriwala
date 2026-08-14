import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import AdminLayout from "./components/AdminLayout";
import MobileLayout from "./components/MobileLayout";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import POS from "./pages/admin/POS";
import Inventory from "./pages/admin/Inventory";

import SplashLogin from "./pages/mobile/SplashLogin";
import Home from "./pages/mobile/Home";
import Cart from "./pages/mobile/Cart";
import Checkout from "./pages/mobile/Checkout";
import Categories from "./pages/mobile/Categories";
import ProductList from "./pages/mobile/ProductList";
import ProductDetail from "./pages/mobile/ProductDetail";
import Orders from "./pages/mobile/Orders";
import Profile from "./pages/mobile/Profile";
import Feedback from "./pages/mobile/Feedback";
import Wishlist from "./pages/mobile/Wishlist";
import AboutUs from "./pages/mobile/AboutUs";
import Gallery from "./pages/mobile/Gallery";

import Bestsellers from "./pages/mobile/Bestsellers";
import AdminOrders from "./pages/admin/Orders";
import AdminCategories from "./pages/admin/Categories";
import AdminEmployee from "./pages/admin/Employee";
import AdminReport from "./pages/admin/Report";
import DealerExpenses from "./pages/admin/Dealer";
import AdminReviews from "./pages/admin/Reviews";
import AdminGallery from "./pages/admin/Gallery";
import AdminSettings from "./pages/admin/Settings";
import AdminProfile from "./pages/admin/Profile";
import { CartProvider } from "./hooks/useCart";
import ErrorBoundary from "./components/ErrorBoundary";

// §2.6.1 Route-to-module mapping for permission enforcement
const ROUTE_MODULE_MAP: Record<string, string> = {
  pos: "POS Billing",
  orders: "Orders",
  inventory: "Inventory",
  categories: "Inventory",
  dealer: "Financial Reports",
  report: "Financial Reports",
  employee: "Orders",
  settings: "Settings",
};

function RequireAuth({ children }: { children: React.ReactElement }) {
  const role = localStorage.getItem("adminRole");
  return role ? children : <Navigate to="/admin/login" replace />;
}

function RequireMobileAuth({ children }: { children: React.ReactElement }) {
  const [isDesktop, setIsDesktop] = React.useState(window.innerWidth >= 768);
  React.useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  if (isDesktop) return <Navigate to="/admin/login" replace />;
  const token = localStorage.getItem("customerToken");
  if (token) return children;
  return <Navigate to="/login" replace />;
}

// Redirects to the first accessible page based on role permissions
function RoleHomeRedirect() {
  const role = localStorage.getItem("adminRole") || "";
  if (role === "Admin") return <Navigate to="/admin/dashboard" replace />;
  const permissions = JSON.parse(localStorage.getItem("accessPermissions") || "{}") as Record<string, Record<string, string>>;
  const rolePerms: Record<string, string> = permissions[role] || {};
  const moduleRouteMap: [string, string][] = [
    ["POS Billing",       "/admin/pos"],
    ["Orders",            "/admin/orders"],
    ["Inventory",         "/admin/inventory"],
    ["Financial Reports", "/admin/dealer"],
    ["Settings",          "/admin/settings"],
  ];
  const first = moduleRouteMap.find(([mod]) => (rolePerms[mod] || "Full Access") !== "Hidden");
  return <Navigate to={first ? first[1] : "/admin/dashboard"} replace />;
}

// §2.6.1 Granular route guard — blocks hidden routes, alerts admin via API
function PermissionGuard({ module, children }: { module: string; children: React.ReactElement }) {
  const location = useLocation();
  const role = localStorage.getItem("adminRole");
  if (role === "Admin") return children;

  const permissions = JSON.parse(localStorage.getItem("accessPermissions") || "{}") as Record<string, Record<string, string>>;
  const rolePerms: Record<string, string> = permissions[role || ""] || {};
  const access = rolePerms[module] || "Full Access";

  if (access === "Hidden") {
    fetch("/api/auth/forbidden-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: location.pathname, role }),
    }).catch(() => {});
    // Redirect to first accessible page instead of always dashboard
    const moduleRouteMap: [string, string][] = [
      ["POS Billing",       "/admin/pos"],
      ["Orders",            "/admin/orders"],
      ["Inventory",         "/admin/inventory"],
      ["Financial Reports", "/admin/dealer"],
      ["Settings",          "/admin/settings"],
    ];
    const first = moduleRouteMap.find(([mod]) => (rolePerms[mod] || "Full Access") !== "Hidden");
    return <Navigate to={first ? first[1] : "/admin/dashboard"} replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin Portal Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
          <Route index element={<RoleHomeRedirect />} />
          <Route path="dashboard" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
          <Route path="pos" element={<PermissionGuard module="POS Billing"><ErrorBoundary><POS /></ErrorBoundary></PermissionGuard>} />
          <Route path="inventory" element={<PermissionGuard module="Inventory"><ErrorBoundary><Inventory /></ErrorBoundary></PermissionGuard>} />
          <Route path="orders" element={<PermissionGuard module="Orders"><ErrorBoundary><AdminOrders /></ErrorBoundary></PermissionGuard>} />
          <Route path="categories" element={<PermissionGuard module="Inventory"><ErrorBoundary><AdminCategories /></ErrorBoundary></PermissionGuard>} />
          <Route path="employee" element={<PermissionGuard module="Employees"><ErrorBoundary><AdminEmployee /></ErrorBoundary></PermissionGuard>} />
          <Route path="report" element={<PermissionGuard module="Financial Reports"><ErrorBoundary><AdminReport /></ErrorBoundary></PermissionGuard>} />
          <Route path="dealer" element={<PermissionGuard module="Financial Reports"><ErrorBoundary><DealerExpenses /></ErrorBoundary></PermissionGuard>} />
          <Route path="reviews" element={<ErrorBoundary><AdminReviews /></ErrorBoundary>} />
          <Route path="gallery" element={<ErrorBoundary><AdminGallery /></ErrorBoundary>} />
          <Route path="settings" element={<PermissionGuard module="Settings"><ErrorBoundary><AdminSettings /></ErrorBoundary></PermissionGuard>} />
          <Route path="profile" element={<ErrorBoundary><AdminProfile /></ErrorBoundary>} />
        </Route>

        {/* Mobile Portal Routes */}
        <Route path="/login" element={<SplashLogin />} />
        <Route path="/" element={<RequireMobileAuth><CartProvider><MobileLayout /></CartProvider></RequireMobileAuth>}>
          <Route index element={<Home />} />
          <Route index element={<Home />} />
          <Route path="bestsellers" element={<Bestsellers />} />
          <Route path="categories" element={<Categories />} />
          <Route path="category/:id" element={<ProductList />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="orders" element={<Orders />} />
          <Route path="profile" element={<Profile />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="about-us" element={<AboutUs />} />
          <Route path="gallery" element={<Gallery />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
