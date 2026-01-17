import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Settings, Key, Volume2, Database, ShieldCheck, Upload, Download, RefreshCw } from 'lucide-react';

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
  // Google Sheets Props
  googleClientId: string;
  setGoogleClientId: (id: string) => void;
  spreadsheetId: string;
  setSpreadsheetId: (id: string) => void;
  onAuthenticate: () => void;
  onBackup: () => void;
  onLoad: () => void;
  isGoogleAuthenticated: boolean;
  isSyncing: boolean;
  syncError: string | null;
}

export function SettingsView({
  apiKey, setApiKey,
  voice, setVoice,
  googleClientId, setGoogleClientId,
  spreadsheetId, setSpreadsheetId,
  onAuthenticate, onBackup, onLoad,
  isGoogleAuthenticated, isSyncing, syncError
}: SettingsViewProps) {
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

      <Card className="space-y-6">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-app-border">
          <div className="w-10 h-10 rounded-full bg-coffee-gold/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-coffee-gold" />
          </div>
          <div>
            <h3 className="font-bold text-white">Google Sheets Sync</h3>
            <p className="text-xs text-text-muted">Backup and restore your data</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Google Client ID"
            value={googleClientId}
            onChange={(e) => setGoogleClientId(e.target.value)}
            placeholder="000000000000-xxxx.apps.googleusercontent.com"
          />
          <Input
            label="Spreadsheet ID"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            placeholder="The ID of your Google Sheet"
          />

          <div className="pt-2 flex flex-col gap-3">
            {!isGoogleAuthenticated ? (
              <Button
                onClick={onAuthenticate}
                className="w-full"
                icon={<ShieldCheck className="w-4 h-4" />}
              >
                Connect Google Account
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  onClick={onBackup}
                  disabled={isSyncing}
                  icon={isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                >
                  Backup
                </Button>
                <Button
                  variant="secondary"
                  onClick={onLoad}
                  disabled={isSyncing}
                  icon={isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                >
                  Restore
                </Button>
              </div>
            )}
          </div>

          {syncError && (
            <p className="text-xs text-red-400 font-medium">
              Error: {syncError}
            </p>
          )}

          {isGoogleAuthenticated && !syncError && (
            <p className="text-[10px] text-green-400 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3 h-3" />
              Connected to Google
            </p>
          )}
        </div>
      </Card>

      <div className="text-center pt-10">
        <p className="text-xs text-text-muted font-bold opacity-30 uppercase tracking-widest">Coffee Assistant v1.0</p>
      </div>
    </div>
  );
}
