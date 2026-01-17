import { useState, useEffect, useCallback } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { Layout } from './components/Layout';
import { AssistantView } from './views/AssistantView';
import { BeansView } from './views/BeansView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { useGoogleSheets } from './hooks/useGoogleSheets';
import type { BrewAttempt, Bean } from './types/gemini';

type Tab = 'assistant' | 'history' | 'beans' | 'settings';

function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [voice, setVoice] = useState(() => localStorage.getItem('gemini_voice') || 'Puck');
  const [brewLogs, setBrewLogs] = useState<BrewAttempt[]>([]);
  const [beans, setBeans] = useState<Bean[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('assistant');
  const [editingBean, setEditingBean] = useState<Bean | null>(null);
  const [editingHistoryLog, setEditingHistoryLog] = useState<BrewAttempt | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  // Google Sheets state
  const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('google_client_id') || '');
  const [spreadsheetId, setSpreadsheetId] = useState(() => localStorage.getItem('google_spreadsheet_id') || '');

  const { authenticate, backup, load, accessToken, isLoading: isSyncing, error: syncError } = useGoogleSheets();

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

  useEffect(() => {
    localStorage.setItem('google_client_id', googleClientId);
  }, [googleClientId]);

  useEffect(() => {
    localStorage.setItem('google_spreadsheet_id', spreadsheetId);
  }, [spreadsheetId]);

  const { isConnected, isThinking, transcript, connect, disconnect, analyserRef, draftBrew, draftBean, updateBrewDraft } = useGeminiLive(loadData);

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

  const handleSaveBean = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBean) return;

    let updatedBeans;
    if (beans.some(b => b.id === editingBean.id)) {
      updatedBeans = beans.map(b => b.id === editingBean.id ? editingBean : b);
    } else {
      updatedBeans = [...beans, editingBean];
    }

    localStorage.setItem('coffee_beans', JSON.stringify(updatedBeans));
    setBeans(updatedBeans);
    setEditingBean(null);
  };

  const handleSaveDraft = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates = {
      brewer: formData.get('brewer') as string,
      grinder: formData.get('grinder') as string,
      grinderSetting: formData.get('grinderSetting') as string,
      ratio: formData.get('ratio') as string,
      waterTemp: Number(formData.get('waterTemp')) || undefined,
      beanId: formData.get('beanId') as string,
      technique: formData.get('technique') as string,
      extraction: Number(formData.get('extraction')) || undefined,
      enjoyment: Number(formData.get('enjoyment')) || undefined,
    };
    updateBrewDraft(updates);
    setIsEditingDraft(false);
  };

  const handleSaveHistoryLog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingHistoryLog) return;
    const formData = new FormData(e.currentTarget);
    const updatedLog: BrewAttempt = {
      ...editingHistoryLog,
      brewer: formData.get('brewer') as string,
      beanId: formData.get('beanId') as string,
      grinder: formData.get('grinder') as string,
      grinderSetting: formData.get('grinderSetting') as string,
      ratio: formData.get('ratio') as string,
      waterTemp: Number(formData.get('waterTemp')) || 0,
      technique: formData.get('technique') as string,
      extraction: Number(formData.get('extraction')) || undefined,
      enjoyment: Number(formData.get('enjoyment')) || 0,
      date: formData.get('date') as string,
    };

    let updatedLogs;
    if (brewLogs.some(log => log.id === editingHistoryLog.id)) {
      updatedLogs = brewLogs.map(log => log.id === editingHistoryLog.id ? updatedLog : log);
    } else {
      updatedLogs = [...brewLogs, updatedLog];
    }

    localStorage.setItem('brew_logs', JSON.stringify(updatedLogs));
    setBrewLogs(updatedLogs);
    setEditingHistoryLog(null);
  };

  const handleAddNewBean = () => {
    setEditingBean({
      id: crypto.randomUUID(),
      roastery: '',
      name: '',
      process: '',
      origin: '',
      varietal: '',
      roastLevel: '',
      notes: '',
      url: '',
      roastDate: ''
    });
  };

  const handleAddNewLog = () => {
    setEditingHistoryLog({
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      brewer: '',
      beanId: '',
      grinder: '',
      grinderSetting: '',
      ratio: '',
      waterTemp: 0,
      technique: '',
      enjoyment: 0
    });
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

  const handleGoogleAuthenticate = () => {
    authenticate(googleClientId);
  };

  const handleGoogleBackup = async () => {
    if (!spreadsheetId) {
      alert("Enter Spreadsheet ID in Settings");
      return;
    }
    const success = await backup(spreadsheetId, brewLogs, beans);
    if (success) {
      alert("Backup successful!");
    }
  };

  const handleGoogleRestore = async () => {
    if (!spreadsheetId) {
      alert("Enter Spreadsheet ID in Settings");
      return;
    }
    if (!window.confirm("This will overwrite your local data. Continue?")) return;

    const data = await load(spreadsheetId);
    if (data) {
      setBrewLogs(data.logs);
      setBeans(data.beans);
      localStorage.setItem('brew_logs', JSON.stringify(data.logs));
      localStorage.setItem('coffee_beans', JSON.stringify(data.beans));
      alert("Restore successful!");
    }
  };

  const handleAddAction = () => {
    if (activeTab === 'beans') handleAddNewBean();
    if (activeTab === 'history') handleAddNewLog();
  };

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      isConnected={isConnected}
      isThinking={isThinking}
      onConnectToggle={handleToggleConnect}
      onAddAction={handleAddAction}
      analyserRef={analyserRef}
    >
      {activeTab === 'assistant' && (
        <AssistantView
          draftBrew={draftBrew}
          draftBean={draftBean}
          beans={beans}
          onEditDraft={() => setIsEditingDraft(true)}
          transcript={transcript}
          isThinking={isThinking}
          analyserRef={analyserRef}
          isConnected={isConnected}
        />
      )}

      {activeTab === 'beans' && (
        <BeansView
          beans={beans}
          onDelete={handleDeleteBean}
          onEdit={setEditingBean}
          editingBean={editingBean}
          setEditingBean={setEditingBean}
          onSave={handleSaveBean}
        />
      )}

      {activeTab === 'history' && (
        <HistoryView
          logs={brewLogs}
          beans={beans}
          onDelete={handleDeleteLog}
          onEdit={setEditingHistoryLog}
          editingLog={editingHistoryLog}
          setEditingLog={setEditingHistoryLog}
          onSave={handleSaveHistoryLog}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsView
          apiKey={apiKey}
          setApiKey={setApiKey}
          voice={voice}
          setVoice={setVoice}
          googleClientId={googleClientId}
          setGoogleClientId={setGoogleClientId}
          spreadsheetId={spreadsheetId}
          setSpreadsheetId={setSpreadsheetId}
          onAuthenticate={handleGoogleAuthenticate}
          onBackup={handleGoogleBackup}
          onLoad={handleGoogleRestore}
          isGoogleAuthenticated={!!accessToken}
          isSyncing={isSyncing}
          syncError={syncError}
        />
      )}

      {isEditingDraft && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-app-card w-full max-w-md rounded-3xl border border-app-border p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsEditingDraft(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-white"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <h2 className="text-xl font-bold text-white mb-6">Edit Draft</h2>
            <form onSubmit={handleSaveDraft} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <DraftEditForm
                draftBrew={draftBrew}
                beans={beans}
                onSave={handleSaveDraft}
                onCancel={() => setIsEditingDraft(false)}
              />
            </form>
          </div>
        </div>
      )}

    </Layout>
  );
}

