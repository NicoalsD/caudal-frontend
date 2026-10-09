import { useMemo, useState } from 'react';
import type { JSX } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { draftRulesFormSchema } from '../../core/forms/formSchemas';
import { rowsToBands, toDraftFormValues } from '../../core/rules/draftForm';
import type { DraftFormOutput, DraftFormValues } from '../../core/rules/draftForm';
import type { RuleSetChanges } from '../../core/rules/ruleSetParts';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { validationMessages } from '../../i18n/validationMessages';
import type { RuleSetView } from '../../services/api/views';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { formResolver } from '../../ui/primitives/formResolver';
import { cn } from '../../ui/styles/cn';
import { BandsEditor } from './BandsEditor';
import styles from './Rules.module.css';
import { useSaveDraft } from './ruleQueries';

interface DraftEditorProps {
  readonly rules: RuleSetView;
}

/**
 * Screen S16: edits a draft. One form holds every editable part; "Guardar borrador" sends only the
 * lists that changed (PATCH /rule-sets/{id}). The tank range comes from the draft itself.
 */
export function DraftEditor({ rules }: DraftEditorProps): JSX.Element {
  const save = useSaveDraft(rules.id);
  const [failure, setFailure] = useState<ReturnType<typeof errorText> | null>(null);
  const [saved, setSaved] = useState(false);
  const schema = useMemo(
    () => draftRulesFormSchema({ gauge: rules.gauge }, validationMessages),
    [rules.gauge],
  );
  const form = useForm<DraftFormValues, unknown, DraftFormOutput>({
    resolver: formResolver<DraftFormValues, DraftFormOutput>(schema),
    mode: 'onBlur',
    defaultValues: toDraftFormValues(rules.bands),
  });
  const { handleSubmit, reset, formState } = form;
  const { isDirty, isSubmitting, dirtyFields } = formState;

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    setSaved(false);
    const changes: RuleSetChanges = {
      ...(dirtyFields.bands === undefined ? {} : { bands: rowsToBands(values.bands) }),
    };
    try {
      const result = await save.mutateAsync(changes);
      reset(toDraftFormValues(result.bands));
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
