import { useCallback, useSyncExternalStore } from 'react';

import type {
  EditorState,
  ProposalEditorMediator,
} from '../../core/proposal/ProposalEditorMediator';

/** Reads the mediator's state; the components re-render only when the mediator publishes. */
export function useEditorState(mediator: ProposalEditorMediator): EditorState {
  const subscribe = useCallback((listener: () => void) => mediator.subscribe(listener), [mediator]);
  const read = useCallback(() => mediator.getState(), [mediator]);
  return useSyncExternalStore(subscribe, read, read);
}
