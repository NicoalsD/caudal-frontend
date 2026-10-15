import { useForm } from 'react-hook-form';
import type { JSX } from 'react';
import { generatePath, useNavigate, useParams } from 'react-router';

import { DomainError } from '../../core/errors/DomainError';
import { NetworkError } from '../../core/errors/NetworkError';
import { trackingCodeFormSchema, TRACKING_CODE_FIELD } from '../../core/forms/formSchemas';
import { ROUTE_PATHS } from '../../core/session/routes';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { useConstraints } from '../../state/hooks/useConstraints';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { FormFields } from '../../ui/primitives/FormFields';
import { formResolver } from '../../ui/primitives/formResolver';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import { ReportStatusBadge } from './ReportStatusBadge';
import styles from './PublicSchedule.module.css';
import { usePublicDamageReport } from './publicQueries';

const NOT_FOUND_CODE = 'NOT_FOUND';
const VALIDATION_CODE = 'VALIDATION_ERROR';
const TRACKING_CODE_CONSTRAINT = 'tracking_code';

interface TrackingValues {
  readonly tracking_code: string;
}

/**
 * Screen S06: the entry form and, when a code is in the address, its status. The address keeps the
 * code, so a link to it can be shared with the person who reported.
 */
export function PublicTrackingPage(): JSX.Element {
  const { trackingCode } = useParams();
  const navigate = useNavigate();
  const constraints = useConstraints();
  const schema = useFormSchema(trackingCodeFormSchema);

  if (schema.status === 'loading' || constraints.isPending) {
    return <LoadingState message={t('publicTracking.loading')} />;
  }
  if (schema.status !== 'ready') {
    return (
      <ErrorState title={t('publicTracking.title')} message={t('connection.constraintsMissing')} />
    );
  }

  const search = (code: string): void => {
    void navigate(generatePath(ROUTE_PATHS.public.tracking, { trackingCode: code }));
  };
  const codeLength = constraints.data?.[TRACKING_CODE_CONSTRAINT]?.max ?? 0;

  return (
    <>
      <ScreenTitle>{t('publicTracking.title')}</ScreenTitle>
      <TrackingLookupForm
        schema={schema.schema}
        codeLength={codeLength}
        initialCode={trackingCode ?? ''}
        onSearch={search}
      />
      {trackingCode === undefined || trackingCode === '' ? null : (
        <TrackingResult code={trackingCode} />
      )}
    </>
  );
}

interface TrackingLookupFormProps {
  readonly schema: ReturnType<typeof trackingCodeFormSchema>;
  readonly codeLength: number;
  readonly initialCode: string;
  readonly onSearch: (code: string) => void;
}

function TrackingLookupForm({
  schema,
  codeLength,
  initialCode,
  onSearch,
}: TrackingLookupFormProps): JSX.Element {
  const { register, handleSubmit, formState } = useForm<TrackingValues>({
    resolver: formResolver<TrackingValues>(schema),
    mode: 'onSubmit',
    defaultValues: { tracking_code: initialCode },
  });
  const { errors, isSubmitting } = formState;
  const submit = handleSubmit((values) => {
    onSearch(values.tracking_code);
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate>
      <FormFields disabled={isSubmitting}>
        <p>{t('publicTracking.intro')}</p>
        <TextField
          label={t('publicTracking.codeLabel')}
          hint={t('publicTracking.codeHint', { length: String(codeLength) })}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          error={errors.tracking_code?.message}
          {...register(TRACKING_CODE_FIELD)}
        />
        <Button type="submit" variant="primary" className={cn(styles.submit)}>
          {t('publicTracking.lookup')}
        </Button>
      </FormFields>
    </form>
  );
}

function trackingErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return t('publicTracking.offline');
  }
  if (
    error instanceof DomainError &&
    (error.code === NOT_FOUND_CODE || error.code === VALIDATION_CODE)
  ) {
    return t('publicTracking.notFound');
  }
  return errorText(error).message || t('publicTracking.errorBody');
}

function TrackingResult({ code }: { readonly code: string }): JSX.Element {
  const report = usePublicDamageReport(code);

  if (report.isPending) {
    return <LoadingState message={t('publicTracking.loading')} />;
  }
  if (report.isError) {
    return <FormAlert message={trackingErrorMessage(report.error)} />;
  }
  return (
    <section aria-labelledby="tracking-status-heading">
      <h2 id="tracking-status-heading">{t('publicTracking.statusLabel')}</h2>
      <ReportStatusBadge status={report.data.status} />
      <p>{t('publicTracking.updatedAt', { date: report.data.updatedAt.text })}</p>
    </section>
  );
}
