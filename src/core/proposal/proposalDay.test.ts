import { describe, expect, it } from 'vitest';

import {
  currentProposalOf,
  dayStepFor,
  isDecidable,
  isPublishable,
  orderProposals,
  type DayProposal,
  type ProposalStatus,
} from './proposalDay';

const TODAY = '2026-10-15';

function proposal(
  id: string,
  serviceDate: string,
  status: ProposalStatus,
  generatedAt = Date.parse(`${serviceDate}T06:00:00Z`),
): DayProposal {
  return { id, serviceDate, status, generatedAt };
}

describe('proposal status rules', () => {
  it('only a pending proposal can be decided', () => {
    expect(isDecidable('PENDING_REVIEW')).toBe(true);
    expect(isDecidable('APPROVED')).toBe(false);
    expect(isDecidable('REJECTED')).toBe(false);
  });

  it('approved proposals, with or without changes, can be published', () => {
    expect(isPublishable('APPROVED')).toBe(true);
    expect(isPublishable('APPROVED_WITH_CHANGES')).toBe(true);
    expect(isPublishable('PENDING_REVIEW')).toBe(false);
    expect(isPublishable('PUBLISHED')).toBe(false);
  });
});

describe('currentProposalOf', () => {
  it('ignores rejected proposals and keeps the most recent live one', () => {
    const older = proposal('a', TODAY, 'PENDING_REVIEW', Date.parse(`${TODAY}T06:00:00Z`));
    const newer = proposal('b', TODAY, 'APPROVED', Date.parse(`${TODAY}T07:00:00Z`));
    const rejected = proposal('c', TODAY, 'REJECTED', Date.parse(`${TODAY}T08:00:00Z`));
    expect(currentProposalOf([older, rejected, newer])?.id).toBe('b');
  });

  it('is null when every proposal of the day was rejected or there are none', () => {
    expect(currentProposalOf([])).toBeNull();
    expect(currentProposalOf([proposal('c', TODAY, 'REJECTED')])).toBeNull();
  });
});

describe('dayStepFor', () => {
  it.each([
    [null, 'GENERATE'],
    [proposal('a', TODAY, 'REJECTED'), 'GENERATE'],
    [proposal('a', TODAY, 'PENDING_REVIEW'), 'REVIEW'],
    [proposal('a', TODAY, 'APPROVED'), 'PUBLISH'],
    [proposal('a', TODAY, 'APPROVED_WITH_CHANGES'), 'PUBLISH'],
    [proposal('a', TODAY, 'PUBLISHED'), 'PUBLISHED'],
    [proposal('a', TODAY, 'CLOSED'), 'PUBLISHED'],
  ] as const)('gives the next step for %j', (input, expected) => {
    expect(dayStepFor(input)).toBe(expected);
  });
});

describe('orderProposals', () => {
  it('puts the proposal of today first, then the others from the most recent day', () => {
    const list = [
      proposal('old', '2026-10-10', 'PUBLISHED'),
      proposal('today', TODAY, 'PENDING_REVIEW'),
      proposal('yesterday', '2026-10-14', 'APPROVED'),
    ];
    expect(orderProposals(list, TODAY).map((item) => item.id)).toEqual([
      'today',
      'yesterday',
      'old',
    ]);
  });

  it('does not change the list it receives', () => {
    const list = [proposal('old', '2026-10-10', 'PUBLISHED'), proposal('t', TODAY, 'APPROVED')];
    const copy = [...list];
    orderProposals(list, TODAY);
    expect(list).toEqual(copy);
  });
});
