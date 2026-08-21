import { describe, it, expect } from 'vitest';
import { autofixWorkflow } from '../src/autofix.js';

describe('autofixWorkflow', () => {
  it('fills in typeVersion and position', () => {
    const result = autofixWorkflow({
      name: 'Fix me',
      nodes: [{ name: 'Slack', type: 'n8n-nodes-base.slack', parameters: {} }],
      connections: {},
    });
    const node = result.workflow.nodes[0];
    expect(node.typeVersion).toBeGreaterThanOrEqual(2.4);
    expect(node.position).toEqual([0, 300]);
    expect(result.fixes.length).toBe(2);
  });

  it('renames duplicates and drops dangling connections', () => {
    const result = autofixWorkflow({
      name: 'Dups',
      nodes: [
        { name: 'A', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [0, 0] },
        { name: 'A', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [200, 0] },
      ],
      connections: { A: { main: [[{ node: 'Ghost', type: 'main', index: 0 }]] } },
    });
    expect(result.workflow.nodes.map((n: any) => n.name)).toEqual(['A', 'A 2']);
    expect(result.workflow.connections.A.main[0]).toEqual([]);
    expect(result.fixes.some((f) => f.includes('Ghost'))).toBe(true);
  });

  it('adds the = prefix to expressions', () => {
    const result = autofixWorkflow({
      name: 'Expr',
      nodes: [
        {
          name: 'Set',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [0, 0],
          parameters: { text: '{{ $json.value }}', nested: { deep: 'Hello {{ $json.name }}!' } },
        },
      ],
      connections: {},
    });
    expect(result.workflow.nodes[0].parameters.text).toBe('={{ $json.value }}');
    expect(result.workflow.nodes[0].parameters.nested.deep).toBe('=Hello {{ $json.name }}!');
  });

  it('reports nothing to fix on a clean workflow', () => {
    const result = autofixWorkflow({
      name: 'Clean',
      nodes: [{ name: 'A', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [0, 0], parameters: {} }],
      connections: {},
    });
    expect(result.fixes).toEqual([]);
  });
});
