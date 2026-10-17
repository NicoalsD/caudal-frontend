import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../../test/contrast';

const css = readFileSync(resolve(import.meta.dirname, 'tokens.css'), 'utf8');

/** WCAG 2.1: 4.5 for text, 3 for controls and focus indicators. */
const MIN_TEXT_RATIO = 4.5;
const MIN_CONTROL_RATIO = 3;

type Palette = Readonly<Record<string, string>>;

function declarations(block: string): Palette {
  const palette: Record<string, string> = {};
  for (const match of block.matchAll(/(--color-[a-z0-9-]+):\s*(#[0-9a-fA-F]{6});/g)) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined) {
      palette[name] = value.toLowerCase();
    }
  }
  return palette;
}

function blockAfter(marker: string): string {
  const start = css.indexOf(marker);
  if (start < 0) {
    throw new Error(`Block not found: ${marker}`);
  }
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, index);
    }
  }
  throw new Error(`Unclosed block: ${marker}`);
}

const light = declarations(blockAfter(':root {'));
const dark = declarations(blockAfter(":root[data-theme='dark'] {"));
const darkBySystem = declarations(blockAfter(":root:not([data-theme='light']) {"));

/** [foreground, background, minimum ratio] pairs from design-theme.md section 2. */
const PAIRS: readonly (readonly [string, string, number])[] = [
  ['--color-text-primary', '--color-page', MIN_TEXT_RATIO],
  ['--color-text-primary', '--color-raised', MIN_TEXT_RATIO],
  ['--color-text-primary', '--color-sand-200', MIN_TEXT_RATIO],
  ['--color-text-secondary', '--color-page', MIN_TEXT_RATIO],
  ['--color-text-secondary', '--color-raised', MIN_TEXT_RATIO],
  ['--color-raised', '--color-water-700', MIN_TEXT_RATIO],
  ['--color-raised', '--color-water-800', MIN_TEXT_RATIO],
  ['--color-water-700', '--color-page', MIN_TEXT_RATIO],
  ['--color-water-700', '--color-water-100', MIN_TEXT_RATIO],
  ['--color-text-primary', '--color-water-300', MIN_TEXT_RATIO],
  ['--color-paramo-800', '--color-page', MIN_TEXT_RATIO],
  ['--color-paramo-800', '--color-paramo-100', MIN_TEXT_RATIO],
  ['--color-ochre-800', '--color-page', MIN_TEXT_RATIO],
  ['--color-ochre-800', '--color-ochre-100', MIN_TEXT_RATIO],
  ['--color-clay-700', '--color-page', MIN_TEXT_RATIO],
  ['--color-clay-700', '--color-clay-100', MIN_TEXT_RATIO],
  ['--color-raised', '--color-clay-700', MIN_TEXT_RATIO],
  ['--color-border-strong', '--color-page', MIN_CONTROL_RATIO],
  ['--color-border-strong', '--color-raised', MIN_CONTROL_RATIO],
  ['--color-focus', '--color-page', MIN_CONTROL_RATIO],
  ['--color-focus', '--color-raised', MIN_CONTROL_RATIO],
  ['--color-ochre-700', '--color-page', MIN_CONTROL_RATIO],
];

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('%s tokens', (_mode, palette) => {
  it.each(PAIRS)('%s on %s reaches the WCAG ratio', (foreground, background, minimum) => {
    const front = palette[foreground];
    const back = palette[background];
    expect(front, `${foreground} is defined`).toBeDefined();
    expect(back, `${background} is defined`).toBeDefined();
    expect(contrastRatio(front ?? '', back ?? '')).toBeGreaterThanOrEqual(minimum);
  });
});

describe('token structure', () => {
  it('defines every color token in both modes', () => {
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
  });

  it('keeps the system dark block identical to the forced dark block', () => {
    expect(darkBySystem).toEqual(dark);
  });

  it('uses the self-hosted font stack with fallbacks', () => {
    expect(css).toContain("--font-family-base:\n    'Atkinson Hyperlegible Next'");
    expect(css).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });
});
