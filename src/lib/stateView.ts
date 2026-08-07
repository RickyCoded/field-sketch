import type { MeasuredFence, MeasuredStructure, MeasurementRecord, OffsetMeasurement, RoadMeasurement } from '../types';
export interface SketchStateView{measuredEntities:MeasuredStructure[];measurementRecords:MeasurementRecord[];offsets:OffsetMeasurement[];fences:MeasuredFence[];roads:RoadMeasurement[]}
