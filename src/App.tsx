import { jsPDF } from 'jspdf';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Contrast, PanelLeftClose, PanelRightClose } from 'lucide-react';
import { JobModal } from './components/JobModal';
import { PropertiesPanel } from './components/PropertiesPanel';
import { type CanvasHandle, SketchCanvas } from './components/SketchCanvas';
import { ToolRail } from './components/ToolRail';
import { TopBar } from './components/TopBar';
import { MeasureRail } from './components/MeasureRail';
import { MeasurementPanel } from './components/MeasurementPanel';
import { ClosureReview } from './components/ClosureReview';
import { LotPanel } from './components/LotPanel';
import { OffsetPanel } from './components/OffsetPanel';
import { SiteFeaturePanel } from './components/SiteFeaturePanel';
import { FieldNotePanel } from './components/FieldNotePanel';
import { FieldNoteRail } from './components/FieldNoteRail';
import { RoadPanel } from './components/RoadPanel';
import { saveFieldDataSummaryPdf } from './export/fieldDataSummary';
import { collectProjectWarnings } from './lib/projectValidation';
import { useSketchStore } from './store/useSketchStore';

export default function App() {
  const canvas = useRef<CanvasHandle>(null); const [jobOpen, setJobOpen] = useState(false); const [leftOpen,setLeftOpen]=useState(true);const [rightOpen,setRightOpen]=useState(true);const [highContrast,setHighContrast]=useState(()=>localStorage.getItem('fieldsketch-high-contrast')==='true'); const job = useSketchStore(s => s.job); const mode = useSketchStore(s => s.mode);const measureWorkspace=useSketchStore(s=>s.measureWorkspace);
  useEffect(()=>{localStorage.setItem('fieldsketch-high-contrast',String(highContrast))},[highContrast]);
  const exportImage = async (type:'png'|'pdf'|'summary') => { const sketch=canvas.current?.exportDataUrl();if(!sketch)return;const safe=(job.jobName||'field-sketch').replace(/\W+/g,'-').toLowerCase();if(type==='summary'){const state=useSketchStore.getState();saveFieldDataSummaryPdf({job:state.job,structures:state.measuredEntities,fences:state.fences,surfaces:state.surfaces,offsets:state.offsets,roads:state.roads,measurements:state.measurementRecords,warnings:collectProjectWarnings(state),sketchDataUrl:sketch},`${safe}-field-data-summary.pdf`);return}const image=await composeExport(sketch,job);if(type==='png'){const a=document.createElement('a');a.download=`${safe}.png`;a.href=image;a.click()}else{const pdf=new jsPDF({orientation:'landscape',unit:'pt',format:'letter'});pdf.addImage(image,'PNG',24,24,744,564);pdf.save(`${safe}.pdf`)} };
  const left=mode==='sketch'?<ToolRail/>:mode==='field-note'?<FieldNoteRail/>:<MeasureRail/>;const right=mode==='sketch'?<PropertiesPanel/>:mode==='field-note'?<FieldNotePanel/>:measureWorkspace==='lot'?<LotPanel/>:measureWorkspace==='road'?<RoadPanel/>:measureWorkspace==='offset'?<OffsetPanel/>:measureWorkspace==='fence'?<SiteFeaturePanel kind="fence"/>:measureWorkspace==='surface'?<SiteFeaturePanel kind="surface"/>:<MeasurementPanel/>;
  return <div className={`app-shell ${highContrast?'high-contrast':''}`}><TopBar onExport={exportImage} onFit={() => canvas.current?.zoomToFit()} onJob={() => setJobOpen(true)} highContrast={highContrast} onContrast={()=>setHighContrast(value=>!value)}/><main className={`workspace ${!leftOpen?'left-collapsed':''} ${!rightOpen?'right-collapsed':''}`}><div className="workspace-panel left-panel">{left}<button className="panel-collapse left" aria-label={leftOpen?'Collapse drawing tools':'Show drawing tools'} aria-expanded={leftOpen} onClick={()=>setLeftOpen(value=>!value)}>{leftOpen?<PanelLeftClose/>:<ChevronRight/>}</button></div><SketchCanvas ref={canvas}/><div className="workspace-panel right-panel">{right}<button className="panel-collapse right" aria-label={rightOpen?'Collapse properties panel':'Show properties panel'} aria-expanded={rightOpen} onClick={()=>setRightOpen(value=>!value)}>{rightOpen?<PanelRightClose/>:<ChevronLeft/>}</button></div><button className="canvas-contrast" aria-label="Toggle high contrast" aria-pressed={highContrast} onClick={()=>setHighContrast(value=>!value)}><Contrast/>High contrast</button></main>{jobOpen && <JobModal close={() => setJobOpen(false)}/>}<ClosureReview/></div>;
}

// Export composition is deliberately outside the editor canvas: saved viewport
// state remains untouched while PNG and PDF share one consistent title block.
async function composeExport(sketchUrl: string, job: ReturnType<typeof useSketchStore.getState>['job']) {
  const W = 1500, H = 1125, c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0,0,W,H); ctx.fillStyle = '#173b32'; ctx.fillRect(0,0,W,108); ctx.fillStyle = '#fff'; ctx.font = '700 38px system-ui'; ctx.fillText(job.jobName || 'ILR Sketch', 44, 50); ctx.font = '20px system-ui'; ctx.fillStyle = '#cfe4dd'; ctx.fillText([job.address, job.client].filter(Boolean).join('  •  ') || 'Improvement Location Report', 44, 82); const img = new Image(); await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = sketchUrl; }); const box = { x: 36, y: 130, w: W-72, h: H-252 }; ctx.fillStyle='#f8faf7'; ctx.fillRect(box.x,box.y,box.w,box.h); const ratio = Math.min(box.w/img.width,box.h/img.height); const iw=img.width*ratio, ih=img.height*ratio; ctx.drawImage(img,box.x+(box.w-iw)/2,box.y+(box.h-ih)/2,iw,ih); ctx.strokeStyle='#9eaaa5'; ctx.lineWidth=2; ctx.strokeRect(36,H-100,W-72,70); ctx.fillStyle='#172b25'; ctx.font='600 17px system-ui'; ctx.fillText(`PROJECT ID  ${job.projectId || '—'}`,58,H-66); ctx.fillText(`DATE  ${job.date || '—'}`,560,H-66); ctx.fillText(`CLIENT  ${job.client || '—'}`,930,H-66); ctx.font='14px system-ui'; ctx.fillStyle='#64746e'; ctx.fillText('ILR SKETCH · NOT A CAD DRAWING',58,H-40); return c.toDataURL('image/png');
}
