import type { Point, ShapeType, SketchObject } from '../types';

export const GRID_SIZE = 24;
export const snap = (n: number, size = GRID_SIZE) => Math.round(n / size) * size;
export const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const defaults: Record<ShapeType, { width: number; height: number; stroke: string; fill: string }> = {
  lot: { width: 360, height: 264, stroke: '#334155', fill: 'rgba(255,255,255,0.08)' },
  house: { width: 216, height: 144, stroke: '#8b5e3c', fill: '#f1dfc7' },
  fence: { width: 240, height: 0, stroke: '#64748b', fill: 'transparent' },
  driveway: { width: 120, height: 192, stroke: '#64748b', fill: '#cbd5e1' },
  sidewalk: { width: 240, height: 48, stroke: '#94a3b8', fill: '#e2e8f0' },
  patio: { width: 144, height: 120, stroke: '#a16207', fill: '#fde68a' },
  rectangle: { width: 144, height: 96, stroke: '#315d51', fill: '#d8e7e0' },
  polygon: { width: 168, height: 144, stroke: '#315d51', fill: '#d8e7e0' },
};

export function createObject(type: ShapeType, point: Point, count: number): SketchObject {
  const d = defaults[type];
  return {
    id: uid(), type, name: `${type[0].toUpperCase()}${type.slice(1)} ${count}`, x: snap(point.x), y: snap(point.y),
    width: d.width, height: d.height, rotation: 0, vertices: type === 'polygon' ? [0, d.height, d.width * .18, 0, d.width, d.height * .18, d.width * .82, d.height] : [],
    stroke: d.stroke, fill: d.fill, lineWidth: type === 'lot' ? 3 : 2, locked: false,
  };
}
