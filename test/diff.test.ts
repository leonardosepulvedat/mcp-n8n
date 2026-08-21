import { describe, it, expect } from 'vitest';
import { diffWorkflows } from '../src/diff.js';

const base = {
  name: 'Flow',
  nodes: [
    { name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: { path: 'a' } },
    { name: 'Slack', type: 'n8n-nodes-base.slack', position: [200, 0], parameters: { text: 'hi' } },
  ],
  connections: { Webhook: { main: [[{ node: 'Slack', type: 'main', index: 0 }]] } },
};

describe('diffWorkflows', () => {
  it('detects identical workflows', () => {
    expect(diffWorkflows(base, JSON.parse(JSON.stringify(base))).identical).toBe(true);
  });

  it('detects added, removed and modified nodes', () => {
    const changed = JSON.parse(JSON.stringify(base));
    changed.nodes[1].parameters.text = 'bye';
    changed.nodes.push({ name: 'Code', type: 'n8n-nodes-base.code', position: [400, 0], parameters: {} });
    changed.nodes = changed.nodes.filter((n: any) => n.name !== 'Webhook');
    changed.connections = {};

    const diff = diffWorkflows(base, changed);
    expect(diff.nodesAdded).toEqual(['Code']);
    expect(diff.nodesRemoved).toEqual(['Webhook']);
    expect(diff.nodesModified[0]).toMatchObject({ name: 'Slack', changedParameters: ['text'] });
    expect(diff.connectionsRemoved.length).toBe(1);
    expect(diff.identical).toBe(false);
  });

  it('detects connection and name changes', () => {
    const changed = JSON.parse(JSON.stringify(base));
    changed.name = 'Flow v2';
    changed.connections.Slack = { main: [[{ node: 'Webhook', type: 'main', index: 0 }]] };

    const diff = diffWorkflows(base, changed);
    expect(diff.nameChanged).toEqual({ from: 'Flow', to: 'Flow v2' });
    expect(diff.connectionsAdded[0]).toContain('Slack');
  });
});
