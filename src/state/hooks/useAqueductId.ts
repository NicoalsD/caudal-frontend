import { useSession } from './useSession';

/** The aqueduct the signed-in person works in. Screens that need data of one aqueduct call this. */
export function useAqueductId(): string {
  const session = useSession();
  if (session.status !== 'authenticated') {
    throw new Error('useAqueductId needs a signed-in session');
  }
  return session.user.aqueductId;
}
