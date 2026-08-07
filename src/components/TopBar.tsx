import { ClipboardList, ClipboardPen, Contrast, Download, FileDown, FilePlus2, FolderOpen, Grid3X3, Info, PencilRuler, Redo2, Save, Undo2, ZoomIn } from 'lucide-react';
import { useRef } from 'react';
import { useSketchStore } from '../store/useSketchStore';
import type { ProjectFile } from '../types';

interface Props { onExport: (type: 'png' | 'pdf' | 'summary') => void; onFit: () => void; onJob: () => void; highContrast:boolean; onContrast:()=>void }
const saveBlob = (data: Blob, filename: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(data); a.download = filename; a.click(); URL.revokeObjectURL(a.href); };

export function TopBar({ onExport, onFit, onJob, highContrast, onContrast }: Props) {
  const input = useRef<HTMLInputElement>(null); const s = useSketchStore();
  const save = () => saveBlob(new Blob([JSON.stringify(s.serialize(), null, 2)], { type: 'application/json' }), `${(s.job.jobName || 'field-sketch').replace(/\W+/g, '-').toLowerCase()}.fieldsketch.json`);
  const open = async (file?: File) => { if (!file) return; try { s.loadProject(JSON.parse(await file.text()) as ProjectFile); } catch { alert('This file is not a valid FieldSketch project.'); } };
  const actions = [
    { label: 'New Job', icon: FilePlus2, fn: () => { if (!s.objects.length || confirm('Start a new job? Unsaved changes will be lost.')) s.newProject(); } },
    { label: 'Open Job', icon: FolderOpen, fn: () => input.current?.click() }, { label: 'Save Job', icon: Save, fn: save },
  ];
  return <header className="topbar">
    <div className="brand"><div className="brand-mark"><LandIcon/></div><div><strong>FieldSketch</strong><span>ILR workspace</span></div></div>
    <div className="mode-switch" aria-label="Workspace mode"><button className={s.mode === 'sketch' ? 'active' : ''} onClick={() => s.setMode('sketch')}><PencilRuler size={16}/>Sketch</button><button className={s.mode === 'measure' ? 'active' : ''} onClick={() => s.setMode('measure')}><span className="measure-mark">↔</span>Measure</button><button className={s.mode === 'field-note' ? 'active' : ''} onClick={() => s.setMode('field-note')}><ClipboardPen size={16}/>Notes</button></div>
    <div className="top-actions primary-actions">{actions.map(({ label, icon: Icon, fn }) => <button key={label} onClick={fn}><Icon size={18}/><span>{label}</span></button>)}</div>
    <div className="top-actions">
      <button title="Export PNG" onClick={() => onExport('png')}><Download size={18}/><span>PNG</span></button>
      <button title="Export PDF" onClick={() => onExport('pdf')}><FileDown size={18}/><span>PDF</span></button><button title="Field Data Summary PDF" onClick={() => onExport('summary')}><ClipboardList size={18}/><span>Data PDF</span></button><i/>
      <button title="Undo" disabled={!s.past.length} onClick={s.undo}><Undo2 size={18}/></button><button title="Redo" disabled={!s.future.length} onClick={s.redo}><Redo2 size={18}/></button>
      <button title="Zoom to fit" onClick={onFit}><ZoomIn size={18}/></button><button title="Toggle grid" className={s.canvas.gridVisible ? 'is-on' : ''} onClick={() => s.setCanvas({ gridVisible: !s.canvas.gridVisible })}><Grid3X3 size={18}/></button><button title="Toggle high contrast" aria-pressed={highContrast} className={highContrast?'is-on':''} onClick={onContrast}><Contrast size={18}/></button>
      <button className="job-button" onClick={onJob}><Info size={18}/><span>Job info</span></button>
    </div>
    <input hidden ref={input} type="file" accept=".json,.fieldsketch.json" onChange={e => open(e.target.files?.[0])}/>
  </header>;
}
function LandIcon(){ return <svg width="25" height="25" viewBox="0 0 24 24" fill="none"><path d="m4 17 3-10 10-3 3 13-9 3-7-3Z" stroke="currentColor" strokeWidth="2"/><path d="m7 7 4 13M17 4l3 13" stroke="currentColor" opacity=".45"/></svg> }
