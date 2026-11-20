import { ANSWER_SOURCES } from '../../../core/autopilot/autopilotModel';
import type { ReportAggregates } from '../../../core/reports/reportModel';
import type { components } from '../schema';
import type { NarrativeReportView, ReportView } from '../views';
import type { ApiDtoAdapter } from './ApiDtoAdapter';
import { InvalidDtoError } from './InvalidDtoError';

type ReportDto = components['schemas']['Report'];
type NarrativeDto = components['schemas']['NarrativeReport'];

/**
 * The server builds `aggregates` from SQL rows, so every number is read defensively: a missing or
 * non-numeric count is 0, and a missing level is null (a period with no readings has none).
 */
function count(value: unknown): number {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? number : 0;
}

function level(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? number : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
      )
    : [];
}

export function toReportAggregates(dto: ReportDto['aggregates']): ReportAggregates {
  const levels: Record<string, unknown> = { ...dto.levels };
  return {
    levels: {
      readings: count(levels.readings),
      min: level(levels.min_level),
      max: level(levels.max_level),
      avg: level(levels.avg_level),
    },
    shifts: rows(dto.shifts_by_sector).map((row) => ({
      sector: text(row.sector),
      planned: count(row.planned),
      plannedHours: count(row.planned_hours),
      completed: count(row.completed),
      partial: count(row.partial),
      notExecuted: count(row.not_executed),
    })),
    commands: rows(dto.valve_commands).map((row) => ({
      origin: text(row.origin),
      status: text(row.status),
      total: count(row.total),
    })),
    decisions: rows(dto.autopilot_decisions).map((row) => ({
      source: text(row.source),
      action: text(row.action),
      status: text(row.status),
      total: count(row.total),
    })),
    incidents: rows(dto.incidents).map((row) => ({
      category: text(row.category),
      status: text(row.status),
      total: count(row.total),
    })),
    anomalies: rows(dto.anomalies).map((row) => ({
      kind: text(row.kind),
      total: count(row.total),
    })),
  };
}

export function toReport(adapter: ApiDtoAdapter, dto: ReportDto): ReportView {
  return {
    from: adapter.toTimestamp('from', dto.from),
    to: adapter.toTimestamp('to', dto.to),
    ...toReportAggregates(dto.aggregates),
  };
}

export function toNarrativeReport(adapter: ApiDtoAdapter, dto: NarrativeDto): NarrativeReportView {
  const source = ANSWER_SOURCES.find((code) => code === dto.source);
  if (source === undefined) {
    throw new InvalidDtoError('source');
  }
  return {
    source,
    model: dto.model,
    generatedAt: adapter.toTimestamp('generated_at', dto.generated_at),
    title: dto.title,
    summary: dto.summary,
    findings: dto.findings,
    recommendations: dto.recommendations,
    markdown: dto.markdown,
  };
}
