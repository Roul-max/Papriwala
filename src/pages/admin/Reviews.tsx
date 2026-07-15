import { Star } from "lucide-react";

export default function AdminReviews() {
  const reviews = [
    { id: 1, customer: "Rahul S.", rating: 5, date: "2026-07-14", text: "The best Kaju Katli in town. Have been a customer for 10 years!", order: "#INV-2026-89412" },
    { id: 2, customer: "Priya M.", rating: 4, date: "2026-07-13", text: "Very fast delivery, samosas were still warm.", order: "#INV-2026-89400" },
    { id: 3, customer: "Amit K.", rating: 5, date: "2026-07-10", text: "Love the new digital ordering system. Soan Papdi is amazing.", order: "#INV-2026-89355" }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-serif text-xl text-maroon font-bold">Customer Feedback & Reviews</h3>
          <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-full border border-yellow-100">
            <span className="font-bold text-yellow-700 text-lg">4.8</span>
            <div className="flex text-yellow-500"><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/></div>
            <span className="text-xs text-yellow-700 font-medium">(124 Reviews)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map(rev => (
            <div key={rev.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-gray-800">{rev.customer}</h4>
                  <span className="text-xs text-gray-500">Order: {rev.order} • {rev.date}</span>
                </div>
                <div className="flex text-gold">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill={i < rev.rating ? "currentColor" : "none"} className={i < rev.rating ? "" : "text-gray-300"} />
                  ))}
                </div>
              </div>
              <p className="text-gray-700 text-sm mt-3 italic">"{rev.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
