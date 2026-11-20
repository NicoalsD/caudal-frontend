import { zodResolver } from '@hookform/resolvers/zod';
import type { Resolver } from 'react-hook-form';
import type { ZodType } from 'zod';

/**
 * Connects a Zod schema built at run time (FormSchemaBuilder) to React Hook Form.
 * The builder cannot know the field names statically, so the form's own type is stated here
 * once instead of casting in every form.
 */
export function formResolver<Values extends object, Output extends object = Values>(
  schema: ZodType,
): Resolver<Values, unknown, Output> {
  return zodResolver(schema as never) as unknown as Resolver<Values, unknown, Output>;
}
