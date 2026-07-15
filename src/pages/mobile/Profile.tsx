import { useNavigate } from "react-router-dom";
import { ChevronLeft, User, LogOut, Camera, Edit2, Check } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";

export default function Profile() {
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState("Customer");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedAvatar = localStorage.getItem("customerAvatar");
    const savedName = localStorage.getItem("customerName");
    if (savedAvatar) setAvatar(savedAvatar);
    if (savedName) setName(savedName);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatar(base64String);
        localStorage.setItem("customerAvatar", base64String);
        window.dispatchEvent(new Event("customerProfileUpdated"));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNameSave = () => {
    if (tempName.trim()) {
      setName(tempName.trim());
      localStorage.setItem("customerName", tempName.trim());
      window.dispatchEvent(new Event("customerProfileUpdated"));
    }
    setIsEditingName(false);
  };

  return (
    <div className="flex flex-col min-h-full bg-cream-light pb-24">
      <div className="bg-white p-4 flex items-center border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="mr-4 text-maroon">
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-serif text-xl text-gold font-bold uppercase tracking-wider">PROFILE</h2>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
          
          <div className="relative mb-4">
            <div 
              className="w-24 h-24 bg-maroon rounded-full flex items-center justify-center text-gold border-4 border-cream-light shadow-inner overflow-hidden"
            >
              {avatar ? (
                <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={48} />
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-gold text-white p-2 rounded-full shadow-md border-2 border-white"
            >
              <Camera size={16} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          {isEditingName ? (
            <div className="flex items-center gap-2 mb-2 w-full max-w-[200px]">
              <input 
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="w-full border-b-2 border-maroon focus:outline-none text-center font-bold text-lg text-gray-800 bg-transparent py-1"
                autoFocus
              />
              <button onClick={handleNameSave} className="text-green-600 p-1 bg-green-50 rounded-full">
                <Check size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-2 group">
              <h3 className="font-bold text-xl text-gray-800">{name}</h3>
              <button 
                onClick={() => { setTempName(name); setIsEditingName(true); }}
                className="text-gray-400 p-1"
              >
                <Edit2 size={16} />
              </button>
            </div>
          )}

          <p className="text-gray-500 text-sm mb-8">+91 98765 43210</p>
          
          <button onClick={() => navigate("/login")} className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 transition-colors border border-red-100 flex items-center justify-center gap-2">
            <LogOut size={20} /> Logout
          </button>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h4 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Preferences</h4>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-gray-800">Order Notifications</p>
              <p className="text-xs text-gray-500 mt-1">Get updates about your order status</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked={localStorage.getItem("notificationsEnabled") !== "false"} onChange={(e) => {
                localStorage.setItem("notificationsEnabled", e.target.checked.toString());
                window.dispatchEvent(new Event("notificationsPreferenceChanged"));
              }} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-maroon"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
