import { useState, useEffect, useCallback } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { Layout } from './components/Layout';
import { AssistantView } from './views/AssistantView';
import { BeansView } from './views/BeansView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
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
      url: ''
    });
  };

  const handleAddNewLog = () => {
    setEditingHistoryLog({
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      brewer: '',
      beanId: '',
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
        />
      )}

       {/* Keep the Draft Edit Modal here or move to AssistantView - Keeping here to reuse existing logic easily */}
       {/* Actually, the Modal for Draft Edit is not in AssistantView, so we need it here or pass the state down.
           AssistantView handles the display. We need the Modal here.
       */}
       {/* Re-implementing the Draft Modal using the new components would be ideal, but for now let's reuse the logic but style the inputs */}

       {/* Wait, I should probably migrate the Draft Edit Modal to use the new Inputs too.
           Let's create a quick wrapper or just render it here using the new Modal/Input components.
       */}

       {/* I will use the Modal component from `src/components/Modal.tsx` but content inside will use new Inputs */}
       {/* Wait, I didn't refactor `src/components/Modal.tsx` yet?
           The plan didn't explicitly say to refactor it, but `BeansView` and `HistoryView` use it.
           Let's check `src/components/Modal.tsx` content.
       */}

      {/*
          I will finish App.tsx and then check Modal.tsx.
          The Modal in BeansView and HistoryView uses the existing Modal component.
          I should check if that Modal component needs styling updates to match the new theme.
      */}

      {/* Adding the Draft Edit Modal here for the Assistant View */}
      {/* We need to import Modal and Inputs */}
      {isEditingDraft && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-app-card w-full max-w-md rounded-3xl border border-app-border p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={() => setIsEditingDraft(false)}
                    className="absolute top-4 right-4 text-text-muted hover:text-white"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
                <h2 className="text-xl font-bold text-white mb-6">Edit Draft</h2>
                <form onSubmit={handleSaveDraft} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                     <div className="space-y-4">
                        {/* Re-using the logic from the old App.tsx but with new components */}
                         {/* We need to import Input, Select etc inside App.tsx or create a subcomponent */}
                         {/* For simplicity in this step, I'll inline the form using the imported components */}
                     </div>
                      {/* ... Wait, I can't write JSX in a comment.
                          I need to actually implement the form here.
                          I'll use the components I imported at the top of App.tsx
                      */}

                        {/* Importing components for this modal locally in App.tsx return */}
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
                    label="Enjoyment (1-10)"
                    name="enjoyment"
                    type="number"
                    min="1"
                    max="10"
                    defaultValue={draftBrew?.enjoyment || ''}
                  />
            </div>
            <Button type="submit" className="w-full" size="lg">Update Draft</Button>
        </>
    )
}

export default App;
