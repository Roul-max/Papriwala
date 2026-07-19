import { useState, useEffect } from "react";
import { ChevronLeft, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/apiFetch";

export default function Feedback() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<any[]>([]);
  const [form, setForm] = useState({ author: "", rating: 5, text: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fetchReviews = () =>
    apiFetch("/api/reviews").then(r => r.json()).then(d => setReviews(Array.isArray(d) ? d : []));

  useEffect(() => { fetchReviews(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.author.trim() || !form.text.trim()) return;
    setSubmitting(true);
    await apiFetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    setSubmitted(true);
    setForm({ author: "", rating: 5, text: "" });
    fetchReviews();
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="flex flex-col min-h-full bg-cream-light pb-24">
      <div className="bg-white p-4 flex items-center border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="mr-4 text-maroon">
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-serif text-xl text-gold font-bold uppercase tracking-wider">FEEDBACK</h2>
      </div>

      <div className="p-4 space-y-4">
        {reviews.length === 0 && (
          <p className="text-center text-gray-400 py-8 italic">No reviews yet. Be the first!</p>
        )}
        {reviews.map((r: any) => (
          <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-1 mb-2 text-gold">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} fill={i < r.rating ? "currentColor" : "none"} className={i < r.rating ? "text-gold" : "text-gray-300"} />
              ))}
            </div>
            <p className="text-gray-700 italic mb-2">"{r.text}"</p>
            <span className="text-xs text-gray-500 font-medium">- {r.author}</span>
          </div>
        ))}
      </div>

      <div className="p-4 mt-2">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-serif text-maroon font-bold text-lg mb-4">Write a Review</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text" placeholder="Your name" required value={form.author}
              onChange={e => setForm(p => ({ ...p, author: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-maroon"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Rating:</span>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setForm(p => ({ ...p, rating: n }))}>
                  <Star size={22} fill={n <= form.rating ? "currentColor" : "none"} className={n <= form.rating ? "text-gold" : "text-gray-300"} />
                </button>
              ))}
            </div>
            <textarea
              placeholder="Share your experience..." required value={form.text} rows={3}
              onChange={e => setForm(p => ({ ...p, text: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-maroon resize-none"
            />
            {submitted && <p className="text-green-600 text-sm font-semibold">✓ Review submitted!</p>}
            <button type="submit" disabled={submitting}
              className="w-full bg-maroon text-white font-bold py-3 rounded-xl shadow-md hover:bg-maroon-light transition-colors disabled:opacity-50">
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
