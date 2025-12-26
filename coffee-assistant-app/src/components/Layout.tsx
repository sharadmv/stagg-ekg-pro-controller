import React from 'react';
import { Coffee, Mic, MicOff, Settings, List, Book, Plus } from 'lucide-react';

type Tab = 'assistant' | 'history' | 'beans' | 'settings';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isConnected: boolean;
  isThinking: boolean;
  onConnectToggle: () => void;
  onAddAction?: () => void;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
}

export function Layout({
  children,
  activeTab,
  onTabChange,
  isConnected,
  isThinking,
  onConnectToggle,
  onAddAction,
}: LayoutProps) {

  return (
    <div className="min-h-screen bg-app-bg text-text-main flex flex-col safe-area-inset overflow-hidden font-sans">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-app-bg/80 backdrop-blur-xl border-b border-app-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-coffee-gold/10 flex items-center justify-center">
             <Coffee className="w-4 h-4 text-coffee-gold" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Coffee Assistant</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-text-muted border border-white/5'}`}>
            {isConnected ? (isThinking ? 'Thinking...' : 'Live') : 'Idle'}
          </div>
          {isConnected && (
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-32 overflow-y-auto overflow-x-hidden">
        <div className="max-w-md mx-auto w-full px-4 pt-6">
            {children}
        </div>
      </main>

      {/* Floating Action Button & Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] pointer-events-none">

        {/* Action Button */}
        <div className="absolute bottom-24 right-6 pointer-events-auto">
            {activeTab === 'assistant' ? (
                 <button
                 onClick={onConnectToggle}
                 className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 ${
                   isConnected ? 'bg-red-500/90 hover:bg-red-500' : 'bg-coffee-gold hover:bg-[#c69363]'
                 }`}
               >
                 {isConnected ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
               </button>
            ) : (
                <button
                onClick={onAddAction}
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 bg-coffee-gold hover:bg-[#c69363]"
              >
                <Plus className="w-6 h-6 text-white" />
              </button>
            )}
        </div>

        {/* Bottom Navigation */}
        <nav className="h-20 glass-panel flex items-center justify-around px-2 pb-safe pointer-events-auto">
          <NavButton
            active={activeTab === 'assistant'}
            onClick={() => onTabChange('assistant')}
            icon={<Mic className="w-5 h-5" />}
            label="Chat"
          />
          <NavButton
            active={activeTab === 'beans'}
            onClick={() => onTabChange('beans')}
            icon={<Book className="w-5 h-5" />}
            label="Beans"
          />
          <NavButton
            active={activeTab === 'history'}
            onClick={() => onTabChange('history')}
            icon={<List className="w-5 h-5" />}
            label="History"
          />
          <NavButton
            active={activeTab === 'settings'}
            onClick={() => onTabChange('settings')}
            icon={<Settings className="w-5 h-5" />}
            label="Setup"
          />
        </nav>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-300 w-16 ${active ? 'text-coffee-gold' : 'text-text-muted hover:text-white'}`}
        >
            <div className={`transition-transform duration-300 ${active ? 'scale-110' : ''}`}>
                {icon}
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-wider transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-60'}`}>
                {label}
            </span>
        </button>
    )
}
