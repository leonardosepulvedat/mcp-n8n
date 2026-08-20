import { getNode } from './node-catalog.js';

export interface ValidationIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  node?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export function validateWorkflow(workflow: {
  name?: string;
  nodes?: any[];
  connections?: Record<string, any>;
}): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!workflow.name || !String(workflow.name).trim()) {
    errors.push({ level: 'error', code: 'missing_name', message: 'Workflow name is required' });
  }

  const nodes = workflow.nodes ?? [];
  if (nodes.length === 0) {
    errors.push({ level: 'error', code: 'no_nodes', message: 'Workflow has no nodes' });
  }

  const names = new Set<string>();
  for (const node of nodes) {
    if (!node?.name) {
      errors.push({ level: 'error', code: 'node_missing_name', message: 'A node is missing a name' });
      continue;
    }
    if (names.has(node.name)) {
      errors.push({
        level: 'error',
        code: 'duplicate_name',
        message: `Duplicate node name: ${node.name}`,
        node: node.name,
      });
    }
    names.add(node.name);

    if (!node.type) {
      errors.push({
        level: 'error',
        code: 'node_missing_type',
        message: `Node "${node.name}" is missing type`,
        node: node.name,
      });
    }

    if (!Array.isArray(node.position) || node.position.length < 2) {
      warnings.push({
        level: 'warning',
        code: 'node_missing_position',
        message: `Node "${node.name}" should have a [x, y] position`,
        node: node.name,
      });
    }

    const catalog = node.type ? getNode(node.type) : undefined;
    if (node.type && !catalog && !String(node.type).startsWith('n8n-nodes-') && !String(node.type).includes('n8n-nodes-langchain')) {
      warnings.push({
        level: 'warning',
        code: 'unknown_node_type',
        message: `Unknown node type "${node.type}" on "${node.name}". Check n8n_search_nodes or n8n_get_node.`,
        node: node.name,
      });
    }

    if (catalog) {
      for (const param of catalog.requiredParams) {
        const value = node.parameters?.[param];
        if (value === undefined || value === null || value === '') {
          errors.push({
            level: 'error',
            code: 'missing_param',
            message: `Node "${node.name}" (${catalog.displayName}) is missing required parameter "${param}"`,
            node: node.name,
          });
        }
      }
      if (catalog.needsCredentials && !node.credentials) {
        warnings.push({
          level: 'warning',
          code: 'missing_credentials',
          message: `Node "${node.name}" usually needs credentials. Create them in n8n before activating.`,
          node: node.name,
        });
      }
    }
  }

  const connections = workflow.connections ?? {};
  for (const [source, outputs] of Object.entries(connections)) {
    if (!names.has(source)) {
      errors.push({
        level: 'error',
        code: 'unknown_source',
        message: `Connection source "${source}" does not match any node name`,
      });
      continue;
    }
    const mains = (outputs as any)?.main ?? [];
    for (const branch of mains) {
      for (const link of branch ?? []) {
        if (link?.node && !names.has(link.node)) {
          errors.push({
            level: 'error',
            code: 'unknown_target',
            message: `Connection from "${source}" points to unknown node "${link.node}"`,
            node: source,
          });
        }
      }
    }
  }

  const connected = new Set<string>();
  for (const outputs of Object.values(connections)) {
    const mains = (outputs as any)?.main ?? [];
    for (const branch of mains) {
      for (const link of branch ?? []) {
        if (link?.node) connected.add(link.node);
      }
    }
  }
  const triggers = nodes.filter((n) =>
    String(n.type || '').toLowerCase().includes('trigger') ||
    n.type === 'n8n-nodes-base.webhook' ||
    n.type === 'n8n-nodes-base.manualTrigger'
  );
  if (nodes.length > 1 && triggers.length === 0) {
    warnings.push({
      level: 'warning',
      code: 'no_trigger',
      message: 'Workflow has no trigger (Webhook, Schedule, Manual). It can only run if another workflow calls it.',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
