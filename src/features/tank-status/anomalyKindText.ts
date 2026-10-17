import { t } from '../../i18n/t';
import type { AnomalyKind } from '../../services/api/views';

/** The plain-language name of each anomaly kind (API.md 9.1). */
export function anomalyKindText(kind: AnomalyKind): string {
  switch (kind) {
    case 'POSSIBLE_LEAK':
      return t('anomalies.kindPossibleLeak');
    case 'SENSOR_FAULT':
      return t('anomalies.kindSensorFault');
    case 'STALE_DATA':
      return t('anomalies.kindStaleData');
    case 'SUSPECTED_DUPLICATE':
      return t('anomalies.kindSuspectedDuplicate');
    case 'ABNORMAL_DROP':
      return t('anomalies.kindAbnormalDrop');
  }
}
