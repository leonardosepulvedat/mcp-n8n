import { getNode, getGeneratedSchema } from './node-catalog.js';
import { catalogInfo, type GeneratedNode } from './catalog-data.js';

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

const KNOWN_PACKAGE_PREFIXES = ['n8n-nodes-base.', '@n8n/n8n-nodes-langchain.'];

function isExpression(value: unknown): boolean {
  return typeof value === 'string' && (value.startsWith('=') || value.includes('{{'));
}

/** Resolves the effective value of a parameter, falling back to the schema default. */
function paramValue(schema: GeneratedNode | undefined, parameters: Record<string, any>, name: string): unknown {
  if (parameters && name in parameters) return parameters[name];
  return schema?.properties.find((p) => p.name === name)?.default;
}

/** Checks displayOptions.show conditions: the property applies only when all match. */
function propertyApplies(
  schema: GeneratedNode,
  parameters: Record<string, any>,
  show: Record<string, unknown[]> | undefined
): boolean {
  if (!show) return true;
  for (const [key, allowed] of Object.entries(show)) {
    const value = paramValue(schema, parameters, key);
    if (isExpression(value)) return false; // cannot evaluate statically; do not flag
    if (!allowed.some((a) => a === value)) return false;
  }
  return true;
}

/** Recursively walks parameter values, calling visit(path, stringValue) on every string. */
function walkStrings(value: unknown, path: string, visit: (path: string, text: string) => void): void {
  if (typeof value === 'string') {
    visit(path, value);
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => walkStrings(item, `${path}[${i}]`, visit));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      walkStrings(child, path ? `${path}.${key}` : key, visit);
    }
  }
}

