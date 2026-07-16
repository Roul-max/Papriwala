import React, { useState } from "react";
import { Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SplashLogin() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (phone.length !== 10) { setError("Enter a valid 10-digit phone number."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, password: phone, role: "Employee" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError("Invalid name or phone number."); return; }
      localStorage.setItem("adminRole", data.role);
      localStorage.setItem("adminName", data.name);
      localStorage.setItem("sessionToken", data.sessionToken || "");
      localStorage.setItem("employeePhone", phone);
      if (data.employee_id) localStorage.setItem("employeeId", data.employee_id);
      if (data.permissions) localStorage.setItem("accessPermissions", JSON.stringify({ [data.role]: data.permissions }));
      navigate("/");
    } catch { setError("Server error. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="mobile-portal flex flex-col h-screen w-full max-w-md mx-auto bg-maroon relative shadow-2xl sm:border-x sm:border-gray-200">
      <div className="absolute inset-0 opacity-10 bg-[url('/cover.png')] bg-cover bg-center"></div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 text-cream p-6">
        <div className="w-32 h-32 rounded-full border-4 border-gold mb-4 flex items-center justify-center bg-white overflow-hidden shadow-xl">
          <img src="/Logo.png" alt="Logo" className="w-full h-full object-contain p-1" />
        </div>
        <h1 className="font-serif text-3xl text-gold font-bold mb-1 tracking-wider">SHRI BADRINARAYAN</h1>
        <p className="text-sm tracking-[0.3em] uppercase mb-4 font-semibold">Papriwale</p>
        <p className="text-[10px] tracking-widest text-cream/80 mb-6">SWEETS | NAMKEEN | BAKERY</p>
        <p className="text-lg font-light italic">"Managing Sweetness, Digitally"</p>
      </div>

      {/* Login Sheet */}
      <div className="bg-cream-light rounded-t-3xl p-8 pb-12 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        <h2 className="text-2xl font-bold text-maroon mb-1">Welcome!</h2>
        <p className="text-gray-500 mb-6 text-sm">Enter your name and phone to continue</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text" placeholder="Your full name" required value={name}
              onChange={e => setName(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-maroon text-base font-medium shadow-sm"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="tel" maxLength={10} placeholder="10-digit phone number" required value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-maroon text-base font-medium tracking-wider shadow-sm"
            />
          </div>
          {error && <p className="text-red-600 text-sm font-semibold">{error}</p>}
          <button type="submit" disabled={loading || !name.trim() || phone.length < 10}
            className="w-full bg-maroon text-cream font-bold py-4 rounded-xl hover:bg-maroon-light transition-colors shadow-md text-lg disabled:opacity-60">
            {loading ? "Logging in..." : "Continue"}
          </button>
        </form>

        <div className="text-center mt-6">
          <button onClick={() => navigate("/admin/login")} className="text-maroon text-xs font-semibold hover:underline">
            Admin Login →
          </button>
        </div>
        <p className="text-center text-gray-400 text-[10px] mt-4 uppercase tracking-wider">
          © 2026 Papriwale. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
