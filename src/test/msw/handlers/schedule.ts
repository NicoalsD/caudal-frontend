import { createScheduleBackend } from '../scheduleBackend';
import { buildScheduleProposal } from '../../factories/schedule';

/** Default answers for the day's proposal and the shift executions (API.md 10 and 11). */
export const scheduleHandlers = createScheduleBackend(buildScheduleProposal()).handlers;