const NODE_REF_PATTERNS = [/\$\(\s*'([^']+)'\s*\)/g, /\$\(\s*"([^"]+)"\s*\)/g, /\$node\[["']([^"']+)["']\]/g];

export function validateWorkflow(workflow: {
  name?: string;
  nodes?: any[];
  connections?: Record<string, any>;
}): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const hasGeneratedCatalog = catalogInfo() !== null;

  if (!workflow.name || !String(workflow.name).trim()) {
    errors.push({ level: 'error', code: 'missing_name', message: 'Workflow name is required' });
  }

  const nodes = workflow.nodes ?? [];
  if (nodes.length === 0) {
    errors.push({ level: 'error', code: 'no_nodes', message: 'Workflow has no nodes' });
  }

  const names = new Set<string>();
  for (const node of nodes) {
    if (node?.name) names.add(node.name);
  }

  for (const node of nodes) {
    if (!node?.name) {
      errors.push({ level: 'error', code: 'node_missing_name', message: 'A node is missing a name' });
      continue;
    }
    const seenBefore = nodes.filter((n) => n?.name === node.name).length > 1;
    if (seenBefore && nodes.find((n) => n?.name === node.name) !== node) {
      errors.push({
        level: 'error',
        code: 'duplicate_name',
        message: `Duplicate node name: ${node.name}`,
        node: node.name,
      });
    }

    if (!node.type) {
      errors.push({
        level: 'error',
        code: 'node_missing_type',
        message: `Node "${node.name}" is missing type`,
        node: node.name,
      });
      continue;
    }

    if (!Array.isArray(node.position) || node.position.length < 2) {
      warnings.push({
        level: 'warning',
        code: 'node_missing_position',
        message: `Node "${node.name}" should have a [x, y] position`,
        node: node.name,
      });
    }

    const schema = getGeneratedSchema(node.type);
    const detail = getNode(node.type);
    const typeStr = String(node.type);
    const isKnownPackage = KNOWN_PACKAGE_PREFIXES.some((p) => typeStr.startsWith(p));

    if (!schema && !detail) {
      if (isKnownPackage && hasGeneratedCatalog) {
        errors.push({
          level: 'error',
          code: 'unknown_node_type',
          message: `Node type "${node.type}" does not exist in ${typeStr.split('.')[0]}. Use n8n_search_nodes to find the correct type.`,
          node: node.name,
        });
      } else {
        warnings.push({
          level: 'warning',
          code: 'unknown_node_type',
          message: `Unknown node type "${node.type}" on "${node.name}" (may be a community node not in the catalog).`,
          node: node.name,
        });
      }
      continue;
    }

    if (schema && typeof node.typeVersion === 'number' && node.typeVersion > schema.latestVersion) {
      warnings.push({
        level: 'warning',
        code: 'type_version_too_high',
        message: `Node "${node.name}" uses typeVersion ${node.typeVersion} but the latest known version of ${schema.displayName} is ${schema.latestVersion}.`,
        node: node.name,
      });
    }

    const parameters = node.parameters ?? {};

    // Required parameters without display conditions (plus curated overrides)
    if (detail) {
      for (const param of detail.requiredParams) {
        const value = parameters[param];
        if (value === undefined || value === null || value === '') {
          errors.push({
            level: 'error',
            code: 'missing_param',
            message: `Node "${node.name}" (${detail.displayName}) is missing required parameter "${param}"`,
            node: node.name,
          });
        }
      }
    }

    if (schema) {
      for (const prop of schema.properties) {
        if (!prop.show) continue;
        if (!propertyApplies(schema, parameters, prop.show)) continue;
        // Conditionally required parameter is visible in the current configuration
        if (prop.required) {
          const value = parameters[prop.name];
          if (value === undefined || value === null || value === '') {
            errors.push({
              level: 'error',
              code: 'missing_param',
              message: `Node "${node.name}" (${schema.displayName}) is missing required parameter "${prop.name}" (required when ${Object.entries(prop.show).map(([k, v]) => `${k}=${v.join('|')}`).join(', ')})`,
              node: node.name,
            });
          }
        }
      }

      // Option values must be one of the allowed choices (unless it is an expression)
      for (const prop of schema.properties) {
        if (!prop.options || prop.options.length === 0) continue;
        const value = parameters[prop.name];
        if (value === undefined || value === null || value === '') continue;
        if (typeof value !== 'string' || isExpression(value)) continue;
        if (!propertyApplies(schema, parameters, prop.show)) continue;
        if (!prop.options.includes(value)) {
          warnings.push({
            level: 'warning',
            code: 'invalid_option',
            message: `Node "${node.name}": "${value}" is not a known value for "${prop.name}" (expected one of: ${prop.options.slice(0, 10).join(', ')}${prop.options.length > 10 ? ', …' : ''})`,
            node: node.name,
          });
        }
      }

      if (schema.credentials.length > 0 && !node.credentials) {
        warnings.push({
          level: 'warning',
          code: 'missing_credentials',
          message: `Node "${node.name}" usually needs credentials (${schema.credentials.map((c) => c.name).join(' or ')}). Create them in n8n before activating.`,
          node: node.name,
        });
      }
    } else if (detail?.needsCredentials && !node.credentials) {
      warnings.push({
        level: 'warning',
        code: 'missing_credentials',
        message: `Node "${node.name}" usually needs credentials. Create them in n8n before activating.`,
        node: node.name,
      });
    }

    // Expression linting
    walkStrings(parameters, '', (path, text) => {
      if (text.includes('{{') && text.includes('}}') && !text.startsWith('=')) {
        warnings.push({
          level: 'warning',
          code: 'expression_missing_prefix',
          message: `Node "${node.name}" parameter "${path}" contains {{ }} but does not start with "=" — n8n will treat it as plain text. Use "=${text.slice(0, 40)}…"`,
          node: node.name,
        });
      }
      for (const pattern of NODE_REF_PATTERNS) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(text)) !== null) {
          const referenced = match[1];
          if (!names.has(referenced)) {
            warnings.push({
              level: 'warning',
              code: 'expression_unknown_node',
              message: `Node "${node.name}" parameter "${path}" references node "${referenced}" which does not exist in this workflow.`,
              node: node.name,
            });
          }
        }
      }
    });
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
    for (const branches of Object.values(outputs as Record<string, any>)) {
      if (!Array.isArray(branches)) continue;
      for (const branch of branches) {
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
  }

  const triggers = nodes.filter((n) => {
    const schema = n?.type ? getGeneratedSchema(n.type) : undefined;
    if (schema) return schema.isTrigger;
    return String(n?.type || '').toLowerCase().includes('trigger') || n?.type === 'n8n-nodes-base.webhook';
  });
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
