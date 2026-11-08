/* eslint-disable no-restricted-syntax -- sample strings of test fixtures, not product copy */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Droplets } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { t } from '../../i18n/t';
import { Card } from './Card';
import { CardStack } from './CardStack';
import { StatTile } from './StatTile';

describe('Card', () => {
  it.each(['plain', 'tinted', 'dark', 'hero'] as const)('renders the %s variant', (variant) => {
    render(
      <Card variant={variant} as="section" aria-label="Resumen">
        Contenido
      </Card>,
    );

    expect(screen.getByRole('region', { name: 'Resumen' })).toHaveTextContent('Contenido');
  });

  it('hides its decorative art from assistive technology', () => {
    const { container } = render(<Card variant="dark">Hola</Card>);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('StatTile', () => {
  it('shows value, label and a change that names its direction in words', () => {
    render(
      <StatTile
        icon={Droplets}
        label="Nivel del tanque"
        value="2,4 m"
        delta={{ text: '+0,3 m', trend: 'up', tone: 'good' }}
      />,
    );

    expect(screen.getByText('2,4 m')).toBeVisible();
    expect(screen.getByText('Nivel del tanque')).toBeVisible();
    expect(screen.getByText(/\+0,3 m/)).toHaveTextContent(`${t('ui.deltaUp')} +0,3 m`);
  });
});

describe('CardStack', () => {
  const items = [
    { id: 'a', label: 'Primera', content: <button type="button">Aceptar A</button> },
    { id: 'b', label: 'Segunda', content: <button type="button">Aceptar B</button> },
    { id: 'c', label: 'Tercera', content: <button type="button">Aceptar C</button> },
  ];

  it('is a carousel; only the front card keeps reachable controls', () => {
    render(<CardStack label="Recomendaciones" items={items} />);

    expect(screen.getByRole('region', { name: 'Recomendaciones' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Aceptar A' })).toBeVisible();
    // jsdom does not drop inert subtrees from the accessibility tree; the attribute is what browsers use.
    expect(screen.getByText('Aceptar B').closest('[inert]')).not.toBeNull();
    expect(screen.getByText('Aceptar A').closest('[inert]')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('1 de 3');
  });

  it('moves with the buttons and the arrow keys', async () => {
    const user = userEvent.setup();
    render(<CardStack label="Recomendaciones" items={items} />);

    await user.click(screen.getByRole('button', { name: t('ui.stackNext') }));
    expect(screen.getByRole('button', { name: 'Aceptar B' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('2 de 3');

    screen.getByRole('list', { name: 'Recomendaciones' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('status')).toHaveTextContent('3 de 3');
    expect(screen.getByRole('button', { name: t('ui.stackNext') })).toBeDisabled();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('status')).toHaveTextContent('1 de 3');
  });
});
