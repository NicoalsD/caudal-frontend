import { DomainError } from '../../core/errors/DomainError';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';

const RULE_SET_INVALID = 'RULE_SET_INVALID';
const REASON_REQUIRED = 'REASON_REQUIRED';

export interface ActivationFailure {
  /** Set when the message belongs under the reason field. */
  readonly field: 'change_reason' | null;
  readonly message: string;
  /** For RULE_SET_INVALID: one line per problem the server found ("Entre 3,00 y 3,50 no hay banda"). */
  readonly problems: readonly string[];
  readonly supportCode: string | null;
}

function gapsOf(error: DomainError): string[] {
  const gaps = error.details.gaps;
  if (!Array.isArray(gaps)) {
    return [];
  }
  return gaps.flatMap((gap: unknown) => {
    if (typeof gap !== 'object' || gap === null) {
      return [];
    }
    const { from, to } = gap as Record<string, unknown>;
    return typeof from === 'string' && typeof to === 'string'
      ? [t('rules.activationGap', { from, to })]
      : [];
  });
}

/**
 * What to show when the server refuses to activate: the reason error under its field, and for an
 * invalid version the list of problems it reported (the gaps arrive formatted in `details.gaps`).
 */
export function activationFailure(error: unknown): ActivationFailure {
  const text = errorText(error);
  if (error instanceof DomainError && error.code === REASON_REQUIRED) {
    return { field: 'change_reason', message: text.message, problems: [], supportCode: null };
  }
  if (error instanceof DomainError && error.code === RULE_SET_INVALID) {
    const problems = gapsOf(error);
    return {
      field: null,
      message: t('rules.activationInvalid'),
      problems: problems.length > 0 ? problems : [text.message],
      supportCode: null,
    };
  }
  return { field: null, message: text.message, problems: [], supportCode: text.supportCode };
}
