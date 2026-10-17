import { useSession } from './useSession';

/**
 * True when GET /auth/current-user listed `code` for the person. It only decides what to show: the server
 * answers 403 when the permission is missing (architecture.md section 4.1).
 */
export function usePermission(code: string): boolean {
  const session = useSession();
  return session.status === 'authenticated' && session.user.permissions.includes(code);
}
