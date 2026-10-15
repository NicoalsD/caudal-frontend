/** The two connection states the app distinguishes (ux-guidelines section 7). */
export type ConnectionName = 'ONLINE' | 'OFFLINE';

/** What the browser reports about the network. */
export type ConnectionEvent = 'BROWSER_ONLINE' | 'BROWSER_OFFLINE';

/**
 * State pattern (P18): each connection state knows where the next event takes it. Callers ask
 * `next` and never switch on names, so a new state (for example a ping check) adds a class.
 */
export interface ConnectionState {
  readonly name: ConnectionName;
  next(event: ConnectionEvent): ConnectionState;
}

class OnlineState implements ConnectionState {
  readonly name: ConnectionName = 'ONLINE';

  next(event: ConnectionEvent): ConnectionState {
    return event === 'BROWSER_OFFLINE' ? connectionStates.offline : this;
  }
}

class OfflineState implements ConnectionState {
  readonly name: ConnectionName = 'OFFLINE';

  next(event: ConnectionEvent): ConnectionState {
    return event === 'BROWSER_ONLINE' ? connectionStates.online : this;
  }
}

export const connectionStates: {
  readonly online: ConnectionState;
  readonly offline: ConnectionState;
} = {
  online: new OnlineState(),
  offline: new OfflineState(),
};

/** The state the app starts in, from what the browser says at boot. */
export function connectionStateFor(online: boolean): ConnectionState {
  return online ? connectionStates.online : connectionStates.offline;
}
