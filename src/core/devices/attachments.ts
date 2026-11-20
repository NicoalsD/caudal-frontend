import type { NetworkNode } from '../network/NetworkNode';

export interface ValveOption {
  readonly id: string;
  readonly name: string;
}

/** Every valve under a node of the network, in the order the tree shows them. */
export function collectValves(node: NetworkNode): readonly ValveOption[] {
  return node.children().flatMap((child) => {
    if (child.kind === 'valve') {
      return [{ id: child.id, name: child.name }];
    }
    return collectValves(child);
  });
}
