import { describe,expect,it } from 'vitest';
import { createFictionalSampleProject } from './sampleProject';
import { buildFieldReviewSummary } from './reviewSummary';
import { parseProjectV3, serializeProjectV3 } from './project';
import { resolveFeaturePath } from './featureWorkflow';
import { deriveApproximateCurbReturn } from './secondaryRoadWorkflow';
describe('Phase 1 completion record',()=>{it('saves, reopens, rebuilds, reviews, and retains the full measured sample',()=>{const original=createFictionalSampleProject(),reopened=parseProjectV3(serializeProjectV3(original)),house=reopened.features.find(item=>item.kind==='house')!,summary=buildFieldReviewSummary(reopened),secondary=reopened.roads.find(item=>item.role==='secondary')!;expect(resolveFeaturePath(reopened,house.id).points.length).toBe(house.segments.length+1);for(const feature of reopened.features)expect(()=>resolveFeaturePath(reopened,feature.id)).not.toThrow();expect(summary.roads).toHaveLength(2);expect(summary.house?.phase).toBe('complete');expect(deriveApproximateCurbReturn(reopened,secondary.id)?.measurementReference).toBe(false);expect(reopened.job.address).toContain('Fictional')})});
