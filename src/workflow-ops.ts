export type WorkflowOp =
  | { op: 'setName'; name: string }
  | { op: 'addNode'; node: Record<string, any> }
  | { op: 'removeNode'; name: string }
  | { op: 'updateNode'; name: string; parameters?: Record<string, any>; typeVersion?: number }
  | {
      op: 'addConnection';
      source: string;
      target: string;
      sourceOutput?: number;
      targetInput?: number;
    }
  | { op: 'removeConnection'; source: string; target: string };

export interface ApplyOpsResult {
  workflow: {
    name: string;
    nodes: any[];
    connections: Record<string, any>;
    settings: Record<string, any>;
  };
  errors: string[];
}

export function applyWorkflowOps(
  current: {
    name?: string;
    nodes?: any[];
    connections?: Record<string, any>;
    settings?: Record<string, any>;
  },
  ops: WorkflowOp[]
): ApplyOpsResult {
  const workflow = {
    name: current.name ?? 'Untitled',
    nodes: structuredClone(current.nodes ?? []),
    connections: structuredClone(current.connections ?? {}),
    settings: structuredClone(current.settings ?? { executionOrder: 'v1' }),
  };
  const errors: string[] = [];

  for (const operation of ops) {
    if (operation.op === 'setName') {
      workflow.name = operation.name;
      continue;
    }

    if (operation.op === 'addNode') {
      if (!operation.node?.name || !operation.node?.type) {
        errors.push('addNode requires node.name and node.type');
        continue;
      }
      if (workflow.nodes.some((n) => n.name === operation.node.name)) {
        errors.push(`Node "${operation.node.name}" already exists`);
        continue;
      }
      const index = workflow.nodes.length;
      workflow.nodes.push({
        typeVersion: 1,
        position: [250 + index * 200, 300],
        parameters: {},
        ...operation.node,
      });
      continue;
    }

    if (operation.op === 'removeNode') {
      workflow.nodes = workflow.nodes.filter((n) => n.name !== operation.name);
      delete workflow.connections[operation.name];
      for (const source of Object.keys(workflow.connections)) {
        const mains = workflow.connections[source]?.main;
        if (!Array.isArray(mains)) continue;
        workflow.connections[source].main = mains.map((branch: any[]) =>
          (branch ?? []).filter((link) => link?.node !== operation.name)
        );
      }
      continue;
    }

    if (operation.op === 'updateNode') {
      const node = workflow.nodes.find((n) => n.name === operation.name);
      if (!node) {
        errors.push(`Node "${operation.name}" not found`);
        continue;
      }
      if (operation.parameters) {
        node.parameters = { ...(node.parameters ?? {}), ...operation.parameters };
      }
      if (operation.typeVersion !== undefined) {
        node.typeVersion = operation.typeVersion;
      }
      continue;
    }

    if (operation.op === 'addConnection') {
      const sourceExists = workflow.nodes.some((n) => n.name === operation.source);
      const targetExists = workflow.nodes.some((n) => n.name === operation.target);
      if (!sourceExists || !targetExists) {
        errors.push(`Cannot connect "${operation.source}" → "${operation.target}": missing node`);
        continue;
      }
      const output = operation.sourceOutput ?? 0;
      if (!workflow.connections[operation.source]) {
        workflow.connections[operation.source] = { main: [] };
      }
      if (!Array.isArray(workflow.connections[operation.source].main)) {
        workflow.connections[operation.source].main = [];
      }
      while (workflow.connections[operation.source].main.length <= output) {
        workflow.connections[operation.source].main.push([]);
      }
      workflow.connections[operation.source].main[output].push({
        node: operation.target,
        type: 'main',
        index: operation.targetInput ?? 0,
      });
      continue;
    }

    if (operation.op === 'removeConnection') {
      const mains = workflow.connections[operation.source]?.main;
      if (!Array.isArray(mains)) continue;
      workflow.connections[operation.source].main = mains.map((branch: any[]) =>
        (branch ?? []).filter((link) => link?.node !== operation.target)
      );
    }
  }

  return { workflow, errors };
}
