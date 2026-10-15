import { useState } from 'react';
import type { JSX } from 'react';
import { generatePath, Link, useParams } from 'react-router';

import {
  INCIDENT_DESCRIPTION_CONSTRAINT,
  INCIDENT_LOCATION_CONSTRAINT,
  damageReportFormSchema,
} from '../../core/forms/formSchemas';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import type { DamageReportInput, DamageReportReceiptView } from '../../services/api/views';
import { useConstraints } from '../../state/hooks/useConstraints';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { cn } from '../../ui/styles/cn';
import { DamageReportForm } from './DamageReportForm';
import styles from './PublicSchedule.module.css';
import { useCreateDamageReport, useDamageCategories } from './publicQueries';

/** Screen S05: the report form, then the tracking code shown once. */
export function DamageReportPage(): JSX.Element {
  const { aqueductSlug = '' } = useParams();
  const constraints = useConstraints();
  const schema = useFormSchema(damageReportFormSchema);
  const categories = useDamageCategories();
  const create = useCreateDamageReport(aqueductSlug);
  const [receipt, setReceipt] = useState<DamageReportReceiptView | null>(null);

  if (receipt !== null) {
    return <DamageReceipt receipt={receipt} />;
  }
  if (schema.status === 'loading' || categories.isPending || constraints.isPending) {
    return <LoadingState message={t('publicReport.loading')} />;
  }
  const descriptionMax = constraints.data?.[INCIDENT_DESCRIPTION_CONSTRAINT]?.max;
  if (schema.status !== 'ready' || categories.isError || descriptionMax === undefined) {
    return (
      <ErrorState
        title={t('publicReport.title')}
        message={
          categories.isError
            ? t('publicReport.categoriesError')
            : t('connection.constraintsMissing')
        }
      />
    );
  }

  const send = async (input: DamageReportInput): Promise<void> => {
    setReceipt(await create.mutateAsync(input));
  };

  return (
    <>
      <ScreenTitle>{t('publicReport.title')}</ScreenTitle>
      <DamageReportForm
        schema={schema.schema}
        categories={categories.data}
        descriptionMax={descriptionMax}
        locationMax={constraints.data?.[INCIDENT_LOCATION_CONSTRAINT]?.max}
        onSubmit={send}
      />
    </>
  );
}

function DamageReceipt({ receipt }: { readonly receipt: DamageReportReceiptView }): JSX.Element {
  const trackingPath = generatePath(ROUTE_PATHS.public.tracking, {
    trackingCode: receipt.trackingCode,
  });
  return (
    <section>
      <ScreenTitle>{t('publicReport.receiptTitle')}</ScreenTitle>
      <p className={cn(styles.codeLabel)}>{t('publicReport.codeLabel')}</p>
      <p className={cn(styles.code)}>{receipt.trackingCode}</p>
      <p>{t('publicReport.saveCode')}</p>
      <Link className={cn(styles.linkButton)} to={trackingPath}>
        {t('publicReport.checkStatus')}
      </Link>
    </section>
  );
}