// Helper component to keep App.tsx clean
import { Input as UIInput, Select as UISelect, TextArea as UITextArea } from './components/ui/Input';
import { Button } from './components/ui/Button';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DraftEditForm({ draftBrew, beans }: any) {
  return (
    <>
      <UIInput
        label="Brewer"
        name="brewer"
        defaultValue={draftBrew?.brewer || ''}
      />
      <div className="grid grid-cols-2 gap-3">
        <UIInput
          label="Grinder"
          name="grinder"
          defaultValue={draftBrew?.grinder || ''}
        />
        <UIInput
          label="Setting"
          name="grinderSetting"
          defaultValue={draftBrew?.grinderSetting || ''}
        />
      </div>
      <UISelect
        label="Bean"
        name="beanId"
        defaultValue={draftBrew?.beanId || ''}
        options={[
          { value: '', label: 'Select Bean...' },
          ...beans.map((b: Bean) => ({ value: b.id, label: `${b.roastery} - ${b.name}` }))
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <UIInput
          label="Ratio"
          name="ratio"
          defaultValue={draftBrew?.ratio || ''}
        />
        <UIInput
          label="Temp (°C)"
          name="waterTemp"
          type="number"
          defaultValue={draftBrew?.waterTemp || ''}
        />
      </div>
      <UITextArea
        label="Technique"
        name="technique"
        defaultValue={draftBrew?.technique || ''}
      />
      <div className="grid grid-cols-2 gap-3">
        <UIInput
          label="Extraction"
          name="extraction"
          type="number"
          step="0.1"
          defaultValue={draftBrew?.extraction || ''}
        />
        <UIInput
          label="Enjoyment (0-5)"
          name="enjoyment"
          type="number"
          min="0"
          max="5"
          step="0.5"
          defaultValue={draftBrew?.enjoyment || ''}
        />
      </div>
      <Button type="submit" className="w-full" size="lg">Update Draft</Button>
    </>
  )
}

export default App;
