import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/Modal';
import { Input, Select, TextArea } from '../components/ui/Input';
import { Pencil, Trash2, Calendar, Thermometer, Droplets, Gauge, Star } from 'lucide-react';
import type { BrewAttempt, Bean } from '../types/gemini';

interface HistoryViewProps {
  logs: BrewAttempt[];
  beans: Bean[];
  onDelete: (id: string) => void;
  onEdit: (log: BrewAttempt) => void;
  editingLog: BrewAttempt | null;
  setEditingLog: (log: BrewAttempt | null) => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function HistoryView({ logs, beans, onDelete, onEdit, editingLog, setEditingLog, onSave }: HistoryViewProps) {
    const getBeanName = (id: string) => {
        const b = beans.find(bean => bean.id === id);
        return b ? `${b.roastery} ${b.name}` : 'Unknown Bean';
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

  return (
    <div className="space-y-6 pb-20">
       <div className="flex items-end justify-between">
         <h2 className="text-2xl font-bold text-white tracking-tight">Brew Log</h2>
         <span className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">{logs.length} Brews</span>
      </div>

      {logs.length === 0 && (
        <Card className="py-20 text-center border-dashed border-app-border bg-transparent">
           <Calendar className="w-12 h-12 mx-auto mb-4 text-app-border" />
           <p className="font-bold text-text-muted uppercase tracking-widest text-xs">No brews recorded</p>
        </Card>
      )}

      <div className="relative border-l border-app-border ml-4 pl-8 space-y-8">
        {logs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
          <div key={log.id} className="relative">
            {/* Timeline Dot */}
            <div className="absolute -left-[39px] top-6 w-3 h-3 rounded-full bg-app-card border-2 border-coffee-gold" />

            <Card className="group relative">
               <div className="flex justify-between items-start mb-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase text-text-muted tracking-widest">{formatDate(log.date)}</span>
                            {log.enjoyment > 0 && (
                                <div className="flex items-center gap-0.5 bg-coffee-gold/10 px-1.5 py-0.5 rounded text-coffee-gold">
                                    <Star className="w-3 h-3 fill-current" />
                                    <span className="text-[10px] font-bold">{log.enjoyment}</span>
                                </div>
                            )}
                        </div>
                        <h3 className="font-bold text-lg text-white">{getBeanName(log.beanId)}</h3>
                        <p className="text-sm text-text-muted font-medium">{log.brewer}</p>
                    </div>
                    <div className="flex gap-1 absolute top-4 right-4 bg-app-card/80 backdrop-blur-sm rounded-xl p-1 shadow-xl border border-white/5">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(log)} icon={<Pencil className="w-3 h-3" />} />
                        <Button variant="ghost" size="sm" onClick={() => { if(window.confirm("Delete?")) onDelete(log.id) }} className="text-red-500 hover:text-red-400" icon={<Trash2 className="w-3 h-3" />} />
                    </div>
               </div>

               <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-app-bg rounded-xl p-2.5 text-center border border-app-border">
                      <Droplets className="w-3 h-3 mx-auto mb-1 text-text-muted" />
                      <p className="text-xs font-bold text-white">{log.ratio}</p>
                  </div>
                  <div className="bg-app-bg rounded-xl p-2.5 text-center border border-app-border">
                      <Thermometer className="w-3 h-3 mx-auto mb-1 text-text-muted" />
                      <p className="text-xs font-bold text-white">{log.waterTemp}°C</p>
                  </div>
                  {log.extraction && (
                      <div className="bg-app-bg rounded-xl p-2.5 text-center border border-app-border">
                          <Gauge className="w-3 h-3 mx-auto mb-1 text-text-muted" />
                          <p className="text-xs font-bold text-white">{log.extraction}%</p>
                      </div>
                  )}
               </div>

               {log.technique && (
                   <div className="mt-4 pt-4 border-t border-app-border">
                       <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Notes</p>
                       <p className="text-sm text-text-main/80 leading-relaxed">{log.technique}</p>
                   </div>
               )}
            </Card>
          </div>
        ))}
      </div>

       <Modal
        isOpen={!!editingLog}
        onClose={() => setEditingLog(null)}
        title="Edit Record"
      >
        <form onSubmit={onSave} className="space-y-4">
           <Input
              label="Date"
              name="date"
              type="date"
              defaultValue={editingLog?.date ? new Date(editingLog.date).toISOString().split('T')[0] : ''}
            />
          <Input
              label="Brewer"
              name="brewer"
              defaultValue={editingLog?.brewer || ''}
            />
          <Select
              label="Bean"
              name="beanId"
              defaultValue={editingLog?.beanId || ''}
              options={[
                  { value: '', label: 'Select Bean...' },
                  ...beans.map(b => ({ value: b.id, label: `${b.roastery} - ${b.name}` }))
              ]}
            />
          <div className="grid grid-cols-2 gap-3">
             <Input
                label="Ratio"
                name="ratio"
                defaultValue={editingLog?.ratio || ''}
              />
             <Input
                label="Temp (°C)"
                name="waterTemp"
                type="number"
                defaultValue={editingLog?.waterTemp || ''}
              />
          </div>
          <TextArea
            label="Technique"
            name="technique"
            defaultValue={editingLog?.technique || ''}
          />
           <div className="grid grid-cols-2 gap-3">
             <Input
                label="Extraction %"
                name="extraction"
                type="number"
                step="0.1"
                defaultValue={editingLog?.extraction || ''}
              />
             <Input
                label="Enjoyment (0-5)"
                name="enjoyment"
                type="number"
                min="0"
                max="5"
                step="0.5"
                defaultValue={editingLog?.enjoyment || ''}
              />
          </div>
          <Button type="submit" className="w-full" size="lg">Save Record</Button>
        </form>
      </Modal>
    </div>
  );
}
