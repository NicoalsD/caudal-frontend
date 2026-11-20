import { createLiveBackend } from '../liveBackend';

/**
 * Default answers for the live valves, the autopilot and the assistant. Each test file that
 * needs the state of a command to move creates its own backend with server.use.
 */
export const liveHandlers = createLiveBackend().handlers;
