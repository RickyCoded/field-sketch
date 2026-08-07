import { beforeEach, describe, expect, it } from 'vitest';
import { useSketchStore } from '../store/useSketchStore';
import type { ProjectFileV2 } from '../types';
import { graphicalRoadWidth, roadGeometry } from './roadGeometry';

describe('road field measurements',()=>{
  beforeEach(()=>useSketchStore.getState().newProject());
  it('creates parallel back-of-curb lines at the entered width',()=>{const geometry=roadGeometry({x:100,y:100},36,80,0,.125);const road={id:'r',streetName:'Example Road',measurementAnchor:{x:100,y:100},roadAngle:0,referenceLength:80,measuredWidth:36,graphicalWidth:36,...geometry,verified:true,notes:'',createdAt:'2026-01-01',updatedAt:'2026-01-01'};expect(graphicalRoadWidth(road,.125)).toBeCloseTo(36);expect(geometry.curbA.start.y).toBeCloseTo(-44);expect(geometry.curbB.start.y).toBeCloseTo(244)});
  it('supports perpendicular roads for a corner lot',()=>{const front=roadGeometry({x:200,y:500},40,100,0),side=roadGeometry({x:50,y:300},32,90,90);expect(front.curbA.start.y).not.toBe(front.curbB.start.y);expect(side.curbA.start.x).not.toBe(side.curbB.start.x)});
  it('saves and reopens road measurements',()=>{const s=useSketchStore.getState();s.beginRoad();s.setRoadLocation({x:200,y:500});s.saveRoad({streetName:'Fictional Avenue',measuredWidth:38,roadAngle:0,referenceLength:90,verified:false,notes:'BOC to BOC'});const saved=JSON.parse(JSON.stringify(useSketchStore.getState().serialize())) as ProjectFileV2;expect(saved.roads).toHaveLength(1);useSketchStore.getState().newProject();useSketchStore.getState().loadProject(saved);expect(useSketchStore.getState().roads[0]).toMatchObject({streetName:'Fictional Avenue',measuredWidth:38,notes:'BOC to BOC'})});
});
