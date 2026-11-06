import { describe,expect,it } from 'vitest';
import { FIELD_LAYOUT_CONTRACT,MIN_TOUCH_TARGET_PX,PORTRAIT_BREAKPOINT_PX,TABLET_BREAKPOINT_PX } from './fieldUsability';
describe('tablet field-layout safeguards',()=>{
  it('defines field controls at the platform-standard minimum touch size',()=>{expect(MIN_TOUCH_TARGET_PX).toBeGreaterThanOrEqual(44)});
  it('keeps canvas and numerical entry available in portrait',()=>{expect(TABLET_BREAKPOINT_PX).toBeGreaterThan(PORTRAIT_BREAKPOINT_PX);expect(FIELD_LAYOUT_CONTRACT.portrait).toEqual(['canvas','entry-panel']);expect(FIELD_LAYOUT_CONTRACT.numericEditingRequired).toBe(true)});
  it('does not rely on hover-only field controls',()=>{expect(FIELD_LAYOUT_CONTRACT.hoverOnlyControls).toBe(false);expect(FIELD_LAYOUT_CONTRACT.landscape).toContain('canvas')});
});
