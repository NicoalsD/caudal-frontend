import { useMemo, useState } from 'react';
import type { ChangeEvent, JSX } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { DomainError } from '../../core/errors/DomainError';
import { parseCsv } from '../../core/imports/csvTable';
import { toReadingImportFile } from '../../core/imports/readingImport';
import type { ReadingImportRow } from '../../core/imports/readingImport';
import { IMPORT_PREVIEW_ROWS } from '../../core/policy/clientPolicy';
import { formatDecimal } from '../../core/format/decimal';
import { formatDateTime } from '../../core/format/time';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { useSession } from '../../state/hooks/useSession';
import { ReadingImporter } from '../../state/ReadingImporter';
import type { ReadingImportSummary } from '../../state/ReadingImporter';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { SimulatedDataBanner } from '../../ui/feedback/SimulatedDataBanner';
import { Button } from '../../ui/primitives/Button';
import { formResolver } from '../../ui/primitives/formResolver';
import { FormFields } from '../../ui/primitives/FormFields';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import { sha256Hex } from '../../services/crypto/sha256Hex';
import styles from './ImportPage.module.css';
import { TableScroll } from '../../ui/primitives/TableScroll';

const INTEGER_TEXT = /^\d+$/;

interface ImportFormValues {
  scenario_name: string;
  seed: string;
  simulator_version: string;
}

interface ImportFormOutput {
  scenario_name: string;
  seed: number;
  simulator_version: string;
}

/** Presence and the seed's form only: the length limits are the server's (API.md 17). */
function importFormSchema() {
  return z.object({
    scenario_name: z.string().trim().min(1, t('validation.required')),
    seed: z
      .string()
      .trim()
      .regex(INTEGER_TEXT, t('imports.seedInvalid'))
      .transform((value) => Number(value)),
    simulator_version: z.string().trim().min(1, t('validation.required')),
  });
}

interface Preview {
  readonly fileName: string;
  readonly rows: readonly ReadingImportRow[];
}

/**
 * Screen S27: loads simulated history into the demo aqueduct (API.md 17). The file is read in the
 * browser only to show how many rows it has and the first ones; the server checks every row.
 */
