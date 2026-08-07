import type { FieldChecklist, NorthArrow, ProjectSettings, SemanticLayer } from '../types';
import { DEFAULT_SCALE } from '../measurements/units';
export const defaultProjectSettings=():ProjectSettings=>({units:'decimal-feet',displayPrecision:'hundredth',scale:{...DEFAULT_SCALE},gridSpacingFeet:3,northAngle:0});
export const defaultSemanticLayers=():SemanticLayer[]=>['Property','Structures','Fences','Concrete and surfaces','Dimensions','Labels','Field notes','Reference geometry'].map((name,order)=>({id:['property','structures','fences','surfaces','dimensions','labels','field-notes','reference'][order] as SemanticLayer['id'],name,visible:true,locked:false,order}));
export const defaultNorthArrow=():NorthArrow=>({id:'north-arrow',position:{x:80,y:80},rotation:0,locked:false,visible:false,layerId:'reference'});
export const defaultFieldChecklist=():FieldChecklist=>({'lot-entered':false,'residence-entered':false,'walls-measured':false,'offsets-entered':false,'fence-types':false,'concrete-entered':false,'north-checked':false,'street-labels':false,'unassigned-reviewed':false});
