import React, { useState, useRef } from "react";
import { Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DEMO_PHONE = "9876500001";
const DEMO_OTP   = "1234";

export default function SplashLogin() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    setTimer(60);
    timerRef.current = setInterval(() => {
      setTimer(v => { if (v <= 1) { clearInterval(timerRef.current!); return 0; } return v - 1; });
    }, 1000);
  };

  const sendOtp = async () => {
    setError(""); setLoading(true);
    // Demo — skip API entirely
    if (phone === DEMO_PHONE) { setStep("otp"); setOtp(""); startTimer(); setLoading(false); return; }
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to send OTP"); return; }
      setStep("otp"); setOtp(""); startTimer();
    } catch { setError("Server error. Please try again."); }
    finally { setLoading(false); }
  };

  const handlePhoneSubmit = (e: React.FormEvent) => { e.preventDefault(); if (phone.length === 10) sendOtp(); };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) return;
    // Demo — bypass API
    if (phone === DEMO_PHONE && otp === DEMO_OTP) {
      localStorage.setItem("adminRole", "Cashier");
      localStorage.setItem("adminName", "Ramesh Kumar");
      navigate("/admin/dashboard");
      return;
    }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid OTP"); setOtp(""); return; }
      localStorage.setItem("adminRole", data.role);
      localStorage.setItem("adminName", data.name);
      localStorage.setItem("sessionToken", data.sessionToken);
      if (data.employee_id) localStorage.setItem("employeeId", data.employee_id);
      if (data.permissions) localStorage.setItem("accessPermissions", JSON.stringify({ [data.role]: data.permissions }));
      navigate("/admin/dashboard");
    } catch { setError("Server error. Please try again."); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOtp(e.target.value.replace(/\D/g, "").slice(0, 4));
  };

  return (
    <div className="mobile-portal flex flex-col h-screen w-full max-w-md mx-auto bg-maroon relative shadow-2xl sm:border-x sm:border-gray-200">
      <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1559564104-e3c79a528c0b?auto=format&fit=crop&q=80&w=600')] bg-cover bg-center mix-blend-overlay"></div>

      {/* Top Hero */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 text-cream p-6">
        <div className="w-32 h-32 rounded-full border-4 border-gold mb-4 flex items-center justify-center bg-cream text-maroon overflow-hidden shadow-xl">
          <img src="https://images.unsplash.com/photo-1559564104-e3c79a528c0b?auto=format&fit=crop&q=80&w=200" alt="Logo" className="w-full h-full object-cover opacity-80" />
        </div>
        <h1 className="font-serif text-3xl text-gold font-bold mb-1 tracking-wider">SHRI BADRINARAYAN</h1>
        <p className="text-sm tracking-[0.3em] uppercase mb-4 font-semibold">Papriwale</p>
        <p className="text-[10px] tracking-widest text-cream/80 mb-6">SWEETS | NAMKEEN | BAKERY</p>
        <p className="text-lg font-light italic">"Managing Sweetness, Digitally"</p>
      </div>

      {/* Bottom Sheet */}
      <div className="bg-cream-light rounded-t-3xl p-8 pb-12 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom duration-500">
        <h2 className="text-2xl font-bold text-maroon mb-1">Welcome!</h2>

        {step === "phone" ? (
          <>
            <p className="text-gray-500 mb-4 text-sm">Login to continue</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-700">
              Demo: phone <strong>9876500001</strong> → OTP <strong>1234</strong>
            </div>
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter Number"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon text-lg font-medium tracking-wider shadow-sm"
                  required
                />
              </div>
              {error && <p className="text-red-600 text-sm font-semibold">{error}</p>}
              <button type="submit" disabled={loading || phone.length < 10} className="w-full bg-maroon text-cream font-bold py-4 rounded-xl hover:bg-maroon-light transition-colors shadow-md text-lg disabled:opacity-60">
                {loading ? "Sending..." : "Get OTP"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="text-gray-500 mb-8 text-sm">Enter OTP sent to +91 {phone.slice(0,5)} {phone.slice(5)}</p>
            <form onSubmit={handleOtpSubmit} className="space-y-8">
              <div className="relative flex justify-between gap-4">
                <input
                  ref={inputRef}
                  type="tel"
                  maxLength={4}
                  value={otp}
                  onChange={handleOtpChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10"
                  autoFocus
                  required
                />
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-full aspect-square flex items-center justify-center bg-white border rounded-xl text-2xl font-bold shadow-sm ${
                      otp.length === i ? "border-maroon ring-2 ring-maroon" : "border-gray-200"
                    }`}
                  >
                    {otp[i] || ""}
                  </div>
                ))}
              </div>
              {error && <p className="text-red-600 text-sm font-semibold text-center">{error}</p>}
              <div className="text-center">
                {timer > 0
                  ? <span className="text-gray-400 text-sm">Resend in {timer}s</span>
                  : <button type="button" onClick={sendOtp} className="text-maroon text-sm font-semibold hover:underline">Re-send OTP?</button>
                }
              </div>
              <button type="submit" disabled={loading || otp.length < 4} className="w-full bg-maroon text-cream font-bold py-4 rounded-xl hover:bg-maroon-light transition-colors shadow-md text-lg disabled:opacity-60">
                {loading ? "Verifying..." : "Login"}
              </button>
            </form>
          </>
        )}

        <p className="text-center text-gray-400 text-[10px] mt-8 uppercase tracking-wider">
          © 2026 Papriwale. All Rights Reserved.
        </p>
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/admin/login')}
            className="text-maroon text-xs font-semibold hover:underline"
          >
            Admin / Employee Login
          </button>
        </div>
      </div>
    </div>
  );
}