export function ImportPage(): JSX.Element {
  const api = useCaudalApi();
  const session = useSession();
  const importer = useMemo(() => new ReadingImporter(api.imports, sha256Hex), [api]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null);
  const [summary, setSummary] = useState<ReadingImportSummary | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ImportFormValues, unknown, ImportFormOutput>({
    resolver: formResolver<ImportFormValues, ImportFormOutput>(importFormSchema()),
    mode: 'onSubmit',
    defaultValues: { scenario_name: '', seed: '', simulator_version: '' },
  });

  const onFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    setSummary(null);
    setFailure(null);
    if (file === undefined) {
      setPreview(null);
      setFileError(null);
      return;
    }
    try {
      const parsed = toReadingImportFile(parseCsv(await file.text()));
      if (parsed.missingColumns.length > 0) {
        setPreview(null);
        setFileError(t('imports.missingColumns', { columns: parsed.missingColumns.join(', ') }));
      } else if (parsed.rows.length === 0) {
        setPreview(null);
        setFileError(t('imports.noRows'));
      } else {
        setFileError(null);
        setPreview({ fileName: file.name, rows: parsed.rows });
      }
    } catch {
      setPreview(null);
      setFileError(t('imports.unreadable'));
    }
  };

  const submit = handleSubmit(async (values) => {
    if (preview === null || session.status !== 'authenticated') {
      return;
    }
    setSummary(null);
    setFailure(null);
    try {
      const result = await importer.run(
        {
          aqueductId: session.user.aqueductId,
          scenarioName: values.scenario_name,
          seed: values.seed,
          simulatorVersion: values.simulator_version,
        },
        preview.rows,
        (sent, total) => {
          setProgress({ sent, total });
        },
      );
      setSummary(result);
    } catch (error) {
      setFailure(errorText(error).message);
    } finally {
      setProgress(null);
    }
  });

  const sample = preview?.rows.slice(0, IMPORT_PREVIEW_ROWS) ?? [];
  return (
    <div className={cn(styles.stack)}>
      <ScreenTitle>{t('screens.imports')}</ScreenTitle>
      <SimulatedDataBanner />
      <p>{t('imports.intro')}</p>
      <div className={cn(styles.field)}>
        <label htmlFor="import-file" className={cn(styles.label)}>
          {t('imports.fileLabel')}
        </label>
        <p className={cn(styles.hint)}>{t('imports.fileHint')}</p>
        <input
          id="import-file"
          type="file"
          accept=".csv,text/csv"
          className={cn(styles.file)}
          onChange={(event) => void onFile(event)}
        />
      </div>
      {fileError === null ? null : <FormAlert message={fileError} />}
      {preview === null ? null : (
        <section aria-labelledby="import-preview-title" className={cn(styles.preview)}>
          <h2 id="import-preview-title">
            {t('imports.preview', { name: preview.fileName, count: String(preview.rows.length) })}
          </h2>
          <TableScroll
            label={t('imports.sampleCaption', { count: String(sample.length) })}
            className={cn(styles.tableWrap)}
          >
            <table>
              <caption>{t('imports.sampleCaption', { count: String(sample.length) })}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('imports.colTime')}</th>
                  <th scope="col">{t('imports.colLevel')}</th>
                  <th scope="col">{t('imports.colWater')}</th>
                  <th scope="col">{t('imports.colDamage')}</th>
                </tr>
              </thead>
              <tbody>
                {sample.map((row) => (
                  <tr key={row.id}>
                    <td>{timeText(row.observed_at)}</td>
                    <td>{levelText(row.gauge_value)}</td>
                    <td>{row.water_appearance_code}</td>
                    <td>{row.damage_noticed === true ? t('imports.yes') : t('imports.no')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </section>
      )}
      <form onSubmit={(event) => void submit(event)} noValidate aria-busy={isSubmitting}>
        <FormFields disabled={isSubmitting}>
          <TextField
            label={t('imports.scenarioLabel')}
            autoComplete="off"
            error={errors.scenario_name?.message}
            {...register('scenario_name')}
          />
          <TextField
            label={t('imports.seedLabel')}
            inputMode="numeric"
            autoComplete="off"
            error={errors.seed?.message}
            {...register('seed')}
          />
          <TextField
            label={t('imports.versionLabel')}
            autoComplete="off"
            error={errors.simulator_version?.message}
            {...register('simulator_version')}
          />
          <div className={cn(styles.actions)}>
            <Button type="submit" variant="primary" disabled={preview === null || isSubmitting}>
              {isSubmitting ? t('imports.sending') : t('imports.submit')}
            </Button>
          </div>
        </FormFields>
      </form>
      <p role="status" className={cn(styles.status)}>
        {progress === null
          ? ''
          : t('imports.progress', { sent: String(progress.sent), total: String(progress.total) })}
      </p>
      {failure === null ? null : <FormAlert message={failure} />}
      {summary === null ? null : <ImportResult summary={summary} />}
    </div>
  );
}

/** Numbers read as the plumber writes them (decimal comma); unreadable text is shown as it is. */
function levelText(value: number | string): string {
  return typeof value === 'number' ? formatDecimal(value) : value;
}

function timeText(observedAt: string): string {
  try {
    return formatDateTime(observedAt);
  } catch {
    return observedAt;
  }
}

/** What the server kept. Rejected rows show their position and the plain-language reason. */
function ImportResult({ summary }: { readonly summary: ReadingImportSummary }): JSX.Element {
  const ruleSet = useCurrentRuleSet();
  const gauge = ruleSet.data?.gauge;
  const range =
    gauge === undefined
      ? {}
      : { gauge_min: formatDecimal(gauge.min), gauge_max: formatDecimal(gauge.max) };
  return (
    <section aria-labelledby="import-result-title" className={cn(styles.preview)}>
      <h2 id="import-result-title">{t('imports.resultTitle')}</h2>
      <p role="status">
        {t('imports.result', {
          received: String(summary.rowsReceived),
          accepted: String(summary.rowsAccepted),
          rejected: String(summary.rowsRejected),
        })}
      </p>
      {summary.alreadyImported === 0 ? null : (
        <p>{t('imports.alreadyImported', { count: String(summary.alreadyImported) })}</p>
      )}
      {summary.rejections.length === 0 ? null : (
        <ul className={cn(styles.list)}>
          {summary.rejections.map((item) => (
            <li key={`${item.row}-${item.code}`}>
              {t('imports.rejectionItem', {
                row: String(item.row),
                message: errorText(new DomainError(item.code, '', range)).message,
              })}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
