import React from 'react';
import { Loader2, CheckCircle2, Coffee, Sparkles, Search, Pencil } from 'lucide-react';
import type { PartialBrewAttempt, Bean, PartialBean } from '../types/gemini';

interface BrewDraftProps {
  draft: PartialBrewAttempt | null;
  draftBean: PartialBean | null;
  beans: Bean[];
  onEdit?: () => void;
}

const BrewDraft: React.FC<BrewDraftProps> = ({ draft, draftBean, beans, onEdit }) => {
  // If we are currently researching a bean, show the Bean Research view
  if (draftBean) {
    return (
      <div className="bg-[#1e293b] rounded-3xl p-6 border-2 border-sky-500 shadow-[0_0_40px_rgba(14,165,233,0.15)] animate-in fade-in zoom-in duration-500">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-sky-500 p-2.5 rounded-2xl shadow-lg shadow-sky-500/20">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-sky-100 font-black text-lg uppercase tracking-tight leading-tight">Bean Research</h3>
              <p className="text-sky-400 text-[10px] font-black uppercase tracking-widest">Gathering details...</p>
            </div>
          </div>
          <Loader2 className="w-6 h-6 text-sky-500/50 animate-spin" />
        </div>

        <div className="space-y-4">
          <div className="bg-black/30 rounded-2xl p-5 border border-sky-900/30">
            <p className="text-[10px] text-sky-600 font-black uppercase tracking-widest mb-1">Roastery & Name</p>
            <p className="text-lg font-black text-white">{draftBean.roastery || 'Searching...'} / {draftBean.name || '...'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/30 rounded-xl p-3 border border-sky-900/30">
              <p className="text-[8px] text-sky-600 font-black uppercase">Origin</p>
              <p className="text-xs font-bold text-sky-100">{draftBean.origin || '--'}</p>
            </div>
            <div className="bg-black/30 rounded-xl p-3 border border-sky-900/30">
              <p className="text-[8px] text-sky-600 font-black uppercase">Process</p>
              <p className="text-xs font-bold text-sky-100">{draftBean.process || '--'}</p>
            </div>
            <div className="bg-black/30 rounded-xl p-3 border border-sky-900/30 col-span-2">
              <p className="text-[8px] text-sky-600 font-black uppercase">Varietal</p>
              <p className="text-xs font-bold text-sky-100">{draftBean.varietal || '--'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, show the standard Brew Log view
  if (!draft) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-amber-900/20 border-2 border-dashed border-amber-900/10 rounded-3xl h-64">
        <Coffee className="w-12 h-12 mb-4 opacity-10" />
        <p className="text-sm font-bold uppercase tracking-widest text-center leading-tight">Ready for your next brew session</p>
      </div>
    );
  }

  const bean = draft.beanId ? beans.find(b => b.id === draft.beanId) : null;

  return (
    <div className="bg-[#2a1f1b] rounded-3xl p-6 border-2 border-amber-600 shadow-[0_0_40px_rgba(217,119,6,0.15)] animate-in fade-in zoom-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-amber-600 p-2.5 rounded-2xl shadow-lg shadow-amber-600/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-amber-100 font-black text-lg uppercase tracking-tight leading-tight">Live Brew Log</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-emerald-500/80 text-[10px] font-black uppercase tracking-widest">Assistant Syncing...</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 bg-black/20 hover:bg-black/40 text-amber-600 hover:text-amber-400 rounded-xl transition-colors border border-amber-900/10"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          <Loader2 className="w-6 h-6 text-amber-600/50 animate-spin" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-black/30 rounded-2xl p-5 border border-amber-900/30 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${draft.brewer ? 'bg-amber-600' : 'bg-white/5'}`}>
            <Coffee className={`w-6 h-6 ${draft.brewer ? 'text-white' : 'text-white/20'}`} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest">Brewer</p>
            <p className={`text-xl font-black ${draft.brewer ? 'text-white' : 'text-stone-700 italic'}`}>
              {draft.brewer || 'Waiting...'}
            </p>
          </div>
          {draft.brewer && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
        </div>

        <div className="bg-black/30 rounded-2xl p-5 border border-amber-900/30">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest">Selected Bean</p>
            {bean && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </div>
          <p className={`text-lg font-bold leading-tight ${bean ? 'text-amber-100' : 'text-stone-700'}`}>
            {bean?.name || 'Waiting to select bean...'}
          </p>
          <div className="flex justify-between items-end mt-1">
            <p className="text-sm text-stone-500 font-bold">{bean?.roastery || ''}</p>
            {bean?.varietal && <p className="text-[10px] text-amber-600/60 font-black uppercase">{bean.varietal}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/30 rounded-2xl p-4 border border-amber-900/30 flex flex-col items-center text-center">
            <p className="text-[9px] text-amber-600 font-black uppercase tracking-widest mb-1">Ratio</p>
            <p className={`text-lg font-black ${draft.ratio ? 'text-white' : 'text-stone-800'}`}>{draft.ratio || '--'}</p>
          </div>
          <div className="bg-black/30 rounded-2xl p-4 border border-amber-900/30 flex flex-col items-center text-center">
            <p className="text-[9px] text-amber-600 font-black uppercase tracking-widest mb-1">Temp</p>
            <p className={`text-lg font-black ${draft.waterTemp ? 'text-white' : 'text-stone-800'}`}>{draft.waterTemp ? `${draft.waterTemp}°C` : '--'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrewDraft;
