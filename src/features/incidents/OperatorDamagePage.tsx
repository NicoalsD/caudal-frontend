import type { JSX } from 'react';
import { useNavigate } from 'react-router';

import {
  INCIDENT_DESCRIPTION_CONSTRAINT,
  INCIDENT_LOCATION_CONSTRAINT,
  operatorDamageFormSchema,
} from '../../core/forms/formSchemas';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import type { IncidentInput } from '../../services/api/views';
import { useConstraints } from '../../state/hooks/useConstraints';
import { useDamageCategories } from '../../state/hooks/useDamageCategories';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import { useSectors } from '../../state/hooks/useSectors';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { OperatorDamageForm } from './OperatorDamageForm';
import { useCreateIncident } from './incidentQueries';

/** Screen S11: a plumber reports a damage seen in the field; the Board reads it in Incidentes. */
export function OperatorDamagePage(): JSX.Element {
  const constraints = useConstraints();
  const schema = useFormSchema(operatorDamageFormSchema);
  const categories = useDamageCategories();
  const sectors = useSectors();
  const create = useCreateIncident();
  const navigate = useNavigate();

  if (schema.status === 'loading' || categories.isPending || sectors.isPending) {
    return (
      <>
        <ScreenTitle>{t('screens.operatorDamage')}</ScreenTitle>
        <LoadingState message={t('operatorDamage.loading')} />
      </>
    );
  }
  const descriptionMax = constraints.data?.[INCIDENT_DESCRIPTION_CONSTRAINT]?.max;
  if (schema.status !== 'ready' || descriptionMax === undefined) {
    return (
      <ErrorState
        title={t('screens.operatorDamage')}
        message={t('connection.constraintsMissing')}
      />
    );
  }
  if (categories.isError || sectors.isError) {
    return (
      <ErrorState title={t('screens.operatorDamage')} message={t('operatorDamage.loadError')} />
    );
  }

  const send = async (input: IncidentInput): Promise<void> => {
    await create.mutateAsync(input);
    void navigate(ROUTE_PATHS.operator.home, { state: { damageSent: true } });
  };

  return (
    <>
      <ScreenTitle>{t('screens.operatorDamage')}</ScreenTitle>
      <OperatorDamageForm
        schema={schema.schema}
        categories={categories.data}
        sectors={sectors.data}
        descriptionMax={descriptionMax}
        locationMax={constraints.data?.[INCIDENT_LOCATION_CONSTRAINT]?.max}
        onSubmit={send}
      />
    </>
  );
}
