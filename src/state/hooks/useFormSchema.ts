import { useMemo } from 'react';

import type { ConstraintsMap } from '../../core/forms/FieldConstraint';
import { InvalidConstraintError, MissingConstraintError } from '../../core/forms/FormSchemaBuilder';
import type { ValidationMessageFactory } from '../../core/forms/validationMessages';
import { validationMessages } from '../../i18n/validationMessages';
import { useConstraints } from './useConstraints';

export type FormSchemaState<Schema> =
  | { readonly status: 'loading' }
  /** The limits could not be loaded: the form stays closed, there are no default limits. */
  | { readonly status: 'unavailable' }
  /** The server did not send a limit the form needs (configuration error, not user error). */
  | { readonly status: 'misconfigured' }
  | { readonly status: 'ready'; readonly schema: Schema };

/**
 * Builds the Zod schema of a form from GET /meta/constraints (architecture.md 7.1). `build` must
 * be a stable function (declared outside the component) so the schema is rebuilt only when the
 * limits change.
 */
export function useFormSchema<Schema>(
  build: (constraints: ConstraintsMap, messages: ValidationMessageFactory) => Schema,
): FormSchemaState<Schema> {
  const constraints = useConstraints();
  const data = constraints.data;

  return useMemo<FormSchemaState<Schema>>(() => {
    if (data === undefined) {
      return constraints.isError ? { status: 'unavailable' } : { status: 'loading' };
    }
    try {
      return { status: 'ready', schema: build(data, validationMessages) };
    } catch (error) {
      if (error instanceof MissingConstraintError || error instanceof InvalidConstraintError) {
        return { status: 'misconfigured' };
      }
      throw error;
    }
  }, [build, data, constraints.isError]);
}
