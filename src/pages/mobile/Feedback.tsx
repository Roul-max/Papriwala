import { ChevronLeft, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Feedback() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-full bg-cream-light pb-24">
      <div className="bg-white p-4 flex items-center border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="mr-4 text-maroon">
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-serif text-xl text-gold font-bold uppercase tracking-wider">FEEDBACK</h2>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1 mb-2 text-gold">
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
          </div>
          <p className="text-gray-700 italic mb-2">"The best Kaju Katli in town. Have been a customer for 10 years!"</p>
          <span className="text-xs text-gray-500 font-medium">- Rahul S.</span>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1 mb-2 text-gold">
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} className="text-gray-300" />
          </div>
          <p className="text-gray-700 italic mb-2">"Very fast delivery, samosas were still warm."</p>
          <span className="text-xs text-gray-500 font-medium">- Priya M.</span>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1 mb-2 text-gold">
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
          </div>
          <p className="text-gray-700 italic mb-2">"Love the new digital ordering system. Soan Papdi is amazing."</p>
          <span className="text-xs text-gray-500 font-medium">- Amit K.</span>
        </div>
      </div>
      
      <div className="p-4 mt-4">
        <button className="w-full bg-maroon text-white font-bold py-3 rounded-xl shadow-md hover:bg-maroon-dark transition-colors">
          Write a Review
        </button>
      </div>
    </div>
  );
}
