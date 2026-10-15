import { buildIncident, INCIDENT_ID_A } from '../../factories/incidents';
import { createIncidentsBackend } from '../incidentsBackend';

/** Default answers of /incidents: one report that the Board can verify or dismiss. */
export const incidentsHandlers = createIncidentsBackend([
  buildIncident({ id: INCIDENT_ID_A }),
]).handlers;
