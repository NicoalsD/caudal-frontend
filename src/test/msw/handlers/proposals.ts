import { createProposalsBackend } from '../proposalsBackend';

/** Default answers of /schedule-proposals: no proposal yet, so the Board can generate one. */
export const proposalsHandlers = createProposalsBackend([]).handlers;
