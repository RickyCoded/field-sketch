import type { FeatureKind, FeatureSemantics, FenceTypeV3, MeasuredFeatureV3, SurfaceMaterialV3 } from './types';

export type HatchPattern='none'|'diagonal'|'crosshatch'|'dots'|'sparse-dots';
export interface FeatureStyleDefinition {
  id:string;stroke:string;lineWidth:number;dash:number[];fill:string;hatch:HatchPattern;
  defaultGeometry:'open-path'|'closed-area';defaultLabel:string;
}

const styles:Record<FeatureKind,FeatureStyleDefinition>={
  house:{id:'structure-house',stroke:'#111111',lineWidth:3,dash:[],fill:'#ffffff',hatch:'none',defaultGeometry:'closed-area',defaultLabel:'RESIDENCE'},
  'other-building':{id:'structure-other',stroke:'#111111',lineWidth:2.5,dash:[],fill:'#ffffff',hatch:'crosshatch',defaultGeometry:'closed-area',defaultLabel:'BUILDING'},
  carport:{id:'structure-carport',stroke:'#111111',lineWidth:2,dash:[8,4],fill:'#ffffff',hatch:'diagonal',defaultGeometry:'closed-area',defaultLabel:'CARPORT'},
  porch:{id:'surface-porch',stroke:'#333333',lineWidth:2,dash:[],fill:'#f4f4f4',hatch:'diagonal',defaultGeometry:'closed-area',defaultLabel:'PORCH'},
  concrete:{id:'surface-concrete',stroke:'#444444',lineWidth:1.75,dash:[],fill:'#f7f7f7',hatch:'diagonal',defaultGeometry:'closed-area',defaultLabel:'CONCRETE'},
  sidewalk:{id:'surface-sidewalk',stroke:'#555555',lineWidth:1.5,dash:[],fill:'#fafafa',hatch:'sparse-dots',defaultGeometry:'closed-area',defaultLabel:'SIDEWALK'},
  fence:{id:'fence-default',stroke:'#111111',lineWidth:2,dash:[7,4],fill:'transparent',hatch:'none',defaultGeometry:'open-path',defaultLabel:'FENCE'},
  'general-line':{id:'reference-line',stroke:'#555555',lineWidth:1.5,dash:[4,4],fill:'transparent',hatch:'none',defaultGeometry:'open-path',defaultLabel:'REFERENCE'},
};

const fenceStyles:Record<FenceTypeV3,Partial<FeatureStyleDefinition>>={
  iron:{id:'fence-iron',dash:[2,3],lineWidth:2.25},metal:{id:'fence-metal',dash:[],lineWidth:2},stucco:{id:'fence-stucco',dash:[],lineWidth:4},wood:{id:'fence-wood',dash:[10,4],lineWidth:2.5},'chain-link':{id:'fence-chain-link',dash:[3,3],lineWidth:2},privacy:{id:'fence-privacy',dash:[12,3],lineWidth:3},masonry:{id:'fence-masonry',dash:[],lineWidth:5},other:{id:'fence-other',dash:[7,4],lineWidth:2},
};

export function styleForKind(kind:FeatureKind){return structuredClone(styles[kind])}
export function styleForFeature(feature:Pick<MeasuredFeatureV3,'kind'|'semantics'>):FeatureStyleDefinition{
  const base=styleForKind(feature.kind);if(feature.kind!=='fence')return base;return{...base,...fenceStyles[feature.semantics.fenceType??'other']};
}

export function defaultSemantics(kind:FeatureKind,name?:string):FeatureSemantics{
  const style=styles[kind],label=(name?.trim()||style.defaultLabel).toUpperCase();
  if(kind==='fence')return{label,labelVisible:true,covered:false,enclosed:false,fenceType:'other'};
  const material:SurfaceMaterialV3|undefined=kind==='concrete'||kind==='sidewalk'||kind==='porch'?'concrete':kind==='carport'?'unknown':undefined;
  return{label,labelVisible:true,covered:kind==='carport',enclosed:kind==='house'||kind==='other-building',...(material?{material}:{})};
}

export function defaultGeometry(kind:FeatureKind){return styles[kind].defaultGeometry}
export function validateFeatureSemantics(feature:MeasuredFeatureV3):string[]{
  const errors:string[]=[];
  if(feature.kind==='fence'&&feature.geometry!=='open-path')errors.push('Fences use open-path geometry unless an enclosure workflow is explicitly added.');
  if(feature.kind==='general-line'&&feature.geometry!=='open-path')errors.push('General reference lines must remain open paths.');
  if(['house','other-building','carport','porch','concrete','sidewalk'].includes(feature.kind)&&feature.geometry!=='closed-area')errors.push(`${feature.kind.replaceAll('-',' ')} normally requires closed-area geometry.`);
  if(feature.kind==='fence'&&!feature.semantics.fenceType)errors.push('Fence type is required.');
  if(feature.semantics.height!==undefined&&feature.semantics.height<=0)errors.push('Physical height must be greater than zero when provided.');
  return errors;
}

export function semanticLabel(feature:Pick<MeasuredFeatureV3,'kind'|'semantics'>){
  if(feature.kind==='fence'){const type=(feature.semantics.fenceType??'other').replaceAll('-',' ').toUpperCase();return feature.semantics.label||`${type} FENCE`}
  const suffix=feature.semantics.covered&&!feature.semantics.label.includes('COVERED')?' · COVERED':'';return`${feature.semantics.label}${suffix}`;
}
