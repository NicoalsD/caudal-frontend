import { useMemo, useState } from 'react';
import type { JSX } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { draftRulesFormSchema } from '../../core/forms/formSchemas';
import {
  rowsToBands,
  rowsToSectors,
  sectorsToRows,
  toDraftFormValues,
} from '../../core/rules/draftForm';
import { sameSectorSettings } from '../../core/rules/sectorOrder';
import type { DraftFormOutput, DraftFormValues } from '../../core/rules/draftForm';
import type { RuleSetChanges } from '../../core/rules/ruleSetParts';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { validationMessages } from '../../i18n/validationMessages';
import type { RuleSetView, SectorView } from '../../services/api/views';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { formResolver } from '../../ui/primitives/formResolver';
import { cn } from '../../ui/styles/cn';
import { BandsEditor } from './BandsEditor';
import { SectorsEditor } from './SectorsEditor';
import styles from './Rules.module.css';
import { useSaveDraft } from './ruleQueries';

interface DraftEditorProps {
  readonly rules: RuleSetView;
  /** Sectors of the aqueduct: names for the list and the sectors the version does not mention. */
  readonly sectors: readonly SectorView[];
}

/**
 * Screen S16: edits a draft. One form holds every editable part; "Guardar borrador" sends only the
 * lists that changed (PATCH /rule-sets/{id}). The tank range comes from the draft itself.
 */
export function DraftEditor({ rules, sectors }: DraftEditorProps): JSX.Element {
  const save = useSaveDraft(rules.id);
  const [failure, setFailure] = useState<ReturnType<typeof errorText> | null>(null);
  const [saved, setSaved] = useState(false);
  const schema = useMemo(
    () => draftRulesFormSchema({ gauge: rules.gauge }, validationMessages),
    [rules.gauge],
  );
  const sectorIds = useMemo(() => sectors.map((sector) => sector.id), [sectors]);
  const baselineSectors = useMemo(
    () => rowsToSectors(sectorsToRows(rules.sectors, sectorIds)),
    [rules.sectors, sectorIds],
  );
  const form = useForm<DraftFormValues, unknown, DraftFormOutput>({
    resolver: formResolver<DraftFormValues, DraftFormOutput>(schema),
    mode: 'onBlur',
    defaultValues: toDraftFormValues(rules, sectorIds),
  });
  const { handleSubmit, reset, formState } = form;
  const { isDirty, isSubmitting, dirtyFields } = formState;

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    setSaved(false);
    const newSectors = rowsToSectors(values.sectors);
    const changes: RuleSetChanges = {
      ...(dirtyFields.bands === undefined ? {} : { bands: rowsToBands(values.bands) }),
      ...(sameSectorSettings(newSectors, baselineSectors) ? {} : { sectors: newSectors }),
    };
    if (Object.keys(changes).length === 0) {
      // Only the order of sectors without priority changed: that is not part of the rules.
      reset(form.getValues());
      return;
    }
    try {
      const result = await save.mutateAsync(changes);
      reset(toDraftFormValues(result, sectorIds));
      setSaved(true);
    } catch (error) {
      setFailure(errorText(error));
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={(event) => void submit(event)} noValidate aria-busy={isSubmitting}>
        <div className={cn(styles.stack)}>
          {failure === null ? null : (
            <FormAlert message={failure.message} detail={failure.supportCode} />
          )}
          <BandsEditor gauge={rules.gauge} />
          <SectorsEditor sectors={sectors} />
          <div className={cn(styles.actions)}>
            <Button
              type="submit"
              disabled={!isDirty || isSubmitting}
              aria-describedby="rules-save-hint"
            >
              {isSubmitting ? t('rules.savingDraft') : t('rules.saveDraft')}
            </Button>
          </div>
          <p id="rules-save-hint" className={cn(styles.note)}>
            {isDirty ? '' : t('rules.noChangesToSave')}
          </p>
          {saved && !isDirty ? <p role="status">{t('rules.draftSaved')}</p> : null}
        </div>
      </form>
    </FormProvider>
  );
}
