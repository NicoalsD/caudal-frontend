import { describe, expect, it } from 'vitest';

import { IncidentTransitions } from './incidentTransitions';

const transitions = new IncidentTransitions();

describe('IncidentTransitions.allowedFrom', () => {
  it('lets a report be verified or dismissed when it is received', () => {
    expect(transitions.allowedFrom('REPORTED')).toEqual(['VERIFYING', 'DISMISSED']);
  });

  it('lets a verified report be confirmed or dismissed', () => {
    expect(transitions.allowedFrom('VERIFYING')).toEqual(['CONFIRMED', 'DISMISSED']);
  });

  it('lets a confirmed report be resolved, and nothing else', () => {
    expect(transitions.allowedFrom('CONFIRMED')).toEqual(['RESOLVED']);
  });

  it('closes resolved and dismissed reports: no way out', () => {
    expect(transitions.allowedFrom('RESOLVED')).toEqual([]);
    expect(transitions.allowedFrom('DISMISSED')).toEqual([]);
  });
});

describe('IncidentTransitions.canMove', () => {
  it('allows the moves of the table', () => {
    expect(transitions.canMove('REPORTED', 'VERIFYING')).toBe(true);
    expect(transitions.canMove('VERIFYING', 'CONFIRMED')).toBe(true);
  });

  it('refuses the moves the table does not have, such as skipping a step', () => {
    expect(transitions.canMove('REPORTED', 'CONFIRMED')).toBe(false);
    expect(transitions.canMove('DISMISSED', 'VERIFYING')).toBe(false);
  });
});

describe('IncidentTransitions.requiresNote', () => {
  it('asks for a note only when the report is dismissed', () => {
    expect(transitions.requiresNote('DISMISSED')).toBe(true);
    expect(transitions.requiresNote('VERIFYING')).toBe(false);
    expect(transitions.requiresNote('CONFIRMED')).toBe(false);
    expect(transitions.requiresNote('RESOLVED')).toBe(false);
  });
});

describe('IncidentTransitions.primaryFrom', () => {
  it('is the next step forward, never the dismissal', () => {
    expect(transitions.primaryFrom('REPORTED')).toBe('VERIFYING');
    expect(transitions.primaryFrom('VERIFYING')).toBe('CONFIRMED');
    expect(transitions.primaryFrom('CONFIRMED')).toBe('RESOLVED');
  });

  it('has no main action when the report is closed', () => {
    expect(transitions.primaryFrom('RESOLVED')).toBeNull();
    expect(transitions.primaryFrom('DISMISSED')).toBeNull();
  });
});
