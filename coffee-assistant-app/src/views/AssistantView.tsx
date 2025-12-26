import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BrewDraft from '../components/BrewDraft';
import { Zap } from 'lucide-react';
import type { BrewAttempt, Bean } from '../types/gemini';
import LiveVisualizer from '../components/LiveVisualizer';

interface AssistantViewProps {
  draftBrew: Partial<BrewAttempt> | null;
  draftBean: Partial<Bean> | null;
  beans: Bean[];
  onEditDraft: () => void;
  transcript: string[];
  isThinking: boolean;
  analyserRef: React.RefObject<AnalyserNode | null>;
  isConnected: boolean;
}

export function AssistantView({
  draftBrew,
  draftBean,
  beans,
  onEditDraft,
  transcript,
  isThinking,
  analyserRef,
  isConnected
}: AssistantViewProps) {
  return (
    <div className="relative flex flex-col h-[calc(100vh-180px)] overflow-hidden">
      {/* Live Visualizer - Absolute Background (Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 h-[60vh] pointer-events-none z-0">
         <LiveVisualizer analyserRef={analyserRef} isConnected={isConnected} />
      </div>

      {/* Content Container - Relative z-10 */}
      <div className="relative z-10 flex flex-col h-full pointer-events-none">
        {/* Header - Interactive elements need pointer-events-auto */}
        <div className="flex items-end justify-between mb-4 flex-shrink-0 pointer-events-auto">
           <h2 className="text-2xl font-bold text-white tracking-tight">Assistant</h2>
           <span className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-coffee-gold" />
              Gemini Live
           </span>
        </div>

        {/* Spacer to push content down */}
        <div className="flex-grow" />

        {/* Draft and Transcript Section - Interactive elements need pointer-events-auto */}
        <div className="space-y-4 pb-4 pointer-events-auto">

          {/* Only show BrewDraft if there is active draft data */}
          {(draftBrew || draftBean) && (
              <div className="animate-in fade-in slide-in-from-bottom-5">
                  <BrewDraft
                      draft={draftBrew}
                      draftBean={draftBean}
                      beans={beans}
                      onEdit={draftBrew ? onEditDraft : undefined}
                  />
              </div>
          )}

          {/* Transcript Log - Compact and at the bottom */}
          <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar fade-mask">
            {transcript.length === 0 && !isConnected ? (
               <div className="text-center py-4 opacity-30">
                  <p className="text-xs font-medium uppercase tracking-widest">Tap mic to start</p>
              </div>
            ) : (
               transcript.slice(-2).map((text, i) => (
                  <div key={i} className="px-4 py-2 bg-black/20 rounded-xl border border-white/5">
                     <div className="prose prose-invert prose-p:text-xs prose-headings:text-sm max-w-none text-text-main/80 leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                     </div>
                  </div>
               ))
            )}
             {isThinking && (
               <div className="flex justify-center py-2">
                   <div className="flex gap-1">
                       <div className="w-1 h-1 rounded-full bg-coffee-gold animate-bounce" style={{ animationDelay: '0ms' }} />
                       <div className="w-1 h-1 rounded-full bg-coffee-gold animate-bounce" style={{ animationDelay: '150ms' }} />
                       <div className="w-1 h-1 rounded-full bg-coffee-gold animate-bounce" style={{ animationDelay: '300ms' }} />
                   </div>
               </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
