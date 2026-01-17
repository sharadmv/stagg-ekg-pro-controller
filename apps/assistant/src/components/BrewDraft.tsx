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
      <div className="bg-[#0f172a] rounded-[2.5rem] p-8 border-4 border-sky-500 shadow-[0_0_80px_rgba(14,165,233,0.3)] animate-in fade-in zoom-in duration-500 overflow-hidden relative">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-sky-500/20 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-sky-500/10 blur-[100px] pointer-events-none" />

        <div className="flex items-center justify-between mb-8 relative">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-sky-400 to-sky-600 p-3.5 rounded-[1.25rem] shadow-xl shadow-sky-500/20">
              <Search className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-sky-50 font-black text-2xl uppercase tracking-tighter leading-none mb-1">Bean Discovery</h3>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                </span>
                <p className="text-sky-400/80 text-xs font-black uppercase tracking-[0.2em]">Researching Live...</p>
              </div>
            </div>
          </div>
          <Loader2 className="w-8 h-8 text-sky-500/30 animate-spin" />
        </div>

        <div className="space-y-6 relative">
          <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10">
            <p className="text-[10px] text-sky-500 font-black uppercase tracking-widest mb-2 opacity-60">Roastery & Name</p>
            <p className="text-2xl font-black text-white leading-tight tracking-tight">
              {draftBean.roastery || 'Searching Roasters...'}
            </p>
            <p className="text-lg font-bold text-sky-200/60 mt-0.5">
              {draftBean.name || 'Waiting for name...'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <p className="text-[10px] text-sky-500 font-black uppercase tracking-widest mb-1 opacity-60">Origin</p>
              <p className="text-sm font-black text-sky-100 uppercase tracking-tight">{draftBean.origin || '--'}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <p className="text-[10px] text-sky-500 font-black uppercase tracking-widest mb-1 opacity-60">Process</p>
              <p className="text-sm font-black text-sky-100 uppercase tracking-tight">{draftBean.process || '--'}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 col-span-2">
              <p className="text-[10px] text-sky-500 font-black uppercase tracking-widest mb-1 opacity-60">Varietal / Notes</p>
              <p className="text-sm font-bold text-sky-100/80 leading-relaxed">
                {draftBean.varietal ? `${draftBean.varietal}` : ''}
                {draftBean.notes ? (draftBean.varietal ? ` • ${draftBean.notes}` : draftBean.notes) : (!draftBean.varietal && '--')}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-3 px-4 py-3 bg-sky-500/10 border border-sky-500/20 rounded-2xl">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <p className="text-xs font-bold text-sky-300 italic">Gemini is searching for the roast profile and flavor notes...</p>
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

        {(draft.grinder || draft.grinderSetting) && (
          <div className="bg-black/30 rounded-2xl p-5 border border-amber-900/30 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-600">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 17a1 1 0 0 1 2 0c.5 4 1.5 4.5 3 4.5s2.5-.5 3-4.5a1 1 0 0 1 2 0c0 4.5-1.5 6-5 6s-5-1.5-5-6Z" /><path d="M18 5v5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2Z" /><path d="M15 17c0-3-3-3-3-3s-3 0-3 3" /><path d="M12 12v2" /></svg>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest">Grinder</p>
              <p className="text-xl font-black text-white">
                {draft.grinder || '...'} <span className="text-amber-600/60 font-medium">({draft.grinderSetting || '--'})</span>
              </p>
            </div>
            {draft.grinder && draft.grinderSetting && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
          </div>
        )}

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
