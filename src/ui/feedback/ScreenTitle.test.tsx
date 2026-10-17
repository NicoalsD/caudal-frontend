import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { t } from '../../i18n/t';
import { ScreenTitle } from './ScreenTitle';

const SCREEN = 'Propuestas de turnos';

describe('ScreenTitle', () => {
  it('draws the h1, takes focus and names the browser tab after it', () => {
    render(<ScreenTitle>{SCREEN}</ScreenTitle>);

    expect(screen.getByRole('heading', { level: 1, name: SCREEN })).toHaveFocus();
    expect(document.title).toBe(t('app.documentTitle', { screen: SCREEN }));
  });
});
