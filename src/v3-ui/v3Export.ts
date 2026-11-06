import { jsPDF } from 'jspdf';
import { buildFieldReviewSummary } from '../v3/reviewSummary';
import type { ProjectV3 } from '../v3/types';

const safe=(value:string)=>(value||'untitled-ilr-sketch').trim().replace(/[^a-z0-9]+/gi,'-').toLowerCase();
export function saveSketchPng(project:ProjectV3,dataUrl:string){download(`${safe(project.job.jobName)}.png`,dataUrl)}

export function saveDrawingPdf(project:ProjectV3,dataUrl:string){
  const pdf=new jsPDF({orientation:'landscape',unit:'pt',format:'letter'}),width=pdf.internal.pageSize.getWidth(),height=pdf.internal.pageSize.getHeight();header(pdf,project,'FIELD SKETCH');pdf.setDrawColor(174,187,180);pdf.rect(28,82,width-56,height-160);pdf.addImage(dataUrl,'PNG',36,90,width-72,height-176,undefined,'FAST');titleBlock(pdf,project,height-65,width);pdf.save(`${safe(project.job.jobName)}-field-sketch.pdf`);
}

export function saveFieldSummaryPdf(project:ProjectV3,dataUrl:string){
  const summary=buildFieldReviewSummary(project),pdf=new jsPDF({unit:'pt',format:'letter'}),width=pdf.internal.pageSize.getWidth(),height=pdf.internal.pageSize.getHeight();let y=header(pdf,project,'FIELD DATA SUMMARY');
  const ensure=(needed=60)=>{if(y+needed<height-42)return;pdf.addPage();y=header(pdf,project,'FIELD DATA SUMMARY · CONTINUED')};
  const heading=(text:string)=>{ensure(45);pdf.setTextColor(30,78,63);pdf.setFont('helvetica','bold');pdf.setFontSize(12);pdf.text(text,36,y);y+=18};
  const row=(left:string,right='')=>{ensure(18);pdf.setTextColor(47,61,55);pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text(left,42,y);if(right)pdf.text(right,width-42,y,{align:'right'});y+=14};
  heading('Job information');row(`Project ID: ${project.projectId}`,`Inspection: ${project.job.inspectionDate||'—'}`);row(`Address: ${project.job.address||'—'}`);row(`Client: ${project.job.client||'—'}`,`Field worker: ${project.job.fieldWorker||'—'}`);if(project.job.notes)row(`Notes: ${project.job.notes}`);
  heading('Current sketch');ensure(240);pdf.setDrawColor(205,215,210);pdf.rect(36,y,width-72,220);pdf.addImage(dataUrl,'PNG',42,y+6,width-84,208,undefined,'FAST');y+=238;
  heading('Roads and curb ties');summary.roads.forEach(road=>row(`${road.name} · ${road.role} · ${road.width.toFixed(2)}' BOC–BOC`,`${road.ties} ties · ${road.verifiedTies} verified`));
  if(summary.house){heading('Residence measurements');row(`${summary.house.walls} walls · ${summary.house.verifiedWalls} verified`,`Closure: ${summary.house.closureStatus} · ${summary.house.closureError.toFixed(2)}'`);const house=project.features.find(item=>item.id===summary.house!.id)!;house.segments.forEach((segment,index)=>row(`Wall ${index+1}   ${segment.length.toFixed(2)}'${segment.note?` · ${segment.note}`:''}`,segment.verified?'Verified':'Unverified'))}
  heading('Improvements');if(!summary.improvements.length)row('None entered.');summary.improvements.forEach(feature=>row(`${feature.name} · ${feature.kind.replaceAll('-',' ')} · ${feature.segments} segments`,feature.open?'OPEN / REVIEW':'Complete'));
  heading('Warnings and accepted discrepancies');const allWarnings=project.warnings;if(!allWarnings.length)row('No warnings recorded.');allWarnings.forEach(warning=>row(`${warning.level.toUpperCase()}: ${warning.message}`,warning.accepted?'Accepted':'Review'));
  heading('Field checklist');summary.checklist.forEach(item=>row(`${item.complete?'✓':'○'}  ${item.label}`));
  heading('General notes');row(project.notes.map(note=>note.text).join(' · ')||'No general notes.');
  ensure(55);pdf.setTextColor(93,105,99);pdf.setFontSize(8);pdf.text('This is a field-data collection sketch for drafting support. It is not a certified boundary survey, legal description, or final Improvement Location Report.',36,y,{maxWidth:width-72});pdf.save(`${safe(project.job.jobName)}-field-data-summary.pdf`);
}

function header(pdf:jsPDF,project:ProjectV3,title:string){const width=pdf.internal.pageSize.getWidth();pdf.setFillColor(28,78,63);pdf.rect(0,0,width,62,'F');pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(18);pdf.text(project.job.jobName||'ILR Sketch',30,27);pdf.setFontSize(9);pdf.setFont('helvetica','normal');pdf.text(`${title} · ${project.projectId}`,30,44);return 88}
function titleBlock(pdf:jsPDF,project:ProjectV3,y:number,width:number){pdf.setDrawColor(167,180,174);pdf.rect(28,y,width-56,38);pdf.setTextColor(42,58,51);pdf.setFontSize(8);pdf.text(`ADDRESS  ${project.job.address||'—'}`,38,y+14);pdf.text(`CLIENT  ${project.job.client||'—'}`,280,y+14);pdf.text(`DATE  ${project.job.inspectionDate||'—'}`,510,y+14);pdf.setTextColor(102,115,109);pdf.text('FIELD SKETCH · NOT A CERTIFIED BOUNDARY SURVEY',38,y+29)}
function download(name:string,url:string){const link=document.createElement('a');link.download=name;link.href=url;link.click()}
