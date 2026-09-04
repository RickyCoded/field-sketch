import { BoxSelect, Building2, ClipboardCheck, Database, Fence, Hand, Home, LandPlot, Layers3, MapPinned, MousePointer2, Pentagon, RectangleHorizontal, Route, Ruler, SquareDashedMousePointer, StickyNote, Trash2, Waves } from 'lucide-react';
import type { MeasureWorkspace, Tool } from '../types';
import { useSketchStore } from '../store/useSketchStore';

type FieldPanelTab='capture'|'inbox'|'layers'|'settings'|'review';
const sketchTools: { id: Tool; label: string; icon: typeof MousePointer2 }[] = [
  { id: 'select', label: 'Select', icon: MousePointer2 }, { id: 'hand', label: 'Pan', icon: Hand },
  { id: 'lot', label: 'Lot shape', icon: LandPlot }, { id: 'house', label: 'House shape', icon: Home },
  { id: 'fence', label: 'Fence line', icon: Fence }, { id: 'driveway', label: 'Driveway', icon: Route },
  { id: 'sidewalk', label: 'Sidewalk', icon: Waves }, { id: 'patio', label: 'Patio', icon: SquareDashedMousePointer },
  { id: 'rectangle', label: 'Rectangle', icon: RectangleHorizontal }, { id: 'polygon', label: 'Polygon', icon: Pentagon },
];
const measuredTools:{id:MeasureWorkspace;label:string;icon:typeof MousePointer2}[]=[
  {id:'structure',label:'Measured structure',icon:Building2},{id:'lot',label:'Measured lot',icon:Ruler},
  {id:'road',label:'Road width',icon:MapPinned},{id:'offset',label:'Offset',icon:Database},
  {id:'fence',label:'Measured fence',icon:Fence},{id:'surface',label:'Measured surface',icon:Layers3},
];

/** One tool rail keeps drawing, measured capture, and field aids on the same canvas. */
export function ToolRail({onOpenFieldPanel}:{onOpenFieldPanel:(tab:FieldPanelTab)=>void}) {
  const s=useSketchStore();
  const chooseSketch=(tool:Tool)=>{if(tool==='delete'){s.deleteSelected();return}s.setMode('sketch');s.setTool(tool)};
  const chooseMeasured=(workspace:MeasureWorkspace)=>{s.setMode('measure');if(workspace==='offset')s.beginOffset();else s.setMeasureWorkspace(workspace)};
  const openField=(tab:FieldPanelTab)=>{s.setMode('field-note');s.setFieldNoteTool('select');onOpenFieldPanel(tab)};
  return <aside className="tool-rail" aria-label="Sketch tools">
    <div className="rail-title"><BoxSelect size={19}/><span>Sketch</span></div>
    <div className="tool-list">
      <div className="rail-section-label">Draw</div>
      {sketchTools.map(({id,label,icon:Icon})=><button key={id} title={label} className={`tool-button ${s.mode==='sketch'&&s.activeTool===id?'active':''}`} onClick={()=>chooseSketch(id)}><Icon size={21} strokeWidth={1.8}/><span>{label}</span></button>)}
      <div className="rail-section-label">Measured drawing</div>
      {measuredTools.map(({id,label,icon:Icon})=><button key={id} title={label} className={`tool-button ${s.mode==='measure'&&s.measureWorkspace===id?'active':''}`} onClick={()=>chooseMeasured(id)}><Icon size={21} strokeWidth={1.8}/><span>{label}</span></button>)}
      <div className="rail-section-label">Field aids</div>
      <button className={`tool-button ${s.mode==='field-note'?'active':''}`} onClick={()=>openField('capture')}><StickyNote size={21}/><span>Notes & inbox</span></button>
      <button className="tool-button" onClick={()=>openField('review')}><ClipboardCheck size={21}/><span>Review</span></button>
      <button className="tool-button danger" onClick={()=>chooseSketch('delete')}><Trash2 size={21}/><span>Delete</span></button>
    </div>
  </aside>;
}
