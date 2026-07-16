import React, { useState, useEffect } from "react";
import { Search, Plus, Calendar, Trash2, X, Lock, Clock } from "lucide-react";
import { apiFetch } from "../../lib/apiFetch";

const today = new Date().toISOString().split("T")[0];
const EMPTY_EMP = { full_name: "", designation_tag: "", phone_number: "", salary_type_flag: "Monthly", base_compensation_rate: "", joining_date: "", last_working_date: "" };

export default function AdminEmployee() {
  const [tab, setTab] = useState("directory");
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roles, setRoles] = useState<string[]>(["Cashier", "Chef", "Manager"]);
  const [loginSessions, setLoginSessions] = useState<any[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_EMP });
  const [addError, setAddError] = useState("");

  const [attendanceDate, setAttendanceDate] = useState(today);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  const [isLocked, setIsLocked] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const fetchEmployees = () =>
    apiFetch("/api/employees").then(r => r.json()).then(d => setEmployees(Array.isArray(d) ? d : []));

  const fetchSessions = () =>
    apiFetch("/api/employee-sessions").then(r => r.json()).then(d => setLoginSessions(Array.isArray(d) ? d : []));

  const fetchAttendance = (date: string) => {
    apiFetch(`/api/attendance?date=${date}`).then(r => r.json()).then((records: any[]) => {
      const map: Record<string, string> = {};
      (Array.isArray(records) ? records : []).forEach(r => { map[r.employee_id] = r.status_flag; });
      setAttendanceMap(map);
    });
  };

  useEffect(() => {
    fetchEmployees();
    fetchSessions();
    apiFetch("/api/settings").then(r => r.json()).then(data => {
      const perms = data.permissions || {};
      const roleNames = Object.keys(perms);
      if (roleNames.length > 0) setRoles(roleNames);
    });
  }, []);

  useEffect(() => {
    const isPast = attendanceDate < today;
    setIsLocked(isPast && !adminOverride);
    fetchAttendance(attendanceDate);
  }, [attendanceDate, adminOverride]);

  const filteredEmployees = employees.filter(e =>
    !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.id?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    if (!/^[A-Za-z\s]+$/.test(addForm.full_name)) { setAddError("Full name must contain alphabetic characters only."); return; }
    if (!/^\d{10}$/.test(addForm.phone_number)) { setAddError("Phone must be exactly 10 digits."); return; }
    if (!addForm.designation_tag) { setAddError("Please select a designation."); return; }
    if (!addForm.base_compensation_rate || Number(addForm.base_compensation_rate) <= 0) { setAddError("Enter a valid compensation rate."); return; }
    if (addForm.last_working_date && addForm.last_working_date <= addForm.joining_date) { setAddError("Last working date must be after joining date."); return; }
    await apiFetch("/api/employees", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addForm, name: addForm.full_name, base_compensation_rate: Number(addForm.base_compensation_rate) })
    });
    setShowAddModal(false);
    setAddForm({ ...EMPTY_EMP });
    fetchEmployees();
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Delete this employee?")) return;
    await apiFetch(`/api/employees/${id}`, { method: "DELETE" });
    fetchEmployees();
  };

  const handleAttendanceChange = (empId: string, status: string) => {
    if (isLocked) return;
    setAttendanceMap(prev => ({ ...prev, [empId]: status }));
  };

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    await Promise.all(employees.map(emp =>
      apiFetch("/api/attendance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: emp.id, calendar_date: attendanceDate, status_flag: attendanceMap[emp.id] || "Present" })
      })
    ));
    setSavingAttendance(false);
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col min-h-0 flex-1">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex gap-2">
            <button onClick={() => setTab("directory")} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${tab === "directory" ? "bg-maroon text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              Employee Directory
            </button>
            <button onClick={() => setTab("attendance")} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${tab === "attendance" ? "bg-maroon text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              Attendance Register
            </button>
            <button onClick={() => { setTab("sessions"); fetchSessions(); }} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${tab === "sessions" ? "bg-maroon text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              Login Sessions
            </button>
          </div>
          {tab === "directory" && (
            <button onClick={() => { setShowAddModal(true); setAddError(""); setAddForm({ ...EMPTY_EMP }); }}
              className="bg-maroon hover:bg-maroon-light text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2">
              <Plus size={16} /> Add Employee
            </button>
          )}
        </div>

        {tab === "directory" && (
          <>
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded text-sm" />
              </div>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">Emp ID</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Salary Type</th>
                    <th className="py-3 px-4">Rate (₹)</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-xs">{emp.id}</td>
                      <td className="py-3 px-4 font-bold text-gray-800">{emp.full_name || emp.name}</td>
                      <td className="py-3 px-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{emp.designation_tag}</span></td>
                      <td className="py-3 px-4">{emp.phone_number}</td>
                      <td className="py-3 px-4">{emp.salary_type_flag}</td>
                      <td className="py-3 px-4 font-medium">{emp.base_compensation_rate}</td>
                      <td className="py-3 px-4 text-gray-500">{emp.joining_date}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-gray-400 italic">No employees found.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "sessions" && (
          <div className="overflow-auto flex-1 p-4">
            <p className="text-xs text-gray-400 mb-3">All employee login/logout events — use this to check who was active at any given time.</p>
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Login Time</th>
                  <th className="py-3 px-4">Logout Time</th>
                  <th className="py-3 px-4">Duration</th>
                </tr>
              </thead>
              <tbody>
                {loginSessions.map((s: any) => {
                  const emp = employees.find(e => e.id === s.employee_id);
                  const loginTime = s.login_time ? new Date(s.login_time) : null;
                  const logoutTime = s.logout_time ? new Date(s.logout_time) : null;
                  const duration = loginTime && logoutTime
                    ? (() => { const m = Math.floor((logoutTime.getTime() - loginTime.getTime()) / 60000); return `${Math.floor(m/60)}h ${m%60}m`; })()
                    : loginTime ? "Active" : "—";
                  return (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-bold text-gray-800">{emp?.full_name || emp?.name || s.employee_id}</td>
                      <td className="py-3 px-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{emp?.designation_tag || "—"}</span></td>
                      <td className="py-3 px-4 text-gray-600 text-xs flex items-center gap-1"><Clock size={12} className="text-green-500" />{loginTime ? loginTime.toLocaleString() : "—"}</td>
                      <td className="py-3 px-4 text-gray-600 text-xs">{logoutTime ? logoutTime.toLocaleString() : <span className="text-green-600 font-semibold">Online</span>}</td>
                      <td className="py-3 px-4 text-xs font-medium">{duration}</td>
                    </tr>
                  );
                })}
                {loginSessions.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-400 italic">No login sessions recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === "attendance" && (
          <div className="p-4 flex flex-col flex-1">
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-2 border border-gray-300 rounded px-3 py-2 bg-white">
                <Calendar size={16} className="text-gray-500" />
                <input type="date" max={today} value={attendanceDate} onChange={e => { setAttendanceDate(e.target.value); setAdminOverride(false); }}
                  className="text-sm border-none focus:outline-none" />
              </div>
              {attendanceDate < today && (
                <button onClick={() => setAdminOverride(v => !v)}
                  className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold border transition-colors ${adminOverride ? "bg-amber-100 border-amber-400 text-amber-700" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                  <Lock size={14} /> {adminOverride ? "Override Active" : "Admin Override"}
                </button>
              )}
              {isLocked && (
                <span className="text-xs text-red-500 font-semibold flex items-center gap-1"><Lock size={12} /> Past date — locked. Use Admin Override to edit.</span>
              )}
              <button onClick={handleSaveAttendance} disabled={isLocked || savingAttendance}
                className="ml-auto bg-maroon text-white px-4 py-2 rounded text-sm font-semibold hover:bg-maroon-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {savingAttendance ? "Saving..." : "Save Attendance"}
              </button>
            </div>
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className={`border-b border-gray-100 ${isLocked ? "opacity-60" : "hover:bg-gray-50"}`}>
                    <td className="py-3 px-4 font-bold text-gray-800">{emp.full_name || emp.name} <span className="text-xs font-normal text-gray-500 ml-2">({emp.id})</span></td>
                    <td className="py-3 px-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{emp.designation_tag}</span></td>
                    <td className="py-3 px-4">
                      <select disabled={isLocked} value={attendanceMap[emp.id] || "Present"}
                        onChange={e => handleAttendanceChange(emp.id, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed">
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Half-Day">Half-Day</option>
                        <option value="Paid Leave">Paid Leave (PL)</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-gray-400 italic">No employees found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-xl sticky top-0">
              <h3 className="font-bold text-maroon text-lg">Add Employee</h3>
              <button onClick={() => setShowAddModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Full Name (alphabetic only)</label>
                <input type="text" required value={addForm.full_name} onChange={e => setAddForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Designation</label>
                <select required value={addForm.designation_tag} onChange={e => setAddForm(p => ({ ...p, designation_tag: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon bg-white">
                  <option value="">— Select Role —</option>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Roles are managed in Settings → Role Management.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Phone (10 digits)</label>
                <input type="text" maxLength={10} required value={addForm.phone_number} onChange={e => setAddForm(p => ({ ...p, phone_number: e.target.value.replace(/\D/g, "") }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Salary Type</label>
                <select value={addForm.salary_type_flag} onChange={e => setAddForm(p => ({ ...p, salary_type_flag: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon bg-white">
                  <option value="Monthly">Monthly</option>
                  <option value="Daily">Daily</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Base Compensation Rate (₹)</label>
                <input type="number" min="0" step="0.01" required value={addForm.base_compensation_rate} onChange={e => setAddForm(p => ({ ...p, base_compensation_rate: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Joining Date</label>
                <input type="date" required value={addForm.joining_date} onChange={e => setAddForm(p => ({ ...p, joining_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Last Working Date <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="date" value={addForm.last_working_date} onChange={e => setAddForm(p => ({ ...p, last_working_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-maroon" />
              </div>
              {addError && <p className="text-red-500 text-sm">{addError}</p>}
              <button type="submit" className="w-full bg-maroon text-white font-bold py-2.5 rounded hover:bg-maroon-light transition-colors mt-2">Add Employee</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
