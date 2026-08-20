import { describe, it, expect } from 'vitest';
import { searchNodes, getNode } from '../src/node-catalog.js';
import { validateWorkflow } from '../src/validate.js';
import { applyWorkflowOps } from '../src/workflow-ops.js';
import { parseToolsets } from '../src/toolsets.js';

describe('node catalog', () => {
  it('finds webhook by alias', () => {
    const hits = searchNodes('incoming webhook');
    expect(hits[0].type).toBe('n8n-nodes-base.webhook');
  });

  it('resolves slack by display name', () => {
    expect(getNode('slack')?.type).toBe('n8n-nodes-base.slack');
  });
});

describe('validateWorkflow', () => {
  it('rejects a workflow with a broken connection', () => {
    const result = validateWorkflow({
      name: 'Broken',
      nodes: [{ name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} }],
      connections: { Webhook: { main: [[{ node: 'Missing', type: 'main', index: 0 }]] } },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'unknown_target')).toBe(true);
    expect(result.errors.some((e) => e.code === 'missing_param')).toBe(true);
  });

  it('accepts a minimal valid webhook → slack flow', () => {
    const result = validateWorkflow({
      name: 'Notify',
      nodes: [
        { name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: { path: 'hook', httpMethod: 'POST' } },
        { name: 'Slack', type: 'n8n-nodes-base.slack', position: [200, 0], parameters: { resource: 'message', operation: 'post' } },
      ],
      connections: { Webhook: { main: [[{ node: 'Slack', type: 'main', index: 0 }]] } },
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.code === 'missing_credentials')).toBe(true);
  });
});

describe('applyWorkflowOps', () => {
  it('adds a node and a connection', () => {
    const result = applyWorkflowOps(
      {
        name: 'Base',
        nodes: [{ name: 'Webhook', type: 'n8n-nodes-base.webhook', parameters: { path: 'x', httpMethod: 'POST' } }],
        connections: {},
      },
      [
        { op: 'addNode', node: { name: 'Slack', type: 'n8n-nodes-base.slack' } },
        { op: 'addConnection', source: 'Webhook', target: 'Slack' },
      ]
    );
    expect(result.errors).toEqual([]);
    expect(result.workflow.nodes.map((n) => n.name)).toEqual(['Webhook', 'Slack']);
    expect(result.workflow.connections.Webhook.main[0][0].node).toBe('Slack');
  });

  it('does not connect missing nodes', () => {
    const result = applyWorkflowOps(
      { name: 'Base', nodes: [{ name: 'A', type: 'n8n-nodes-base.noOp' }] },
      [{ op: 'addConnection', source: 'A', target: 'Ghost' }]
    );
    expect(result.errors[0]).toMatch(/missing node/);
  });
});

describe('toolsets', () => {
  it('defaults to all tools', () => {
    const all = parseToolsets();
    expect(all.has('n8n_list_users')).toBe(true);
    expect(all.has('n8n_search_nodes')).toBe(true);
  });

  it('can load only core + builder', () => {
    const set = parseToolsets('core,builder');
    expect(set.has('n8n_validate_workflow')).toBe(true);
    expect(set.has('n8n_debug_last_error')).toBe(true);
    expect(set.has('n8n_list_users')).toBe(false);
  });
});
