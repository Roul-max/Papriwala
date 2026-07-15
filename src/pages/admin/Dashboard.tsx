import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, ShoppingBag, Users, Package, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/apiFetch";

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [dealers, setDealers] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/analytics").then(r => r.json()),
      apiFetch("/api/dealers").then(r => r.json()),
      apiFetch("/api/orders").then(r => r.json()),
    ]).then(([a, d, o]) => {
      setAnalytics(a);
      setDealers(d);
      setRecentOrders(o.slice(0, 5));
      setLoading(false);
    });
  }, []);

  const fmt = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n}`;

  const cards = analytics
    ? [
        { title: "Today's Revenue", value: fmt(analytics.totalRevenue), icon: DollarSign, sub: `${analytics.totalSales} paid orders`, color: "text-green-600 bg-green-50" },
        { title: "Total Orders Today", value: analytics.totalOrders, icon: ShoppingBag, sub: "All pipeline states", color: "text-blue-600 bg-blue-50" },
        { title: "Total Dealers", value: dealers.length, icon: Users, sub: "Active suppliers", color: "text-purple-600 bg-purple-50" },
        { title: "Total Products", value: analytics.totalProducts, icon: Package, sub: `${analytics.lowStock} low · ${analytics.outOfStock} out`, color: "text-maroon bg-cream" },
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 animate-pulse h-32" />
            ))
          : cards.map((card, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${card.color}`}>
                    <card.icon size={24} />
                  </div>
                </div>
                <h3 className="text-gray-500 text-sm font-medium">{card.title}</h3>
                <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
                <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
              </div>
            ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Recent Orders */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-serif text-xl text-maroon font-semibold">Recent Orders</h3>
            <Link to="/admin/orders" className="flex items-center gap-1 text-sm text-maroon font-semibold hover:underline">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="text-center text-gray-500 py-12 border-2 border-dashed border-gray-100 rounded-lg">
              No orders yet today.
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
