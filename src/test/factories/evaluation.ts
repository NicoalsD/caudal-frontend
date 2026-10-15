import type { components } from '../../services/api/schema';

export type ForecastEvaluationDto = components['schemas']['ForecastEvaluation'];

/**
 * The evaluation of one horizon as GET /forecast-evaluation answers it (API.md 14.1): the AI is
 * better than the simple estimate with 34 forecasts and a coverage inside 70 % to 90 %.
 */
export function buildForecastEvaluation(
  overrides: Partial<ForecastEvaluationDto> = {},
): ForecastEvaluationDto {
  return {
    horizon_days: 1,
    from: '2026-07-17',
    to: '2026-10-14',
    n: 34,
    mae_ia: 0.12,
    mae_simple: 0.15,
    wql_ia: 0.2,
    coverage_80: 0.76,
    avg_interval_width: 0.5,
    skill: 0.2,
    helps: true,
    verdict: 'La IA ayuda: se equivoca menos que la estimación simple.',
    is_simulated: true,
    banner: 'Datos simulados',
    ...overrides,
  };
}
