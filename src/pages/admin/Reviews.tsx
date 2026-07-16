import { useEffect, useState } from "react";
import { Star, Trash2, CheckCircle2 } from "lucide-react";
import { apiFetch } from "../../lib/apiFetch";

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);

  const fetch_ = () =>
    apiFetch("/api/reviews").then(r => r.json()).then(d => setReviews(Array.isArray(d) ? d : []));

  useEffect(() => { fetch_(); }, []);

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/reviews/${id}`, { method: "DELETE" });
    fetch_();
  };

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-serif text-xl text-maroon font-bold">Customer Feedback & Reviews</h3>
          <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-full border border-yellow-100">
            <span className="font-bold text-yellow-700 text-lg">{avgRating}</span>
            <div className="flex text-yellow-500">
              {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <span className="text-xs text-yellow-700 font-medium">({reviews.length} Reviews)</span>
          </div>
        </div>

        {reviews.length === 0 ? (
          <p className="text-center text-gray-400 py-12 italic">No reviews yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map(rev => (
              <div key={rev.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative">
                <button
                  onClick={() => handleDelete(rev.id)}
                  className="absolute top-3 right-3 text-red-300 hover:text-red-600 transition-colors"
                  title="Delete review"
                >
                  <Trash2 size={15} />
                </button>
                <div className="flex justify-between items-start mb-2 pr-6">
                  <div>
                    <h4 className="font-bold text-gray-800">{rev.author}</h4>
                    <span className="text-xs text-gray-500">{new Date(rev.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex text-gold">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill={i < rev.rating ? "currentColor" : "none"} className={i < rev.rating ? "" : "text-gray-300"} />
                    ))}
                  </div>
                </div>
                <p className="text-gray-700 text-sm mt-2 italic">"{rev.text}"</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
