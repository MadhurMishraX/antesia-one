import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Megaphone, ChevronDown } from 'lucide-react';

export default function BroadcastHistory() {
  const navigate = useNavigate();
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBroadcasts() {
      const { data } = await supabase
        .from('broadcasts')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });
      
      setBroadcasts(data || []);
      setLoading(false);
    }

    fetchBroadcasts();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="p-6 flex items-center gap-4 bg-white shadow-sm sticky top-0 z-30">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-muted hover:text-primary transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-bold">Broadcast History</h2>
      </div>

      <div className="p-6 space-y-4">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : broadcasts.length > 0 ? (
          broadcasts.map((b) => (
            <motion.div 
              key={b.id}
              layout
              onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
              className="bg-white rounded-card shadow-sm border border-gray-100 overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">{b.profiles?.full_name}</p>
                    {b.is_urgent && (
                      <span className="bg-danger text-[8px] font-bold text-white px-2 py-0.5 rounded-pill">
                        🚨 URGENT
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-text-muted font-medium">
                    {new Date(b.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-start justify-between gap-4">
                  <p className={`text-sm leading-relaxed ${expandedId === b.id ? '' : 'truncate'}`}>
                    {b.message_text}
                  </p>
                  <ChevronDown 
                    size={18} 
                    className={`text-text-muted transition-transform shrink-0 ${expandedId === b.id ? 'rotate-180' : ''}`} 
                  />
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-text-muted">
              <Megaphone size={24} />
            </div>
            <p className="text-text-muted text-sm font-medium">No broadcasts yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
