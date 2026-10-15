import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { strings } from '../../i18n/es';
import { FlowShowcase } from './FlowShowcase';

const copy = strings.landing.flow;
const TAB_COUNT = 5;
const FIRST_TAB = copy.steps.reading.tab;
const SECOND_TAB = copy.steps.status.tab;
const PROPOSAL_TAB = copy.steps.proposal.tab;
const LAST_TAB = copy.steps.publication.tab;

const tablist = () => screen.getByRole('tablist', { name: copy.tabsLabel });
const tabs = () => screen.getAllByRole('tab');
const tab = (name: string) => screen.getByRole('tab', { name });
const playToggle = () => screen.getByRole('button', { name: copy.pause });

function renderShowcase() {
  render(<FlowShowcase />);
  return userEvent.setup();
}

describe('FlowShowcase', () => {
  it('offers the five steps as a labeled tablist', () => {
    renderShowcase();

    expect(tablist()).toBeInTheDocument();
    expect(tabs()).toHaveLength(TAB_COUNT);
  });

  it('selects the first step by default and shows its title', () => {
    renderShowcase();

    expect(tab(FIRST_TAB)).toHaveAttribute('aria-selected', 'true');
    expect(tab(SECOND_TAB)).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText(copy.steps.reading.title)).toBeInTheDocument();
  });

  it('shows the step of a tab the visitor clicks', async () => {
    const user = renderShowcase();

    await user.click(tab(PROPOSAL_TAB));

    expect(tab(PROPOSAL_TAB)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: PROPOSAL_TAB })).toBeInTheDocument();
    expect(screen.getByText(copy.steps.proposal.title)).toBeInTheDocument();
  });

  it('moves the selection and the focus to the next tab with ArrowRight', async () => {
    const user = renderShowcase();

    tab(FIRST_TAB).focus();
    await user.keyboard('{ArrowRight}');

    expect(tab(SECOND_TAB)).toHaveAttribute('aria-selected', 'true');
    expect(tab(SECOND_TAB)).toHaveFocus();
  });

  it('wraps from the first tab to the last with ArrowLeft', async () => {
    const user = renderShowcase();

    tab(FIRST_TAB).focus();
    await user.keyboard('{ArrowLeft}');

    expect(tab(LAST_TAB)).toHaveAttribute('aria-selected', 'true');
    expect(tab(LAST_TAB)).toHaveFocus();
  });

  it('toggles the play button name between pause and play', async () => {
    const user = renderShowcase();

    expect(playToggle()).toBeInTheDocument();
    await user.click(playToggle());

    expect(screen.getByRole('button', { name: copy.play })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: copy.play }));

    expect(playToggle()).toBeInTheDocument();
  });
});
