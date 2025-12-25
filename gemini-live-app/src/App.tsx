import { useState, useEffect, useCallback } from 'react';
import { Coffee, Mic, MicOff, Settings, MessageSquare, History, List, Book, Trash2 } from 'lucide-react';
import { useGeminiLive } from './hooks/useGeminiLive';
import LiveVisualizer from './components/LiveVisualizer';
import BrewHistory from './components/BrewHistory';
import BrewDraft from './components/BrewDraft';
import type { BrewAttempt, Bean } from './types/gemini';

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'];
type Tab = 'assistant' | 'history' | 'beans' | 'settings';

function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [voice, setVoice] = useState(() => localStorage.getItem('gemini_voice') || 'Puck');
  const [brewLogs, setBrewLogs] = useState<BrewAttempt[]>([]);
  const [beans, setBeans] = useState<Bean[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('assistant');

  const loadData = useCallback(() => {
    setBrewLogs(JSON.parse(localStorage.getItem('brew_logs') || '[]'));
    setBeans(JSON.parse(localStorage.getItem('coffee_beans') || '[]'));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  
  useEffect(() => { 
    localStorage.setItem('gemini_api_key', apiKey); 
  }, [apiKey]);

  useEffect(() => { 
    localStorage.setItem('gemini_voice', voice); 
  }, [voice]);

  const { isConnected, isThinking, transcript, connect, disconnect, analyserRef, draftBrew, draftBean } = useGeminiLive(loadData);

  const handleDeleteLog = (id: string) => {
    const updated = brewLogs.filter(log => log.id !== id);
    localStorage.setItem('brew_logs', JSON.stringify(updated));
    setBrewLogs(updated);
  };

  const handleDeleteBean = (id: string) => {
    const updated = beans.filter(bean => bean.id !== id);
    localStorage.setItem('coffee_beans', JSON.stringify(updated));
    setBeans(updated);
  };

  const handleToggleConnect = () => {
    if (isConnected) disconnect();
    else {
      if (!apiKey) {
        alert("Enter API Key in Setup");
        setActiveTab('settings');
        return;
      }
      connect(apiKey, voice);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1310] text-[#f5f0ed] flex flex-col safe-area-inset overflow-hidden">
      <header className="p-4 border-b border-amber-900/10 flex items-center justify-between bg-[#1a1310] sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Coffee className="w-6 h-6 text-amber-600" />
          <h1 className="text-xl font-bold text-amber-500 tracking-tight">Coffee Assistant</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-800 text-stone-500'}`}>
            {isConnected ? (isThinking ? 'Thinking...' : 'Syncing') : 'Idle'}
          </div>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]' : 'bg-stone-600'} ${isThinking ? 'animate-bounce' : ''}`} />
        </div>
      </header>

      <main className="flex-1 pb-24 overflow-y-auto">
        {activeTab === 'assistant' && (
          <div className="p-4 space-y-8 max-w-2xl mx-auto">
            <BrewDraft draft={draftBrew} draftBean={draftBean} beans={beans} />
            <div className="space-y-3">
              {transcript.length === 0 ? (
                <div className="text-center py-10 text-stone-700/50">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-10" />
                  <p className="text-sm font-medium">Ready to brew</p>
                </div>
              ) : (
                transcript.slice(-3).map((text, i) => (
                  <div key={i} className="bg-[#2a1f1b]/30 p-4 rounded-2xl border border-amber-900/10 text-sm animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-amber-100 leading-relaxed opacity-80">{text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'beans' && (
          <div className="p-4 max-w-2xl mx-auto space-y-4">
            <h2 className="text-xl font-black text-amber-100 flex items-center gap-2 mb-6 uppercase tracking-tighter">
              <Book className="w-6 h-6 text-amber-600" />
              Bean Library
            </h2>
            <div className="grid gap-4">
              {beans.length === 0 && (
                <div className="text-center py-20 bg-[#2a1f1b] rounded-3xl border border-dashed border-amber-900/20 text-stone-600">
                  <Book className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p className="font-bold uppercase tracking-widest text-xs">No beans saved yet</p>
                </div>
              )}
              {beans.map(bean => (
                <div key={bean.id} className="bg-[#2a1f1b] p-5 rounded-3xl border border-amber-900/20 relative overflow-hidden">
                  <button 
                    onClick={() => {
                      if(window.confirm("Delete this bean?")) handleDeleteBean(bean.id);
                    }}
                    className="absolute top-4 right-4 p-3 text-stone-500 hover:text-red-400 active:scale-90 transition-all bg-black/20 rounded-xl border border-white/5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex flex-col gap-1 mb-4">
                    <p className="text-amber-600 text-[10px] font-black uppercase tracking-widest">{bean.roastery}</p>
                    <h3 className="font-black text-xl text-amber-50 leading-tight">{bean.name}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {bean.origin && (
                      <div className="bg-black/20 rounded-xl p-2 border border-white/5">
                        <p className="text-[8px] text-stone-500 font-black uppercase">Origin</p>
                        <p className="text-xs text-amber-100 font-bold">{bean.origin}</p>
                      </div>
                    )}
                    {bean.process && (
                      <div className="bg-black/20 rounded-xl p-2 border border-white/5">
                        <p className="text-[8px] text-stone-500 font-black uppercase">Process</p>
                        <p className="text-xs text-amber-100 font-bold">{bean.process}</p>
                      </div>
                    )}
                    {bean.varietal && (
                      <div className="bg-black/20 rounded-xl p-2 border border-white/5">
                        <p className="text-[8px] text-stone-500 font-black uppercase">Varietal</p>
                        <p className="text-xs text-amber-100 font-bold">{bean.varietal}</p>
                      </div>
                    )}
                    {bean.roastLevel && (
                      <div className="bg-black/20 rounded-xl p-2 border border-white/5">
                        <p className="text-[8px] text-stone-500 font-black uppercase">Roast</p>
                        <p className="text-xs text-amber-100 font-bold">{bean.roastLevel}</p>
                      </div>
                    )}
                  </div>

                  {bean.notes && (
                    <div className="bg-amber-900/10 rounded-2xl p-3 border border-amber-900/20">
                      <p className="text-[8px] text-amber-600 font-black uppercase mb-1">Tasting Notes</p>
                      <p className="text-xs text-amber-200/80 leading-relaxed italic">{bean.notes}</p>
                    </div>
                  )}
                  
                  {bean.url && (
                    <a 
                      href={bean.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="mt-4 inline-flex items-center gap-1.5 text-amber-600 hover:text-amber-500 transition-colors text-[10px] font-black uppercase"
                    >
                      View Source
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-4 max-w-2xl mx-auto space-y-4">
            <h2 className="text-xl font-black text-amber-100 flex items-center gap-2 mb-6 uppercase tracking-tighter">
              <History className="w-6 h-6 text-amber-600" />
              Brew Records
            </h2>
            <BrewHistory logs={brewLogs} beans={beans} onDelete={handleDeleteLog} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-4 max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-black text-amber-100 flex items-center gap-2 mb-6 uppercase tracking-tighter">
              <Settings className="w-6 h-6 text-amber-600" />
              Setup
            </h2>
            <div className="bg-[#2a1f1b] p-6 rounded-3xl border border-amber-900/30 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3 px-1">Gemini API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste Key Here"
                  className="w-full bg-[#1a1310] border border-amber-900/50 rounded-xl px-4 py-4 text-amber-50 outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3 px-1">Assistant Voice</label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full bg-[#1a1310] border border-amber-900/50 rounded-xl px-4 py-4 text-amber-50 outline-none focus:ring-2 focus:ring-amber-500 appearance-none shadow-inner"
                >
                  {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-[60]">
        {isConnected && (
          <div className="absolute bottom-40 right-[-8px] w-32 h-32 pointer-events-none animate-in fade-in zoom-in slide-in-from-bottom-12 duration-700">
             <div className="w-full h-full drop-shadow-[0_0_20px_rgba(217,119,6,0.4)]">
               <LiveVisualizer analyserRef={analyserRef} isConnected={isConnected} />
             </div>
          </div>
        )}
        <div className="absolute bottom-24 right-6">
          <button
            onClick={handleToggleConnect}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all active:scale-90 relative overflow-hidden ${
              isConnected ? 'bg-red-600 animate-pulse' : 'bg-amber-600 hover:bg-amber-500'
            }`}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
            {isConnected ? <MicOff className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-white" />}
          </button>
        </div>
        <nav className="h-20 bg-[#1a1310]/95 backdrop-blur-xl border-t border-amber-900/10 flex items-center justify-around px-4 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
          <button onClick={() => setActiveTab('assistant')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'assistant' ? 'text-amber-500 scale-110' : 'text-stone-600'}`}>
            <Mic className="w-5 h-5" /><span className="text-[9px] font-black uppercase">Chat</span>
          </button>
          <button onClick={() => setActiveTab('beans')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'beans' ? 'text-amber-500 scale-110' : 'text-stone-600'}`}>
            <Book className="w-5 h-5" /><span className="text-[9px] font-black uppercase">Beans</span>
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? 'text-amber-500 scale-110' : 'text-stone-600'}`}>
            <List className="w-5 h-5" /><span className="text-[9px] font-black uppercase">History</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'settings' ? 'text-amber-500 scale-110' : 'text-stone-600'}`}>
            <Settings className="w-5 h-5" /><span className="text-[9px] font-black uppercase">Setup</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

export default App;
