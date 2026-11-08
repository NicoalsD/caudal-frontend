import { FormSchemaBuilder } from '../forms/FormSchemaBuilder';
import type { ConstraintsMap } from '../forms/FieldConstraint';
import type { ValidationMessageFactory } from '../forms/validationMessages';

/** Field names of the editor of regions, named as the API sends them. */
export const REGION_FIELD = {
  code: 'code',
  name: 'name',
  isMotorized: 'is_motorized',
} as const;

/** Keys of GET /meta/constraints that limit these fields (the backend's MetaController). */
export const REGION_CONSTRAINT = {
  sectorCode: 'sector.code',
  valveCode: 'valve.code',
  placeName: 'place_name',
} as const;

/** A new region or sector: its code (upper case, unique) and its name. */
export function sectorFormSchema(constraints: ConstraintsMap, messages: ValidationMessageFactory) {
  return new FormSchemaBuilder(constraints, messages)
    .text(REGION_FIELD.code, { constraint: REGION_CONSTRAINT.sectorCode, uppercase: true })
    .text(REGION_FIELD.name, { constraint: REGION_CONSTRAINT.placeName })
    .build();
}

/** A new valve in a sector. */
export function valveFormSchema(constraints: ConstraintsMap, messages: ValidationMessageFactory) {
  return new FormSchemaBuilder(constraints, messages)
    .text(REGION_FIELD.code, { constraint: REGION_CONSTRAINT.valveCode, uppercase: true })
    .text(REGION_FIELD.name, { constraint: REGION_CONSTRAINT.placeName })
    .flag(REGION_FIELD.isMotorized)
    .build();
}

/** The new name of a sector. */
export function renameFormSchema(constraints: ConstraintsMap, messages: ValidationMessageFactory) {
  return new FormSchemaBuilder(constraints, messages)
    .text(REGION_FIELD.name, { constraint: REGION_CONSTRAINT.placeName })
    .build();
}
