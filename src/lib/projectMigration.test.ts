import { describe, expect, it } from 'vitest';
import { migrateProject } from './projectMigration';
import type { ProjectFileV1 } from '../types';

describe('project migration',()=>{it('preserves Version 1 sketch data and initializes measurement state',()=>{const v1:ProjectFileV1={version:1,job:{jobName:'Legacy',address:'',client:'',notes:'',date:'2026-01-01',projectId:'1'},canvas:{gridVisible:true,gridSize:24,snapToGrid:true},objects:[],layers:[],viewport:{x:2,y:3,scale:1}};const v2=migrateProject(v1);expect(v2.version).toBe(2);expect(v2.mode).toBe('sketch');expect(v2.measuredEntities).toEqual([]);expect(v2.job.jobName).toBe('Legacy')})});
