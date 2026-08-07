import type { DrawingScale } from '../types';
export const DEFAULT_SCALE:DrawingScale={feetPerCanvasUnit:.125,displayScale:'1 canvas unit = 0.125 ft'};
export const feetToCanvas=(feet:number,scale:DrawingScale=DEFAULT_SCALE)=>feet/scale.feetPerCanvasUnit;
export const canvasToFeet=(units:number,scale:DrawingScale=DEFAULT_SCALE)=>units*scale.feetPerCanvasUnit;
