import React, { useState, useRef, useEffect } from "react";
import { User, Camera, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { apiFetch } from "../../lib/apiFetch";

export default function AdminProfile() {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const role = localStorage.getItem("adminRole") || "";
  const name = localStorage.getItem("adminName") || "Super Admin";
  const isAdmin = role === "Admin";

  useEffect(() => {
    const savedAvatar = localStorage.getItem("adminAvatar");
    if (savedAvatar) setAvatar(savedAvatar);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatar(base64String);
        localStorage.setItem("adminAvatar", base64String);
        window.dispatchEvent(new Event("avatarChanged"));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}/;
    if (!currentPassword) { setPasswordError("Please enter current password."); return; }
    if (!newPassword.match(passRegex)) { setPasswordError("Min 8 chars, upper/lowercase, number, special character."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match."); return; }
    try {
      const res = await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_pass: currentPassword, new_pass: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPasswordError(data.error || "Failed to update password."); return; }
      setPasswordSuccess(true);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch {
      setPasswordError("Server error. Please try again.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-serif text-maroon font-bold mb-6">Profile Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="relative mb-4 group cursor-pointer" onClick={() => isAdmin && fileInputRef.current?.click()}>
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-cream-light bg-gray-50 flex items-center justify-center shadow-inner relative">
                {avatar ? (
                  <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={48} className="text-gray-300" />
                )}
                {isAdmin && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white mb-1" />
                    <span className="text-white text-xs font-semibold">Change Photo</span>
                  </div>
                )}
              </div>
              {isAdmin && (
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-800">{name}</h2>
            <p className="text-sm text-gray-500 mb-3">{isAdmin ? "admin@papriwale.com" : `Role: ${role}`}</p>
            <div className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full ${isAdmin ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
              {isAdmin ? "Full Access" : role}
            </div>
          </div>
        </div>

        {/* Change Password — Admin only */}
        <div className="md:col-span-2">
          {isAdmin ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <Lock className="text-maroon" />
                <h2 className="text-xl font-bold text-gray-800">Change Password</h2>
              </div>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
                    placeholder="Enter current password" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
                    placeholder="Enter new password" />
                  <p className="text-xs text-gray-500 mt-1">Min 8 chars, upper/lowercase, number, special character.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon"
                    placeholder="Confirm new password" />
                </div>
                {passwordError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-semibold">
                    <AlertCircle size={16} /> {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg text-sm font-semibold">
                    <CheckCircle2 size={16} /> Password successfully updated!
                  </div>
                )}
                <button type="submit" className="bg-maroon hover:bg-maroon-light text-white font-bold py-2.5 px-6 rounded-lg transition-colors">
                  Update Password
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center min-h-[200px]">
              <Lock size={40} className="text-gray-200 mb-3" />
              <p className="text-gray-500 font-semibold">Password management is restricted to Admin only.</p>
              <p className="text-gray-400 text-sm mt-1">Contact your administrator to reset your credentials.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
