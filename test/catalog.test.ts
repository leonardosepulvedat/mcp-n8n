import { describe, it, expect } from 'vitest';
import { loadGeneratedCatalog, findGeneratedNode } from '../src/catalog-data.js';
import { searchNodes, getNode, catalogStats } from '../src/node-catalog.js';

describe('generated catalog', () => {
  it('loads more than 500 nodes from the real packages', () => {
    const catalog = loadGeneratedCatalog();
    expect(catalog).not.toBeNull();
    expect(catalog!.nodes.length).toBeGreaterThan(500);
    expect(catalogStats().nodeCount).toBeGreaterThan(500);
  });

  it('has real parameter schemas with options and display conditions', () => {
    const slack = findGeneratedNode('n8n-nodes-base.slack');
    expect(slack).toBeDefined();
    expect(slack!.latestVersion).toBeGreaterThanOrEqual(2.4);
    const resource = slack!.properties.find((p) => p.name === 'resource');
    expect(resource?.options).toContain('message');
    expect(slack!.credentials.map((c) => c.name)).toContain('slackApi');
  });

  it('includes LangChain AI nodes', () => {
    expect(findGeneratedNode('@n8n/n8n-nodes-langchain.agent')).toBeDefined();
    expect(findGeneratedNode('@n8n/n8n-nodes-langchain.lmChatOpenAi')).toBeDefined();
  });

  it('finds nodes beyond the curated list', () => {
    const hits = searchNodes('clickup');
    expect(hits.some((h) => h.type === 'n8n-nodes-base.clickUp')).toBe(true);
  });

  it('marks triggers correctly', () => {
    expect(findGeneratedNode('n8n-nodes-base.webhook')?.isTrigger).toBe(true);
    expect(findGeneratedNode('n8n-nodes-base.slack')?.isTrigger).toBe(false);
  });

  it('getNode merges generated schema with curated notes', () => {
    const webhook = getNode('webhook');
    expect(webhook?.type).toBe('n8n-nodes-base.webhook');
    expect(webhook?.parameters.length).toBeGreaterThan(3);
    expect(webhook?.docs).toContain('docs.n8n.io');
    expect(webhook?.exampleParameters).toBeDefined();
  });
});
