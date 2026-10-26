import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { strings } from '../../i18n/es';
import { LandingPage } from './LandingPage';
import { REPOSITORY_URLS } from './links';

const copy = strings.landing;
const FIRST_LEVEL = 1;
const SECOND_LEVEL = 2;
const THIRD_LEVEL = 3;
const SAFE_REL_TOKENS = ['noopener', 'noreferrer'] as const;

function renderLanding() {
  render(
    <MemoryRouter initialEntries={[ROUTE_PATHS.root]}>
      <LandingPage />
    </MemoryRouter>,
  );
}

const heading = (level: number, name: string) => screen.getByRole('heading', { level, name });

const linksNamed = (name: string) => screen.getAllByRole('link', { name });

describe('LandingPage', () => {
  it('shows the product name as the page level-1 heading', () => {
    renderLanding();

    expect(heading(FIRST_LEVEL, copy.hero.title)).toBeInTheDocument();
  });

  it.each([copy.nav.signIn, copy.hero.primary, copy.closing.primary])(
    'sends the "%s" links to the sign in',
    (name) => {
      renderLanding();

      const links = linksNamed(name);
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link).toHaveAttribute('href', ROUTE_PATHS.login);
      }
    },
  );

  it('labels the real screens and keeps the simulated-data mark', () => {
    renderLanding();

    expect(screen.getByRole('list', { name: copy.hero.devicesLabel })).toBeInTheDocument();
    expect(screen.getAllByText(strings.common.simulatedData).length).toBeGreaterThan(0);
  });

  it('opens the repository links in a new tab with safe rel values', () => {
    renderLanding();

    const repositoryHrefs: readonly string[] = Object.values(REPOSITORY_URLS);
    const repositoryLinks = screen
      .getAllByRole('link')
      .filter((link) => repositoryHrefs.includes(link.getAttribute('href') ?? ''));
    expect(repositoryLinks.length).toBeGreaterThan(0);

    for (const link of repositoryLinks) {
      expect(link).toHaveAttribute('target', '_blank');
      const relTokens = (link.getAttribute('rel') ?? '').split(/\s+/);
      for (const token of SAFE_REL_TOKENS) {
        expect(relTokens).toContain(token);
      }
    }
  });

  it('names the content sections with level-2 headings', () => {
    renderLanding();

    expect(heading(SECOND_LEVEL, copy.flow.title)).toBeInTheDocument();
    expect(heading(SECOND_LEVEL, copy.offline.title)).toBeInTheDocument();
    expect(heading(SECOND_LEVEL, copy.decide.title)).toBeInTheDocument();
    expect(heading(SECOND_LEVEL, copy.forecast.title)).toBeInTheDocument();
    expect(heading(SECOND_LEVEL, copy.project.title)).toBeInTheDocument();
  });

  it('lists the project repositories inside the project section', () => {
    renderLanding();

    const projectSection = screen.getByRole('region', { name: copy.project.title });
    expect(
      within(projectSection).getByRole('heading', {
        level: THIRD_LEVEL,
        name: copy.project.reposTitle,
      }),
    ).toBeInTheDocument();
  });
});
