import type { components } from '../schema';
import type { ForecastEvaluationView } from '../views';

type ForecastEvaluationDto = components['schemas']['ForecastEvaluation'];

/**
 * Maps the evaluation of one horizon (API.md 14.1) to the screen. Numbers come as JSON numbers;
 * the screen formats them with decimal comma. Fields the server leaves out stay null.
 */
export function toForecastEvaluation(dto: ForecastEvaluationDto): ForecastEvaluationView {
  return {
    horizonDays: dto.horizon_days,
    from: dto.from,
    to: dto.to,
    n: dto.n,
    maeIa: dto.mae_ia ?? null,
    maeSimple: dto.mae_simple ?? null,
    wqlIa: dto.wql_ia ?? null,
    coverage80: dto.coverage_80 ?? null,
    avgIntervalWidth: dto.avg_interval_width ?? null,
    skill: dto.skill ?? null,
    helps: dto.helps ?? null,
    isSimulated: dto.is_simulated,
  };
}
