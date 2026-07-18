import { useEffect, useState, useCallback } from "react";
import { IndianRupee, ClipboardList, BarChart3, AlertTriangle, XOctagon, Users, Package, TrendingUp, ArrowRight, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/apiFetch";

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [totalUnitsSold, setTotalUnitsSold] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [a, o] = await Promise.all([
        apiFetch("/api/analytics").then(r => r.json()),
        apiFetch("/api/orders").then(r => r.json()),
      ]);
      setAnalytics(a);
      setRecentOrders(o.slice(0, 5));
      const today = new Date().toISOString().split("T")[0];
      const units = o
        .filter((ord: any) => ord.order_status === "Paid" && ord.timestamp?.startsWith(today))
        .reduce((sum: number, ord: any) => sum + (ord.items?.reduce((s: number, it: any) => s + (it.qty || 1), 0) || 0), 0);
      setTotalUnitsSold(units);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const cards = analytics
    ? [
        { title: "Today's Sales",     value: `₹${Number(analytics.totalRevenue || 0).toFixed(0)}`, icon: IndianRupee,   color: "text-green-600 bg-green-50" },
        { title: "Today's Orders",    value: analytics.totalOrders,                                 icon: ClipboardList, color: "text-blue-600 bg-blue-50" },
        { title: "Total Product Sale",value: totalUnitsSold,                                        icon: BarChart3,     color: "text-maroon bg-cream" },
        { title: "Low Stock Items",   value: analytics.lowStock,                                    icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
        { title: "Out of Stock Items",value: analytics.outOfStock,                                  icon: XOctagon,      color: "text-red-600 bg-red-50" },
      ]
    : [];

  const statusColor: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-700",
    "In-Preparation": "bg-blue-100 text-blue-700",
    Ready: "bg-green-100 text-green-700",
    Paid: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 select-none">
        {loading
          ? Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 animate-pulse h-20" />
            ))
          : cards.map((card, i) => (
              <div key={i} className="bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-100 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
                  <card.icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-gray-800 leading-none">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{card.title}</p>
                </div>
              </div>
            ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Recent Orders */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-serif text-xl text-maroon font-semibold">Recent Orders</h3>
            <div className="flex items-center gap-3">
              <button onClick={() => fetchData(true)} className="text-gray-400 hover:text-maroon transition-colors">
                <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              </button>
              <Link to="/admin/orders" className="flex items-center gap-1 text-sm text-maroon font-semibold hover:underline">
                View All <ArrowRight size={14} />
              </Link>
            </div>
          </div>
          {recentOrders.length === 0 ? (
            <div className="text-center text-gray-500 py-12 border-2 border-dashed border-gray-100 rounded-lg">
              No recent orders found.
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{order.id}</p>
                    <p className="text-xs text-gray-500">Table {order.table_id || "—"} · {order.items?.length || 0} items</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-800 text-sm">₹{order.grand_total}</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColor[order.order_status] || "bg-gray-100 text-gray-600"}`}>
                      {order.order_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions + Low Stock Alert */}
        <div className="w-full lg:w-1/3 space-y-4">
          <Link to="/admin/dealer" className="w-full bg-maroon hover:bg-maroon-light text-white font-semibold py-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
            <Users size={20} /> Manage Dealers
          </Link>
          <Link to="/admin/inventory" className="w-full bg-maroon hover:bg-maroon-light text-white font-semibold py-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
            <Package size={20} /> Manage Inventory
          </Link>
          <Link to="/admin/pos" className="w-full border-2 border-maroon text-maroon hover:bg-maroon hover:text-white font-semibold py-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
            <TrendingUp size={20} /> Open POS
          </Link>

          {analytics && analytics.lowStock > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 font-bold text-sm">⚠ Low Stock Alert</p>
              <p className="text-amber-700 text-xs mt-1">{analytics.lowStock} product(s) below safety threshold.</p>
              <Link to="/admin/inventory" className="text-xs text-amber-800 font-bold underline mt-2 inline-block">View Inventory →</Link>
            </div>
          )}
          {analytics && analytics.outOfStock > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-bold text-sm">🚫 Out of Stock</p>
              <p className="text-red-700 text-xs mt-1">{analytics.outOfStock} product(s) are out of stock.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
