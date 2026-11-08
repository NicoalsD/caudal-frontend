import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AqueductCanvas } from './AqueductCanvas';
import type { SceneFrame } from './sceneTypes';

const FALLBACK_TEXT = 'fallback';
const FRAME: SceneFrame = {
  levelFraction: 0.5,
  tankTitle: 'Tanque',
  tankDetail: '2 m',
  rings: [],
  valves: [],
  parts: { intake: 'Entrada', overflow: 'Rebose', drain: 'Desagüe', vent: 'Ventilación' },
};

describe('AqueductCanvas', () => {
  it('keeps the fallback when the browser has no WebGL (jsdom), and draws no canvas', () => {
    render(
      <AqueductCanvas frame={FRAME} onSelectValve={vi.fn()} fallback={<p>{FALLBACK_TEXT}</p>} />,
    );

    expect(screen.getByText(FALLBACK_TEXT)).toBeVisible();
    expect(screen.getByTestId('aqueduct-scene')).toHaveAttribute('data-ready', 'false');
    expect(document.querySelector('canvas')).toBeNull();
  });
});
