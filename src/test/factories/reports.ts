import type { components } from '../../services/api/schema';

export type ReportDto = components['schemas']['Report'];
export type NarrativeReportDto = components['schemas']['NarrativeReport'];

/** Numbers of a period as the backend's SQL rows give them (shifts are grouped by sector name). */
export function buildReport(overrides: Partial<ReportDto> = {}): ReportDto {
  return {
    from: '2026-10-09T05:00:00Z',
    to: '2026-11-08T05:00:00Z',
    aggregates: {
      levels: { readings: 12, min_level: 1.1, max_level: 2.4, avg_level: 1.8 },
      shifts_by_sector: [
        {
          sector: 'Sector Escuela',
          planned: 4,
          planned_hours: 8,
          completed: 3,
          partial: 1,
          not_executed: 0,
        },
        {
          sector: 'Sector Alto',
          planned: 2,
          planned_hours: 4,
          completed: 1,
          partial: 0,
          not_executed: 1,
        },
      ],
      valve_commands: [
        { origin: 'MANUAL', status: 'ACKED', total: 3 },
        { origin: 'AUTOPILOT', status: 'ACKED', total: 2 },
      ],
      autopilot_decisions: [
        { source: 'RULES', action: 'OPEN', status: 'EXECUTED', total: 4 },
        { source: 'LLM', action: 'WAIT', status: 'EXPIRED', total: 1 },
      ],
      incidents: [{ category: 'LEAK', status: 'OPEN', total: 2 }],
      anomalies: [{ kind: 'STALE_DATA', total: 1 }],
    },
    ...overrides,
  };
}

export function buildNarrativeReport(
  overrides: Partial<NarrativeReportDto> = {},
): NarrativeReportDto {
  return {
    source: 'RULES',
    model: 'rules-v1',
    generated_at: '2026-11-08T10:00:00Z',
    title: 'Reporte del periodo',
    summary: 'El tanque se mantuvo estable.',
    findings: ['Un sector no recibió su turno.'],
    recommendations: ['Revisar la llave del sector Alto.'],
    markdown:
      '# Reporte\n\nEl tanque se mantuvo **estable**.\n\n- Primer hallazgo\n- Segundo hallazgo',
    ...overrides,
  };
}
