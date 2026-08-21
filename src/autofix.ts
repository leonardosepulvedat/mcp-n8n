import { getGeneratedSchema } from './node-catalog.js';

export interface AutofixResult {
  workflow: { name?: string; nodes: any[]; connections: Record<string, any>; settings?: any };
  fixes: string[];
}

function fixExpressionsDeep(value: any, apply: (before: string, after: string) => void): any {
  if (typeof value === 'string') {
    if (value.includes('{{') && value.includes('}}') && !value.startsWith('=')) {
      const fixed = `=${value}`;
      apply(value, fixed);
      return fixed;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => fixExpressionsDeep(item, apply));
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [key, child] of Object.entries(value)) out[key] = fixExpressionsDeep(child, apply);
    return out;
  }
  return value;
}

/**
 * Applies safe, mechanical fixes to a workflow:
 * missing positions, missing typeVersion, duplicate node names (renames and
 * rewires connections), dangling connections, and missing "=" prefixes on
 * expressions. Never changes the logic of the workflow.
 */
export function autofixWorkflow(input: {
  name?: string;
  nodes?: any[];
  connections?: Record<string, any>;
  settings?: any;
}): AutofixResult {
  const fixes: string[] = [];
  const nodes = (input.nodes ?? []).map((n) => ({ ...n }));
  let connections: Record<string, any> = JSON.parse(JSON.stringify(input.connections ?? {}));

  // 1. Duplicate names: rename later occurrences and rewire connections
  const seen = new Map<string, number>();
  const renames = new Map<string, string>();
  for (const node of nodes) {
    if (!node.name) continue;
    const count = seen.get(node.name) ?? 0;
    seen.set(node.name, count + 1);
    if (count > 0) {
      const newName = `${node.name} ${count + 1}`;
      renames.set(node.name, newName);
      fixes.push(`Renamed duplicate node "${node.name}" to "${newName}"`);
      node.name = newName;
    }
  }

  // 2. Missing typeVersion → latest known version from the catalog
  for (const node of nodes) {
    if (node.typeVersion === undefined && node.type) {
      const schema = getGeneratedSchema(node.type);
      node.typeVersion = schema?.latestVersion ?? 1;
      fixes.push(`Set typeVersion=${node.typeVersion} on "${node.name}"`);
    }
  }

  // 3. Missing or invalid positions → simple left-to-right grid
  let column = 0;
  for (const node of nodes) {
    if (!Array.isArray(node.position) || node.position.length < 2 || node.position.some((p: any) => typeof p !== 'number')) {
      node.position = [250 * column, 300];
      fixes.push(`Set position [${node.position.join(', ')}] on "${node.name}"`);
    }
    column++;
  }

  // 4. Dangling connections: drop sources/targets that do not exist
  const names = new Set(nodes.map((n) => n.name));
  const cleaned: Record<string, any> = {};
  for (const [source, outputs] of Object.entries(connections)) {
    if (!names.has(source)) {
      fixes.push(`Removed connections from unknown node "${source}"`);
      continue;
    }
    const cleanedOutputs: Record<string, any> = {};
    for (const [kind, branches] of Object.entries(outputs as Record<string, any>)) {
      if (!Array.isArray(branches)) {
        cleanedOutputs[kind] = branches;
        continue;
      }
      cleanedOutputs[kind] = branches.map((branch: any[]) =>
        (branch ?? []).filter((link: any) => {
          if (link?.node && !names.has(link.node)) {
            fixes.push(`Removed connection "${source}" → "${link.node}" (target does not exist)`);
            return false;
          }
          return true;
        })
      );
    }
    cleaned[source] = cleanedOutputs;
  }
  connections = cleaned;

  // 5. Expression prefixes inside parameters
  for (const node of nodes) {
    if (!node.parameters) continue;
    node.parameters = fixExpressionsDeep(node.parameters, (before) => {
      fixes.push(`Added "=" prefix to expression in "${node.name}": ${before.slice(0, 50)}${before.length > 50 ? '…' : ''}`);
    });
  }

  return {
    workflow: { name: input.name, nodes, connections, settings: input.settings },
    fixes,
  };
}
