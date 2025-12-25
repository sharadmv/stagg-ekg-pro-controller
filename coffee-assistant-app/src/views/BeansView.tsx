import React from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/Modal';
import { Input, TextArea } from '../components/ui/Input';
import { Pencil, Trash2, ExternalLink, PackageOpen } from 'lucide-react';
import type { Bean } from '../types/gemini';

interface BeansViewProps {
  beans: Bean[];
  onDelete: (id: string) => void;
  onEdit: (bean: Bean) => void;
  editingBean: Bean | null;
  setEditingBean: (bean: Bean | null) => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function BeansView({ beans, onDelete, onEdit, editingBean, setEditingBean, onSave }: BeansViewProps) {
  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-end justify-between">
         <h2 className="text-2xl font-bold text-white tracking-tight">Bean Library</h2>
         <span className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">{beans.length} Bags</span>
      </div>

      {beans.length === 0 && (
        <Card className="py-20 text-center border-dashed border-app-border bg-transparent">
           <PackageOpen className="w-12 h-12 mx-auto mb-4 text-app-border" />
           <p className="font-bold text-text-muted uppercase tracking-widest text-xs">No beans saved yet</p>
        </Card>
      )}

      <div className="grid gap-4">
        {beans.map(bean => (
          <Card key={bean.id} className="group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-coffee-gold text-[10px] font-black uppercase tracking-widest mb-1">{bean.roastery}</p>
                <h3 className="font-bold text-xl text-white leading-tight">{bean.name}</h3>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={() => onEdit(bean)} icon={<Pencil className="w-3 h-3" />} />
                <Button variant="ghost" size="sm" onClick={() => { if(window.confirm("Delete?")) onDelete(bean.id) }} className="text-red-500 hover:text-red-400" icon={<Trash2 className="w-3 h-3" />} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {bean.origin && <Badge variant="default" label="Origin">{bean.origin}</Badge>}
              {bean.process && <Badge variant="default" label="Process">{bean.process}</Badge>}
              {bean.varietal && <Badge variant="default" label="Varietal">{bean.varietal}</Badge>}
              {bean.roastLevel && <Badge variant="default" label="Roast">{bean.roastLevel}</Badge>}
            </div>

            {bean.notes && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/5 mb-3">
                <p className="text-[9px] text-text-muted font-bold uppercase mb-1">Tasting Notes</p>
                <p className="text-sm text-text-main/90 italic">{bean.notes}</p>
              </div>
            )}

            {bean.url && (
              <a
                href={bean.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-coffee-gold hover:text-white transition-colors text-[10px] font-black uppercase"
              >
                View Details <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </Card>
        ))}
      </div>

      <Modal
        isOpen={!!editingBean}
        onClose={() => setEditingBean(null)}
        title="Edit Bean"
      >
        <form onSubmit={onSave} className="space-y-4">
          <Input
            label="Roastery"
            name="roastery"
            value={editingBean?.roastery || ''}
            onChange={e => setEditingBean(editingBean ? { ...editingBean, roastery: e.target.value } : null)}
          />
          <Input
            label="Name"
            name="name"
            value={editingBean?.name || ''}
            onChange={e => setEditingBean(editingBean ? { ...editingBean, name: e.target.value } : null)}
          />
          <div className="grid grid-cols-2 gap-3">
             <Input
                label="Origin"
                name="origin"
                value={editingBean?.origin || ''}
                onChange={e => setEditingBean(editingBean ? { ...editingBean, origin: e.target.value } : null)}
              />
             <Input
                label="Process"
                name="process"
                value={editingBean?.process || ''}
                onChange={e => setEditingBean(editingBean ? { ...editingBean, process: e.target.value } : null)}
              />
             <Input
                label="Varietal"
                name="varietal"
                value={editingBean?.varietal || ''}
                onChange={e => setEditingBean(editingBean ? { ...editingBean, varietal: e.target.value } : null)}
              />
             <Input
                label="Roast"
                name="roastLevel"
                value={editingBean?.roastLevel || ''}
                onChange={e => setEditingBean(editingBean ? { ...editingBean, roastLevel: e.target.value } : null)}
              />
          </div>
          <TextArea
            label="Notes"
            name="notes"
            value={editingBean?.notes || ''}
            onChange={e => setEditingBean(editingBean ? { ...editingBean, notes: e.target.value } : null)}
          />
          <Button type="submit" className="w-full" size="lg">Save Changes</Button>
        </form>
      </Modal>
    </div>
  );
}
