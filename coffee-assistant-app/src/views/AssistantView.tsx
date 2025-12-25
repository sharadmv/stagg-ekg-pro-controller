import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BrewDraft from '../components/BrewDraft';
import { Card } from '../components/ui/Card';
import { MessageSquare, Zap } from 'lucide-react';
import type { BrewAttempt, Bean } from '../types/gemini';

interface AssistantViewProps {
  draftBrew: Partial<BrewAttempt> | null;
  draftBean: Partial<Bean> | null;
  beans: Bean[];
  onEditDraft: () => void;
  transcript: string[];
  isThinking: boolean;
}

export function AssistantView({ draftBrew, draftBean, beans, onEditDraft, transcript, isThinking }: AssistantViewProps) {
  return (
    <div className="space-y-6 pb-20">
       <div className="flex items-end justify-between">
         <h2 className="text-2xl font-bold text-white tracking-tight">Assistant</h2>
         <span className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-coffee-gold" />
            Gemini Live
         </span>
      </div>

      <BrewDraft
        draft={draftBrew}
        draftBean={draftBean}
        beans={beans}
        onEdit={draftBrew ? onEditDraft : undefined}
      />

      <div className="space-y-3">
        {transcript.length === 0 ? (
          <div className="text-center py-10 opacity-30">
            <MessageSquare className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-medium">Ready to brew. Tap mic to start.</p>
          </div>
        ) : (
          transcript.slice(-3).map((text, i) => (
            <Card key={i} className="bg-app-card/50 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 border-white/5">
              <div className="prose prose-invert prose-p:text-sm prose-headings:text-base max-w-none text-text-main/90">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
              </div>
            </Card>
          ))
        )}
        {isThinking && (
             <div className="flex justify-center py-4">
                 <div className="flex gap-1">
                     <div className="w-1.5 h-1.5 rounded-full bg-coffee-gold animate-bounce" style={{ animationDelay: '0ms' }} />
                     <div className="w-1.5 h-1.5 rounded-full bg-coffee-gold animate-bounce" style={{ animationDelay: '150ms' }} />
                     <div className="w-1.5 h-1.5 rounded-full bg-coffee-gold animate-bounce" style={{ animationDelay: '300ms' }} />
                 </div>
             </div>
        )}
      </div>
    </div>
  );
}
