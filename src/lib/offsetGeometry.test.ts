import { describe,expect,it } from 'vitest';
import { calculateFeatureOffset } from './offsetGeometry';

describe('offset geometry',()=>{it('calculates scaled separation independently from field measurement',()=>{const result=calculateFeatureOffset({start:{x:0,y:0},end:{x:80,y:0}},{start:{x:0,y:20},end:{x:80,y:20}},8);expect(result.value).toBe(2.5);const measured=2.25;expect(measured).not.toBe(result.value)});it('supports point-to-line corner offsets',()=>{const result=calculateFeatureOffset({start:{x:16,y:16},end:{x:16,y:16}},{start:{x:0,y:0},end:{x:80,y:0}},8);expect(result.value).toBe(2)})});
