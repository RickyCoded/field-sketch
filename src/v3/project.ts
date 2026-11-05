import type { ProjectV3 } from './types';

const id=()=>crypto.randomUUID();

export function createProjectV3(jobName='Untitled ILR sketch',now=new Date().toISOString()):ProjectV3{
  const projectId=`ILR-${now.slice(0,10).replaceAll('-','')}-${id().slice(0,8).toUpperCase()}`;
  return{version:3,projectId,job:{jobName,projectId},units:'decimal-feet',displayPrecision:'tenth',grid:{visible:true,minorSpacing:1,snapEnabled:true},roads:[],features:[],dependencyOrder:[],warnings:[],viewport:{center:{x:0,y:0},pixelsPerFoot:8},notes:[],createdAt:now,updatedAt:now};
}

export function validateProjectV3(value:unknown):string[]{
  if(!value||typeof value!=='object')return['Project must be an object.'];
  const project=value as Partial<ProjectV3>,errors:string[]=[];
  if(project.version!==3)errors.push('Project version must be 3.');
  if(project.units!=='decimal-feet')errors.push('Project units must be decimal feet.');
  if(!project.job?.jobName?.trim())errors.push('Job name is required.');
  if(!Array.isArray(project.roads))errors.push('Roads must be an array.');
  if(!Array.isArray(project.features))errors.push('Features must be an array.');
  if(project.grid&&(!(project.grid.minorSpacing>0)||!Number.isFinite(project.grid.minorSpacing)))errors.push('Grid spacing must be positive.');
  const roads=Array.isArray(project.roads)?project.roads:[];
  if(roads.filter(road=>road.role==='primary').length>1)errors.push('A Phase 1 project can have only one primary road.');
  roads.forEach((road,index)=>{if(!(road.width>0))errors.push(`Road ${index+1} width must be positive.`);if(!(road.baseline?.visibleLength>0))errors.push(`Road ${index+1} visible length must be positive.`)});
  const ids=[...roads.map(road=>road.id),...(Array.isArray(project.features)?project.features.map(feature=>feature.id):[])];
  if(new Set(ids).size!==ids.length)errors.push('Project object IDs must be unique.');
  return errors;
}

export function serializeProjectV3(project:ProjectV3){const errors=validateProjectV3(project);if(errors.length)throw new Error(`Cannot save invalid project: ${errors.join(' ')}`);return JSON.stringify(project,null,2)}
export function parseProjectV3(json:string):ProjectV3{const value=JSON.parse(json) as unknown,errors=validateProjectV3(value);if(errors.length)throw new Error(`Invalid Version 3 project: ${errors.join(' ')}`);return value as ProjectV3}
