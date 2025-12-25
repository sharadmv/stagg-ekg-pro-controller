import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Settings, Key, Volume2 } from 'lucide-react';

const VOICES = [
  'Achernar', 'Algieba', 'Aoede', 'Autonoe', 'Callirrhoe', 'Charon',
  'Despina', 'Enceladus', 'Fenrir', 'Gacrux', 'Iapetus', 'Kore',
  'Leda', 'Orus', 'Puck', 'Umbriel', 'Vindemiatrix', 'Zephyr'
].sort();

interface SettingsViewProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  voice: string;
  setVoice: (voice: string) => void;
}

export function SettingsView({ apiKey, setApiKey, voice, setVoice }: SettingsViewProps) {
  return (
    <div className="space-y-6">
       <div className="flex items-end justify-between">
         <h2 className="text-2xl font-bold text-white tracking-tight">Setup</h2>
      </div>

      <Card className="space-y-6">
         <div className="flex items-center gap-3 mb-4 pb-4 border-b border-app-border">
             <div className="w-10 h-10 rounded-full bg-coffee-gold/10 flex items-center justify-center">
                 <Settings className="w-5 h-5 text-coffee-gold" />
             </div>
             <div>
                 <h3 className="font-bold text-white">Configuration</h3>
                 <p className="text-xs text-text-muted">Manage your API connections</p>
             </div>
         </div>

        <div>
           <Input
              label="Gemini API Key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste Key Here"
            />
             <p className="mt-2 text-[10px] text-text-muted flex items-center gap-1">
                <Key className="w-3 h-3" />
                Key is stored locally on your device.
            </p>
        </div>

        <div>
            <Select
              label="Assistant Voice"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              options={VOICES.map(v => ({ value: v, label: v }))}
            />
            <p className="mt-2 text-[10px] text-text-muted flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                Select the voice for speech responses.
            </p>
        </div>
      </Card>

       <div className="text-center pt-10">
            <p className="text-xs text-text-muted font-bold opacity-30 uppercase tracking-widest">Coffee Assistant v1.0</p>
       </div>
    </div>
  );
}
