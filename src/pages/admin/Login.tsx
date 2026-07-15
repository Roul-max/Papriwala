import React, { useState } from "react";
import { User, Lock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [role, setRole] = useState<"Admin" | "Employee">("Admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid credentials"); return; }
      localStorage.setItem("adminRole",    data.role);
      localStorage.setItem("adminName",    data.name);
      localStorage.setItem("sessionToken", data.sessionToken);
      if (data.employee_id) localStorage.setItem("employeeId", data.employee_id);
      if (data.permissions) localStorage.setItem("accessPermissions", JSON.stringify({ [data.role]: data.permissions }));
      if (data.avatar) { localStorage.setItem("adminAvatar", data.avatar); window.dispatchEvent(new Event("avatarChanged")); }

      // Redirect to first accessible page based on role permissions
      if (data.role === "Admin") {
        navigate("/admin/dashboard");
      } else {
        const perms: Record<string, string> = data.permissions || {};
        const moduleRouteMap: [string, string][] = [
          ["POS Billing",       "/admin/pos"],
          ["Orders",            "/admin/orders"],
          ["Inventory",         "/admin/inventory"],
          ["Financial Reports", "/admin/dealer"],
          ["Employees",         "/admin/employee"],
          ["Settings",          "/admin/settings"],
        ];
        const first = moduleRouteMap.find(([mod]) => (perms[mod] || "Full Access") !== "Hidden");
        navigate(first ? first[1] : "/admin/dashboard");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full font-sans">
      {/* Left Panel */}
      <div className="hidden lg:flex w-1/2 bg-maroon text-cream flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1559564104-e3c79a528c0b?auto=format&fit=crop&q=80&w=1200')] bg-cover bg-center mix-blend-overlay"></div>
        <div className="relative z-10 text-center flex flex-col items-center">
          <div className="w-32 h-32 rounded-full border-4 border-gold mb-6 flex items-center justify-center bg-cream text-maroon overflow-hidden">
            <img src="https://images.unsplash.com/photo-1559564104-e3c79a528c0b?auto=format&fit=crop&q=80&w=200" alt="Logo" className="w-full h-full object-cover opacity-80" />
          </div>
          <h1 className="font-serif text-4xl text-gold font-bold mb-2">SHRI BADRINARAYAN</h1>
          <p className="text-sm tracking-[0.3em] uppercase mb-8">Papriwale</p>
          <p className="text-xl font-light italic">"Managing Sweetness, Digitally"</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center items-center p-8 relative">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-maroon mb-2">Welcome Back!</h2>
          <p className="text-gray-500 mb-8">Login to continue</p>

          <div className="flex bg-gray-100 p-1 rounded-md mb-8">
            <button
              className={`flex-1 py-2 rounded-sm text-sm font-semibold transition-colors ${role === "Admin" ? "bg-white shadow text-maroon" : "text-gray-500 hover:text-maroon"}`}
              onClick={() => { setRole("Admin"); setError(""); }}
            >
              Admin
            </button>
            <button
              className={`flex-1 py-2 rounded-sm text-sm font-semibold transition-colors ${role === "Employee" ? "bg-white shadow text-maroon" : "text-gray-500 hover:text-maroon"}`}
              onClick={() => { setRole("Employee"); setError(""); }}
            >
              Employee
            </button>
          </div>

          {role === "Employee" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-700 space-y-1.5">
              <p className="font-bold mb-1">Employee credentials (name / phone):</p>
              <p>🧾 <strong>Cashier</strong> — <code>Ramesh Kumar</code> / <code>9876500001</code></p>
              <p>👨‍🍳 <strong>Chef</strong> — <code>Suresh Yadav</code> / <code>9876500002</code></p>
              <p>🏢 <strong>Manager</strong> — <code>Priya Sharma</code> / <code>9876500003</code></p>
            </div>
          )}
          {role === "Admin" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-700">
              Default credentials: <strong>admin</strong> / <strong>Admin@1234</strong>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-semibold">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-maroon text-white font-semibold py-3 rounded-md hover:bg-maroon-light transition-colors shadow-md disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* Mobile OTP link */}
          <div className="lg:hidden text-center mt-6">
            <button
              onClick={() => navigate("/login")}
              className="text-maroon text-sm font-semibold hover:underline"
            >
              Login with OTP instead →
            </button>
          </div>
        </div>

        <p className="absolute bottom-6 text-gray-400 text-xs">
          © 2026 Papriwale. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
