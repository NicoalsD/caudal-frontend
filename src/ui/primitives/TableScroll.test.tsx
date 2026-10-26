import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TableScroll } from './TableScroll';

const LABEL = 'Bandas de la regla';

describe('TableScroll', () => {
  it('is a named region that the keyboard can reach', () => {
    render(
      <TableScroll label={LABEL}>
        <table />
      </TableScroll>,
    );

    const region = screen.getByRole('region', { name: LABEL });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region.querySelector('table')).not.toBeNull();
  });
});
