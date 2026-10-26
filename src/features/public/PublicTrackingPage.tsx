import { useForm, useWatch } from 'react-hook-form';
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
import { normalizeTrackingCodeInput } from '../../core/public/trackingCode';
import type { ReportStatus } from '../../core/incidents/reportStatus';
import { ReportStatusBadge } from '../../ui/feedback/ReportStatusBadge';
import styles from './PublicSchedule.module.css';
import { usePublicDamageReport } from './publicQueries';

const NOT_FOUND_CODE = 'NOT_FOUND';
const VALIDATION_CODE = 'VALIDATION_ERROR';
const TRACKING_CODE_CONSTRAINT = 'tracking_code';

/** What each status means for the family, in plain words (keys of es.ts). */
const STATUS_HELP_KEY = {
  REPORTED: 'publicTracking.statusHelp.received',
  VERIFYING: 'publicTracking.statusHelp.verifying',
  CONFIRMED: 'publicTracking.statusHelp.confirmed',
  RESOLVED: 'publicTracking.statusHelp.resolved',
  DISMISSED: 'publicTracking.statusHelp.dismissed',
} as const satisfies Readonly<Record<ReportStatus, string>>;

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
      {/* Announces the result when a new search runs on the same screen. */}
      <div aria-live="polite">
        {trackingCode === undefined || trackingCode === '' ? null : (
          <TrackingResult code={trackingCode} />
        )}
      </div>
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
  const { register, handleSubmit, formState, control } = useForm<TrackingValues>({
    resolver: formResolver<TrackingValues>(schema),
    mode: 'onSubmit',
    defaultValues: { tracking_code: initialCode },
  });
  const { errors, isSubmitting } = formState;
  const codeField = register(TRACKING_CODE_FIELD);
  const typed = useWatch({ control, name: TRACKING_CODE_FIELD }) ?? '';
  const submit = handleSubmit((values) => {
    onSearch(normalizeTrackingCodeInput(values.tracking_code));
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
          {...codeField}
          onChange={(event) => {
            // The code is cleaned as it is typed: no spaces, no hyphens, upper case.
            event.currentTarget.value = normalizeTrackingCodeInput(event.currentTarget.value);
            void codeField.onChange(event);
          }}
        />
        <p className={cn(styles.hint)} aria-live="polite">
          {t('publicTracking.codeTyped', {
            length: String(typed.length),
            max: String(codeLength),
          })}
        </p>
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
      <div className={cn(styles.trackingStatus)}>
        <ReportStatusBadge status={report.data.status} />
        <p className={cn(styles.statusHelp)}>{t(STATUS_HELP_KEY[report.data.status])}</p>
        <p className={cn(styles.hint)}>
          {t('publicTracking.reportedAt', { date: report.data.reportedAt.text })}
        </p>
        <p className={cn(styles.hint)}>
          {t('publicTracking.updatedAt', { date: report.data.updatedAt.text })}
        </p>
      </div>
    </section>
  );
}
