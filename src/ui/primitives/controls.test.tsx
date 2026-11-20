/* eslint-disable no-restricted-syntax -- sample strings of test fixtures, not product copy */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { t } from '../../i18n/t';
import { Avatar, initialsOf } from './Avatar';
import { Badge } from './Badge';
import { Button } from './Button';
import { Chip, FilterChip } from './Chip';
import { IconButton } from './IconButton';
import { SegmentedControl } from './SegmentedControl';
import { Skeleton, SkeletonGroup } from './Skeleton';
import { TextTabs, tabPanelProps } from './TextTabs';

describe('Button', () => {
  it.each(['primary', 'secondary', 'ghost', 'onDark'] as const)(
    'renders the %s variant',
    (variant) => {
      render(<Button variant={variant}>Guardar</Button>);

      expect(screen.getByRole('button', { name: 'Guardar' })).toHaveAttribute('type', 'button');
    },
  );

  it('does not fire when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Guardar
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('IconButton', () => {
  it('is named by its label and shows the badge only visually', () => {
    render(
      <IconButton label="Avisos, 3 pendientes" badge="3">
        <Bell aria-hidden="true" />
      </IconButton>,
    );

    expect(screen.getByRole('button', { name: 'Avisos, 3 pendientes' })).toBeVisible();
  });
});

describe('Avatar', () => {
  it('takes the initials of the first two words', () => {
    expect(initialsOf('Nicolas Diaz Mora')).toBe('ND');
    expect(initialsOf('  ')).toBe('');
  });

  it('is an image with the name only when it is not decorative', () => {
    render(<Avatar name="Nicolas Diaz" decorative={false} />);

    expect(screen.getByRole('img', { name: 'Nicolas Diaz' })).toHaveTextContent('ND');
  });
});

describe('Badge', () => {
  it('says the state in words, not only in color', () => {
    render(<Badge tone="warning" />);

    expect(screen.getByText(t('ui.statusWarning'))).toBeVisible();
  });
});

describe('Chip and FilterChip', () => {
  it('renders a static chip', () => {
    render(<Chip>Sector Norte</Chip>);

    expect(screen.getByText('Sector Norte')).toBeVisible();
  });

  it('opens its menu, marks the chosen option and returns focus on Escape', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FilterChip
        label="Periodo"
        value="24h"
        onChange={onChange}
        options={[
          { value: '24h', label: '24 h' },
          { value: '7d', label: '7 días' },
        ]}
      />,
    );
    const trigger = screen.getByRole('button', { name: /Periodo/ });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: '24 h' })).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: 'Periodo' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: '7 días' }));
    expect(onChange).toHaveBeenCalledWith('7d');
    expect(screen.queryByRole('group', { name: 'Periodo' })).not.toBeInTheDocument();
  });
});

describe('SegmentedControl', () => {
  function Demo() {
    const [value, setValue] = useState('day');
    return (
      <SegmentedControl
        label="Periodo"
        value={value}
        onChange={setValue}
        options={[
          { value: 'day', label: 'Hoy' },
          { value: 'week', label: 'Semana' },
        ]}
      />
    );
  }

  it('is a radio group that moves with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<Demo />);

    expect(screen.getByRole('radiogroup', { name: 'Periodo' })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Hoy' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Hoy' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Semana' })).toBeChecked();
  });
});

describe('TextTabs', () => {
  function Demo() {
    const [value, setValue] = useState('all');
    return (
      <>
        <TextTabs
          label="Historial"
          idPrefix="h"
          value={value}
          onChange={setValue}
          tabs={[
            { id: 'all', label: 'Todo' },
            { id: 'transfer', label: 'Traslados' },
          ]}
        />
        <div {...tabPanelProps('h', value)}>Panel {value}</div>
      </>
    );
  }

  it('selects with arrows, keeps one tab in the Tab order and links the panel', async () => {
    const user = userEvent.setup();
    render(<Demo />);

    const all = screen.getByRole('tab', { name: 'Todo' });
    expect(all).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Traslados' })).toHaveAttribute('tabindex', '-1');
    all.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Traslados' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Traslados' })).toHaveTextContent('Panel transfer');
  });
});

describe('Skeleton', () => {
  it('hides the shapes and announces the loading once', () => {
    render(
      <SkeletonGroup>
        <Skeleton />
        <Skeleton shape="block" />
      </SkeletonGroup>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(t('ui.loading'));
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });
});
