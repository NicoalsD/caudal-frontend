import { createTranslator } from '../core/format/message';
import { strings } from './es';

/** Translates a key of src/i18n/es.ts: t('errors.forbiddenTitle'), t('validation.max', { max }). */
export const t = createTranslator(strings);
