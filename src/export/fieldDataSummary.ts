import { jsPDF } from 'jspdf';
import type {
  JobInfo,
  MeasuredFence,
  MeasuredStructure,
  MeasuredSurface,
  MeasurementRecord,
  OffsetMeasurement,
  ProjectWarning,
  RoadMeasurement,
} from '../types';

export interface FieldSummaryData {
  job: JobInfo;
  structures: MeasuredStructure[];
  fences: MeasuredFence[];
  surfaces: MeasuredSurface[];
  offsets: OffsetMeasurement[];
  roads: RoadMeasurement[];
  measurements: MeasurementRecord[];
  warnings: ProjectWarning[];
  sketchDataUrl: string;
}

export function saveFieldDataSummaryPdf(data: FieldSummaryData, filename: string) {
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 42;
  const contentWidth = 528;
  const pageHeight = 792;
  let y = 42;

  const header = (continued = false) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor('#173b32');
    pdf.text('ILR Sketch — Field Data Summary', margin, y);
    y += 20;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor('#66766f');
    pdf.text(
      continued
        ? `${data.job.jobName} · continued`
        : 'For drafting reference — not a legal report or certification',
      margin,
      y,
    );
    y += 22;
  };

  const newPage = () => {
    pdf.addPage();
    y = 42;
    header(true);
  };
  const ensure = (height: number) => {
    if (y + height > pageHeight - 45) newPage();
  };
  const section = (title: string) => {
    ensure(35);
    pdf.setFillColor('#e8f0ed');
    pdf.roundedRect(margin, y - 12, contentWidth, 23, 4, 4, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor('#173b32');
    pdf.text(title, margin + 8, y + 3);
    y += 25;
  };
  const line = (label: string, value?: string) => {
    if (!value) return;
    ensure(15);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor('#3e4d47');
    pdf.text(`${label}:`, margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, margin + 105, y, { maxWidth: contentWidth - 105 });
    y += 14;
  };
  const row = (cells: string[], widths: number[]) => {
    const text = cells.map((cell, index) =>
      pdf.splitTextToSize(cell || '—', widths[index] - 8),
    );
    const rowHeight = Math.max(...text.map((cell) => cell.length)) * 10 + 6;
    ensure(rowHeight);
    let x = margin;
    text.forEach((cell, index) => {
      pdf.setDrawColor('#d9e0dc');
      pdf.rect(x, y - rowHeight + 4, widths[index], rowHeight);
      pdf.setFontSize(8);
      pdf.text(cell, x + 4, y - rowHeight + 14);
      x += widths[index];
    });
    y += 2;
  };
  const tableHeader = (cells: string[], widths: number[]) => {
    ensure(22);
    let x = margin;
    pdf.setFillColor('#f2f4f2');
    pdf.setFont('helvetica', 'bold');
    cells.forEach((cell, index) => {
      pdf.rect(x, y - 12, widths[index], 19, 'F');
      pdf.text(cell, x + 4, y);
      x += widths[index];
    });
    y += 17;
  };

  const notes: string[] = [];
  header();
  section('Job information');
  const jobRows: Array<[string, string | undefined]> = [
    ['Job name', data.job.jobName],
    ['Project ID', data.job.projectId],
    ['Job number', data.job.jobNumber],
    ['Address', data.job.address],
    ['Client', data.job.client],
    ['Prepared for', data.job.preparedFor],
    ['Buyer', data.job.buyer],
    ['Title company', data.job.titleCompany],
    ['Lender', data.job.lender],
    ['Field worker', data.job.fieldWorker],
    ['Inspection date', data.job.inspectionDate ?? data.job.date],
  ];
  jobRows.forEach(([label, value]) => line(label, value));

  section('Current sketch');
  ensure(295);
  try {
    pdf.addImage(data.sketchDataUrl, 'PNG', margin, y, contentWidth, 280);
    y += 295;
  } catch {
    line('Sketch', 'Preview unavailable');
  }

  section('Structure measurement table');
  data.structures.forEach((structure) => {
    line('Structure', `${structure.name} · ${structure.type}`);
    tableHeader(['Wall', 'Entered', 'Adjusted', 'Direction', 'Verified'], [45, 80, 80, 225, 98]);
    structure.segments.forEach((segment) => {
      row(
        [
          String(segment.sequence),
          segment.label,
          segment.adjustedLength === undefined
            ? '—'
            : `${Number(segment.adjustedLength.toFixed(2))}'`,
          segment.directionMode === 'absolute'
            ? `${segment.angle ?? 0}° absolute`
            : `${segment.turn ?? 'right'} ${segment.turnAngle ?? 90}°`,
          segment.verified ? 'Yes' : 'No',
        ],
        [45, 80, 80, 225, 98],
      );
      if (segment.notes) notes.push(`${structure.name}, Wall ${segment.sequence}: ${segment.notes}`);
    });
    y += 10;
  });
  if (!data.structures.length) line('Status', 'No measured structures entered');

  section('Fence list');
  tableHeader(['Fence', 'Type', 'Segments', 'Height', 'Gates'], [155, 145, 75, 75, 78]);
  data.fences.forEach((fence) => {
    row(
      [fence.name, fence.type.replaceAll('-', ' '), String(fence.segments.length), fence.height ? `${fence.height}'` : '—', String(fence.gates.length)],
      [155, 145, 75, 75, 78],
    );
    if (fence.notes) notes.push(`${fence.name}: ${fence.notes}`);
  });

  section('Surface list');
  tableHeader(['Surface', 'Type', 'Geometry', 'Material', 'State'], [125, 115, 105, 100, 83]);
  data.surfaces.forEach((surface) => {
    row([surface.name, surface.type.replaceAll('-', ' '), surface.geometryMode, surface.material, surface.areaState], [125, 115, 105, 100, 83]);
    if (surface.notes) notes.push(`${surface.name}: ${surface.notes}`);
  });

  section('Offset list');
  tableHeader(['Label', 'Measured', 'Calculated', 'Difference', 'Verified'], [160, 90, 90, 100, 88]);
  data.offsets.forEach((offset) => {
    const calculated = offset.calculatedValue;
    row(
      [
        offset.label,
        `${offset.measuredValue}'`,
        calculated === undefined ? '—' : `${Number(calculated.toFixed(2))}'`,
        calculated === undefined ? '—' : `${Number(Math.abs(offset.measuredValue - calculated).toFixed(2))}'`,
        offset.verified ? 'Yes' : 'No',
      ],
      [160, 90, 90, 100, 88],
    );
  });

  section('Road measurements');
  tableHeader(['Street', 'BOC to BOC', 'Graphical', 'Angle', 'Verified'], [190, 95, 95, 70, 78]);
  data.roads.forEach((road) => row([road.streetName, `${road.measuredWidth}'`, `${Number(road.graphicalWidth.toFixed(2))}'`, `${road.roadAngle}°`, road.verified ? 'Yes' : 'No'], [190, 95, 95, 70, 78]));

  section('Unassigned measurements');
  data.measurements
    .filter((measurement) => !measurement.assigned)
    .forEach((measurement) =>
      line(measurement.measurementText, `${measurement.featureType}${measurement.note ? ` · ${measurement.note}` : ''}`),
    );

  section(`Warnings (${data.warnings.length})`);
  data.warnings.forEach((warning) => line(warning.level.toUpperCase(), warning.message));

  section('Notes');
  if (data.job.notes) notes.unshift(`Job notes: ${data.job.notes}`);
  notes.forEach((note, index) => line(String(index + 1), note));
  if (!notes.length) line('Status', 'No notes entered');

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFontSize(8);
    pdf.setTextColor('#7a8782');
    pdf.text(`ILR Sketch · Page ${page} of ${pageCount}`, 570, 768, { align: 'right' });
  }
  pdf.save(filename);
}
