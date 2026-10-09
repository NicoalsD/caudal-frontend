import { waitFor } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { FormSchemaBuilder } from '../../core/forms/FormSchemaBuilder';
import { readingFormSchema, reasonSchema } from '../../core/forms/formSchemas';
import { validationMessages } from '../../i18n/validationMessages';
import { useConstraints } from '../../state/hooks/useConstraints';
import { buildConstraints } from '../factories/constraints';
import { apiUrl } from '../msw/apiUrl';
import { server } from '../msw/server';
import { renderHookWithApi } from '../renderWithProviders';

const GAUGE = { min: 0, max: 5, decimals: 2 };
const NOTE_MAX = 500;
const REASON_MIN = 10;
const SHORT_REASON = 'x'.repeat(REASON_MIN - 1);
const CUSTOM_NOTE_MAX = 120;

async function loadConstraints() {
  const { result } = renderHookWithApi(() => useConstraints());
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });
  const data = result.current.data;
  if (data === undefined) {
    throw new Error('constraints did not load');
  }
  return data;
}

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? null : (result.error?.issues[0]?.message ?? null);
}

describe('constraints from the API to validation messages in Spanish', () => {
  it('shows Spanish messages built from the limits the server sent', async () => {
    const constraints = await loadConstraints();
    const reading = readingFormSchema(constraints, GAUGE, validationMessages);
    const reason = reasonSchema(constraints, validationMessages);

    expect(firstMessage(reading.safeParse({ gauge_value: '8', 'reading.note': '' }))).toBe(
      'El número no puede ser mayor que 5',
    );
    expect(firstMessage(reading.safeParse({ gauge_value: '2,123', 'reading.note': '' }))).toBe(
      'Usa como máximo 2 decimales',
    );
    expect(
      firstMessage(
        reading.safeParse({ gauge_value: '2,1', 'reading.note': 'x'.repeat(NOTE_MAX + 1) }),
      ),
    ).toBe('Máximo 500');
    expect(firstMessage(reason.safeParse({ change_reason: SHORT_REASON }))).toBe(
      'Escribe al menos 10 caracteres',
    );
    expect(firstMessage(reading.safeParse({ gauge_value: 'abc', 'reading.note': '' }))).toBe(
      'Escribe un número válido, por ejemplo 2,1',
    );
  });

  it('follows the server: a new limit changes the message without a frontend change', async () => {
    server.use(
      http.get(apiUrl('/meta/constraints'), () =>
        Response.json(buildConstraints({ 'reading.note': { min: 0, max: CUSTOM_NOTE_MAX } })),
      ),
    );

    const constraints = await loadConstraints();
    const reading = readingFormSchema(constraints, GAUGE, validationMessages);

    expect(
      firstMessage(
        reading.safeParse({ gauge_value: '2', 'reading.note': 'x'.repeat(CUSTOM_NOTE_MAX + 1) }),
      ),
    ).toBe('Máximo 120');
  });

  it('does not arm a form for a field the server did not send', async () => {
    const constraints = await loadConstraints();

    expect(() =>
      new FormSchemaBuilder(constraints, validationMessages).text('campo.nuevo'),
    ).toThrow('Missing constraint for field "campo.nuevo"');
  });
});
