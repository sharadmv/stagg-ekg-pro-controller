import React from 'react';
import { Star, StarHalf, Thermometer, Droplets, BookOpen, Trash2, Gauge, Pencil } from 'lucide-react';
import type { BrewAttempt, Bean } from '../types/gemini';

interface BrewHistoryProps {
  logs: BrewAttempt[];
  beans: Bean[];
  onDelete: (id: string) => void;
  onEdit: (log: BrewAttempt) => void;
}

const BrewHistory: React.FC<BrewHistoryProps> = ({ logs, beans, onDelete, onEdit }) => {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-amber-900/30 border-2 border-dashed border-amber-900/20 rounded-2xl">
        <BookOpen className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-lg font-medium text-center">No brew records found</p>
      </div>
    );
  }

  const getBean = (id: string) => beans.find(b => b.id === id);

  return (
    <div className="grid grid-cols-1 gap-4">
      {logs.map((log) => {
        const bean = getBean(log.beanId);
        return (
          <div key={log.id} className="bg-[#2a1f1b] border border-amber-900/20 rounded-3xl p-5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={() => onEdit(log)}
                className="p-3 text-stone-400 hover:text-amber-400 active:scale-90 transition-all bg-black/20 rounded-xl border border-white/5"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (window.confirm("Delete this brew record?")) onDelete(log.id);
                }}
                className="p-3 text-stone-400 hover:text-red-400 active:scale-90 transition-all bg-black/20 rounded-xl border border-white/5"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-between items-start mb-4 pr-24">
              <div>
                <p className="text-amber-600 text-[10px] font-black uppercase tracking-widest mb-1">{bean?.roastery || 'Unknown Roastery'}</p>
                <h3 className="text-amber-50 font-black text-xl leading-tight">{bean?.name || 'Unknown Bean'}</h3>
              </div>
            </div>

            <div className="flex gap-1 mb-5">
              {[1, 2, 3, 4, 5].map((i) => {
                if (log.enjoyment >= i) {
                  return <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />;
                } else if (log.enjoyment >= i - 0.5) {
                  return <StarHalf key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />;
                } else {
                  return <Star key={i} className="w-4 h-4 text-stone-800" />;
                }
              })}
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-900/20 rounded-md"><Droplets className="w-3.5 h-3.5 text-amber-500" /></div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Ratio</p>
                  <p className="text-xs text-amber-100 font-medium">{log.ratio}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-900/20 rounded-md"><Thermometer className="w-3.5 h-3.5 text-amber-500" /></div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Temp</p>
                  <p className="text-xs text-amber-100 font-medium">{log.waterTemp}°C</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-900/20 rounded-md"><BookOpen className="w-3.5 h-3.5 text-amber-500" /></div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Method</p>
                  <p className="text-xs text-amber-100 font-medium line-clamp-1">{log.technique}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-900/20 rounded-md">
                   <svg className="w-3.5 h-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 17a1 1 0 0 1 2 0c.5 4 1.5 4.5 3 4.5s2.5-.5 3-4.5a1 1 0 0 1 2 0c0 4.5-1.5 6-5 6s-5-1.5-5-6Z"/><path d="M18 5v5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2Z"/><path d="M15 17c0-3-3-3-3-3s-3 0-3 3"/><path d="M12 12v2"/></svg>
                </div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Grinder</p>
                  <p className="text-xs text-amber-100 font-medium line-clamp-1">{log.grinder || '--'} ({log.grinderSetting || '--'})</p>
                </div>
              </div>

              {log.extraction && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-900/20 rounded-md"><Gauge className="w-3.5 h-3.5 text-amber-500" /></div>
                  <div>
                    <p className="text-[10px] text-stone-500 uppercase font-bold">Extr.</p>
                    <p className="text-xs text-amber-100 font-medium">{log.extraction}%</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-amber-900/10 flex justify-between items-center text-[10px]">
              <span className="bg-stone-800 text-amber-400/80 px-2 py-0.5 rounded font-bold uppercase">{log.brewer}</span>
              <span className="text-stone-600 font-medium">{new Date(log.date).toLocaleDateString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BrewHistory;