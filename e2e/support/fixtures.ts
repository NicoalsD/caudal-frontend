import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test as base } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { ApiMock } from './api';

const VERCEL_CONFIG = fileURLToPath(new URL('../../vercel.json', import.meta.url));
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

interface VercelHeader {
  readonly key: string;
  readonly value: string;
}

/** The production Content-Security-Policy, read from vercel.json so the test never drifts. */
function productionCsp(): string {
  const config = JSON.parse(readFileSync(VERCEL_CONFIG, 'utf8')) as {
    headers: { headers: VercelHeader[] }[];
  };
  const header = config.headers
    .flatMap((rule) => rule.headers)
    .find((candidate) => candidate.key === 'Content-Security-Policy');
  if (header === undefined) {
    throw new Error('vercel.json has no Content-Security-Policy header');
  }
  return header.value;
}

const CSP = productionCsp();

interface Fixtures {
  /** The fake API. Installed before every test; the app is served under the production CSP. */
  api: ApiMock;
}

/**
 * Every test runs with the fake API and the production CSP. Any CSP violation in the console
 * fails the test, because the deployed app must work under vercel.json as it is.
 */
export const test = base.extend<Fixtures>({
  api: [
    async ({ context, page }, use) => {
      // Reduced motion: the entrance animations would be captured mid-fade, which skews contrast.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const mock = new ApiMock();
      await mock.install(context);
      await mock.installCsp(context, CSP);
      const violations: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error' && /Content Security Policy/i.test(message.text())) {
          violations.push(message.text());
        }
      });
      await use(mock);
      expect(violations, 'La CSP de vercel.json bloquea recursos de la app').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** WCAG 2.1 AA check: no serious or critical violation may remain on the page. */
export async function expectNoSeriousViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const blocking = results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help} -> ${violation.nodes
          .map((node) => node.target.join(' '))
          .join(' | ')}`,
    );
  expect(blocking).toEqual([]);
}
