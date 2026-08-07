import { BoxSelect, Fence, Hand, Home, LandPlot, MousePointer2, Pentagon, RectangleHorizontal, Route, SquareDashedMousePointer, Trash2, Waves } from 'lucide-react';
import type { Tool } from '../types';
import { useSketchStore } from '../store/useSketchStore';

const tools: { id: Tool; label: string; icon: typeof MousePointer2 }[] = [
  { id: 'select', label: 'Select', icon: MousePointer2 }, { id: 'hand', label: 'Hand', icon: Hand },
  { id: 'lot', label: 'Lot', icon: LandPlot }, { id: 'house', label: 'House', icon: Home },
  { id: 'fence', label: 'Fence', icon: Fence }, { id: 'driveway', label: 'Driveway', icon: Route },
  { id: 'sidewalk', label: 'Sidewalk', icon: Waves }, { id: 'patio', label: 'Patio', icon: SquareDashedMousePointer },
  { id: 'rectangle', label: 'Rectangle', icon: RectangleHorizontal }, { id: 'polygon', label: 'Polygon', icon: Pentagon },
  { id: 'delete', label: 'Delete', icon: Trash2 },
];

export function ToolRail() {
  const active = useSketchStore(s => s.activeTool); const setTool = useSketchStore(s => s.setTool); const remove = useSketchStore(s => s.deleteSelected);
  return <aside className="tool-rail" aria-label="Drawing tools">
    <div className="rail-title"><BoxSelect size={19}/><span>Tools</span></div>
    <div className="tool-list">{tools.map(({ id, label, icon: Icon }) => <button key={id} title={label} className={`tool-button ${active === id ? 'active' : ''} ${id === 'delete' ? 'danger' : ''}`} onClick={() => id === 'delete' ? remove() : setTool(id)}>
      <Icon size={21} strokeWidth={1.8}/><span>{label}</span>
    </button>)}</div>
  </aside>;
}
