export interface WorkflowDiff {
  nameChanged?: { from: string; to: string };
  nodesAdded: string[];
  nodesRemoved: string[];
  nodesModified: {
    name: string;
    typeChanged?: { from: string; to: string };
    changedParameters: string[];
    positionChanged: boolean;
  }[];
  connectionsAdded: string[];
  connectionsRemoved: string[];
  identical: boolean;
}

function connectionList(connections: Record<string, any> = {}): string[] {
  const list: string[] = [];
  for (const [source, outputs] of Object.entries(connections)) {
    for (const [kind, branches] of Object.entries((outputs as Record<string, any>) ?? {})) {
      if (!Array.isArray(branches)) continue;
      branches.forEach((branch: any[], outputIndex: number) => {
        for (const link of branch ?? []) {
          if (link?.node) list.push(`${source} →[${kind}:${outputIndex}] ${link.node}`);
        }
      });
    }
  }
  return list.sort();
}

/** Compares two workflow versions (e.g. a snapshot vs the current state). */
export function diffWorkflows(
  from: { name?: string; nodes?: any[]; connections?: Record<string, any> },
  to: { name?: string; nodes?: any[]; connections?: Record<string, any> }
): WorkflowDiff {
  const diff: WorkflowDiff = {
    nodesAdded: [],
    nodesRemoved: [],
    nodesModified: [],
    connectionsAdded: [],
    connectionsRemoved: [],
    identical: false,
  };

  if (from.name !== to.name && (from.name || to.name)) {
    diff.nameChanged = { from: from.name ?? '', to: to.name ?? '' };
  }

  const fromNodes = new Map((from.nodes ?? []).map((n) => [n.name, n]));
  const toNodes = new Map((to.nodes ?? []).map((n) => [n.name, n]));

  for (const name of toNodes.keys()) {
    if (!fromNodes.has(name)) diff.nodesAdded.push(name);
  }
  for (const name of fromNodes.keys()) {
    if (!toNodes.has(name)) diff.nodesRemoved.push(name);
  }

  for (const [name, before] of fromNodes) {
    const after = toNodes.get(name);
    if (!after) continue;

    const changedParameters: string[] = [];
    const beforeParams = before.parameters ?? {};
    const afterParams = after.parameters ?? {};
    for (const key of new Set([...Object.keys(beforeParams), ...Object.keys(afterParams)])) {
      if (JSON.stringify(beforeParams[key]) !== JSON.stringify(afterParams[key])) {
        changedParameters.push(key);
      }
    }

    const typeChanged =
      before.type !== after.type ? { from: before.type, to: after.type } : undefined;
    const positionChanged = JSON.stringify(before.position) !== JSON.stringify(after.position);

    if (changedParameters.length > 0 || typeChanged || positionChanged) {
      diff.nodesModified.push({
        name,
        ...(typeChanged && { typeChanged }),
        changedParameters,
        positionChanged,
      });
    }
  }

  const fromConnections = connectionList(from.connections);
  const toConnections = connectionList(to.connections);
  diff.connectionsAdded = toConnections.filter((c) => !fromConnections.includes(c));
  diff.connectionsRemoved = fromConnections.filter((c) => !toConnections.includes(c));

  diff.identical =
    !diff.nameChanged &&
    diff.nodesAdded.length === 0 &&
    diff.nodesRemoved.length === 0 &&
    diff.nodesModified.length === 0 &&
    diff.connectionsAdded.length === 0 &&
    diff.connectionsRemoved.length === 0;

  return diff;
}
