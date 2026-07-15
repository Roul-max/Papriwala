import { useState, useEffect } from "react";
import { Shield, Bell, Save, CheckCircle2, Plus, Trash2, Users } from "lucide-react";
import { apiFetch } from "../../lib/apiFetch";

const MODULES = ["POS Billing", "Orders", "Inventory", "Financial Reports", "Settings"];
const ACCESS_LEVELS = ["Full Access", "Read-Only", "Hidden"];
const DEFAULT_PERMS = { "POS Billing": "Full Access", Orders: "Read-Only", Inventory: "Hidden", "Financial Reports": "Hidden", Settings: "Hidden" };

type PermMatrix = Record<string, Record<string, string>>;

export default function AdminSettings() {
  const [permissions, setPermissions] = useState<PermMatrix>({});
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [dailyReport, setDailyReport] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Role management state
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleError, setNewRoleError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/settings").then(r => r.json()).then(data => {
      const perms = data.permissions || {};
      setPermissions(perms);
      setLowStockAlerts(data.lowStockAlerts ?? true);
      setDailyReport(data.dailyReportSummary ?? false);
      localStorage.setItem("accessPermissions", JSON.stringify(perms));
      setLoading(false);
    });
  }, []);

  const roles = Object.keys(permissions);

  const handlePermChange = (role: string, module: string, value: string) => {
    setPermissions(prev => ({ ...prev, [role]: { ...(prev[role] || {}), [module]: value } }));
  };

  const handleAddRole = () => {
    setNewRoleError("");
    const name = newRoleName.trim();
    if (!name) { setNewRoleError("Role name cannot be empty."); return; }
    if (!/^[A-Za-z\s]+$/.test(name)) { setNewRoleError("Role name must be alphabetic only."); return; }
    if (permissions[name]) { setNewRoleError(`Role "${name}" already exists.`); return; }
    setPermissions(prev => ({ ...prev, [name]: { ...DEFAULT_PERMS } }));
    setNewRoleName("");
  };

  const handleDeleteRole = (role: string) => {
    setPermissions(prev => {
      const next = { ...prev };
      delete next[role];
      return next;
    });
    setDeleteConfirm(null);
  };

  const handleSave = async () => {
    await apiFetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions, lowStockAlerts, dailyReportSummary: dailyReport }),
    });
    localStorage.setItem("accessPermissions", JSON.stringify(permissions));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading settings...</div>;

  return (
    <div className="max-w-5xl space-y-6">

      {/* ── Role Management ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Users className="text-maroon" size={20} />
          <h3 className="font-serif text-lg text-maroon font-bold">Role Management</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-4">
            Create custom employee roles. Each new role starts with default permissions — adjust them in the Access Control Matrix below, then click <strong>Save Settings</strong>.
          </p>

          {/* Existing roles */}
          <div className="flex flex-wrap gap-2 mb-5">
            {roles.map(role => (
              <div key={role} className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-700">
                <span>{role}</span>
                {deleteConfirm === role ? (
                  <span className="flex items-center gap-1 ml-1">
                    <button onClick={() => handleDeleteRole(role)}
                      className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold hover:bg-red-700">
                      Confirm
                    </button>
                    <button onClick={() => setDeleteConfirm(null)}
                      className="text-[10px] bg-gray-300 text-gray-700 px-1.5 py-0.5 rounded font-bold hover:bg-gray-400">
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button onClick={() => setDeleteConfirm(role)}
                    className="ml-1 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
            {roles.length === 0 && <p className="text-sm text-gray-400 italic">No roles defined yet.</p>}
          </div>

          {/* Add new role */}
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <input
                type="text"
                placeholder="New role name (e.g. Supervisor)"
                value={newRoleName}
                onChange={e => { setNewRoleName(e.target.value); setNewRoleError(""); }}
                onKeyDown={e => e.key === "Enter" && handleAddRole()}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-maroon"
              />
              {newRoleError && <p className="text-red-500 text-xs mt-1">{newRoleError}</p>}
            </div>
            <button onClick={handleAddRole}
              className="bg-maroon text-white px-4 py-2 rounded text-sm font-semibold hover:bg-maroon-light transition-colors flex items-center gap-1 whitespace-nowrap">
              <Plus size={15} /> Add Role
            </button>
          </div>
        </div>
      </div>

      {/* ── Access Control Matrix ────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Shield className="text-maroon" size={20} />
          <h3 className="font-serif text-lg text-maroon font-bold">Access Control Matrix</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-4">
            Configure module permissions per role. <strong>Hidden</strong> routes return 403 and alert Admin.
          </p>
          {roles.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-6">Add a role above to configure permissions.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border border-gray-200 rounded">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase">
                  <tr>
                    <th className="py-3 px-4">Module</th>
                    {roles.map(r => <th key={r} className="py-3 px-4 text-center">{r}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {MODULES.map(mod => (
                    <tr key={mod} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{mod}</td>
                      {roles.map(role => {
                        const val = permissions[role]?.[mod] || "Full Access";
                        return (
                          <td key={role} className="py-3 px-4 text-center">
                            <select
                              value={val}
                              onChange={e => handlePermChange(role, mod, e.target.value)}
                              className={`border rounded text-xs py-1 px-2 ${
                                val === "Hidden"    ? "border-red-300 bg-red-50 text-red-700" :
                                val === "Read-Only" ? "border-yellow-300 bg-yellow-50 text-yellow-700" :
                                "border-green-300 bg-green-50 text-green-700"
                              }`}
                            >
                              {ACCESS_LEVELS.map(l => <option key={l}>{l}</option>)}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">
            Employees accessing hidden routes trigger a 403 alert to the Admin notification panel.
          </p>
        </div>
      </div>

      {/* ── Notification Routing ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Bell className="text-maroon" size={20} />
          <h3 className="font-serif text-lg text-maroon font-bold">Notification Routing</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <p className="font-bold text-gray-800">Low Stock Alerts</p>
              <p className="text-xs text-gray-500">Push notification when inventory drops below safety threshold.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={lowStockAlerts} onChange={e => setLowStockAlerts(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-800">Daily Report Summary</p>
              <p className="text-xs text-gray-500">Automated WhatsApp summary to Admin at 10:00 PM daily.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={dailyReport} onChange={e => setDailyReport(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4">
        {saved && (
          <span className="flex items-center gap-2 text-green-600 text-sm font-semibold">
            <CheckCircle2 size={16} /> Settings saved successfully!
          </span>
        )}
        <button onClick={handleSave} className="bg-maroon text-white font-bold py-3 px-8 rounded shadow-md hover:bg-maroon-light transition-colors flex items-center gap-2">
          <Save size={18} /> Save Settings
        </button>
      </div>
    </div>
  );
}
