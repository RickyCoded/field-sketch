import { Group, Line, Text } from 'react-konva';
import { calculateSitePath } from '../lib/siteGeometry';
import { useSketchStore } from '../store/useSketchStore';
import type { MeasuredFence, MeasuredSurface, RoadMeasurement } from '../types';

export function RoadShape({road}:{road:RoadMeasurement}){
  const selected=useSketchStore(s=>s.selectedRoadId===road.id);
  const a={x:(road.curbA.start.x+road.curbA.end.x)/2,y:(road.curbA.start.y+road.curbA.end.y)/2},b={x:(road.curbB.start.x+road.curbB.end.x)/2,y:(road.curbB.start.y+road.curbB.end.y)/2};
  return <Group onClick={e=>{e.cancelBubble=true;useSketchStore.setState({selectedRoadId:road.id})}} onTap={e=>{e.cancelBubble=true;useSketchStore.setState({selectedRoadId:road.id})}}>
    <Line points={[road.curbA.start.x,road.curbA.start.y,road.curbA.end.x,road.curbA.end.y]} stroke={selected?'#d7781f':'#4a5550'} strokeWidth={selected?5:3}/>
    <Line points={[road.curbB.start.x,road.curbB.start.y,road.curbB.end.x,road.curbB.end.y]} stroke={selected?'#d7781f':'#4a5550'} strokeWidth={selected?5:3}/>
    <Line points={[a.x,a.y,b.x,b.y]} stroke="#1f4439" strokeWidth={2} dash={[5,4]}/>
    <Text x={road.labelPosition.x-45} y={road.labelPosition.y-18} width={90} align="center" text={`${road.streetName}\n${road.measuredWidth}' BOC–BOC`} fontSize={11} fontStyle="bold" fill="#1f4439"/>
  </Group>;
}

export function FenceShape({ fence }: { fence: MeasuredFence }) {
  const update = useSketchStore(s => s.updateFence);
  const path = calculateSitePath(fence.startPoint, fence.segments).points;
  const points = path.flatMap(p => [p.x, p.y]);
  const dash = fence.lineStyle === 'dashed' ? [12, 7] : fence.lineStyle === 'cross' ? [3, 5] : undefined;
  return <Group>
    {fence.lineStyle === 'double' && <Line points={points} closed={fence.closed} stroke="#27322e" strokeWidth={7}/>} 
    <Line points={points} closed={fence.closed} stroke={fence.lineStyle === 'double' ? '#fff' : '#27322e'} strokeWidth={3} dash={dash} lineJoin="round"/>
    {fence.lineStyle === 'cross' && <Line points={points} closed={fence.closed} stroke="#27322e" strokeWidth={1} dash={[10, 3]}/>} 
    {fence.gates.map((gate, i) => { const p = path[Math.min(i + 1, path.length - 1)] ?? fence.startPoint; return <Group key={gate.id}><Line points={[p.x-8,p.y-8,p.x+8,p.y+8]} stroke="#27322e" strokeWidth={2}/><Text x={p.x+5} y={p.y-16} text={gate.label} fontSize={9}/></Group>; })}
    {fence.labelVisible && <Text x={fence.labelPosition.x} y={fence.labelPosition.y} text={fence.label} fontSize={11} fontStyle="bold" fill="#27322e" draggable onDragEnd={e => update(fence.id, { labelPosition: { x: e.target.x(), y: e.target.y() } })}/>} 
  </Group>;
}

export function SurfaceShape({ surface }: { surface: MeasuredSurface }) {
  const update = useSketchStore(s => s.updateSurface);
  const path = surface.segments.length ? calculateSitePath(surface.startPoint, surface.segments).points : surface.vertices;
  const points = path.flatMap(p => [p.x, p.y]); const closed = surface.geometryMode !== 'polyline-width';
  // Konva accepts a canvas as a pattern source; its React type currently names only HTMLImageElement.
  const pattern = closed ? patternCanvas(surface.pattern) as unknown as HTMLImageElement : undefined;
  return <Group><Line points={points} closed={closed} stroke="#58615d" strokeWidth={surface.geometryMode === 'polyline-width' ? (surface.width ?? 2) * 8 : 2} opacity={surface.geometryMode === 'polyline-width' ? .35 : 1} fill={closed ? '#e8e9e6' : undefined} fillPatternImage={pattern} fillPatternRepeat="repeat" lineJoin="round"/><Text x={surface.labelPosition.x} y={surface.labelPosition.y} text={`${surface.label}${surface.areaState === 'covered' ? ' · COVERED' : ''}`} fontSize={11} fontStyle="bold" fill="#4c5551" draggable onDragEnd={e => update(surface.id, { labelPosition: { x: e.target.x(), y: e.target.y() } })}/></Group>;
}

const cache = new Map<string, HTMLCanvasElement>();
function patternCanvas(pattern: string) {
  if (pattern === 'none') return undefined; const old = cache.get(pattern); if (old) return old;
  const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d')!; x.strokeStyle = '#9da49f'; x.fillStyle = '#929994'; x.lineWidth = 1;
  if (pattern === 'diagonal' || pattern === 'crosshatch') { x.beginPath(); x.moveTo(0,16); x.lineTo(16,0); x.stroke(); if (pattern === 'crosshatch') { x.beginPath(); x.moveTo(0,0); x.lineTo(16,16); x.stroke(); } }
  else if (pattern === 'dots') { x.beginPath(); x.arc(4,4,1,0,Math.PI*2); x.fill(); }
  else for (let i=0;i<5;i++) { x.beginPath(); x.arc((i*7)%16,(i*11)%16,1,0,Math.PI*2); x.fill(); }
  cache.set(pattern,c); return c;
}
