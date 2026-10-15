import type { OutboxOwner } from '../../core/commands/OutboxRecord';
import { useSession } from './useSession';

/** The account and aqueduct that own the readings queued now. Requires a signed-in session. */
export function useOutboxOwner(): OutboxOwner {
  const session = useSession();
  if (session.status !== 'authenticated') {
    throw new Error('useOutboxOwner needs a signed-in session');
  }
  return { userId: session.user.userId, aqueductId: session.user.aqueductId };
}
