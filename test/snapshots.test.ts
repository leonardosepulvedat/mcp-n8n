import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { saveSnapshot, listSnapshots, loadSnapshot } from '../src/snapshots.js';

const workflow = {
  name: 'Test workflow',
  nodes: [{ name: 'Start', type: 'n8n-nodes-base.manualTrigger', position: [0, 0] }],
  connections: {},
  settings: { executionOrder: 'v1' },
};

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mcp-n8n-snapshots-'));
  process.env.N8N_SNAPSHOT_DIR = dir;
});

afterEach(() => {
  delete process.env.N8N_SNAPSHOT_DIR;
  rmSync(dir, { recursive: true, force: true });
});

describe('snapshots', () => {
  it('saves and lists snapshots', () => {
    const info = saveSnapshot('wf1', workflow, 'before update');
    expect(info).not.toBeNull();
    const list = listSnapshots('wf1');
    expect(list).toHaveLength(1);
    expect(list[0].reason).toBe('before update');
    expect(list[0].name).toBe('Test workflow');
  });

  it('loads the latest snapshot by default', async () => {
    saveSnapshot('wf1', { ...workflow, name: 'v1' }, 'first');
    await new Promise((r) => setTimeout(r, 5));
    saveSnapshot('wf1', { ...workflow, name: 'v2' }, 'second');
    const loaded = loadSnapshot('wf1');
    expect(loaded?.workflow.name).toBe('v2');
    expect(loaded?.info.reason).toBe('second');
  });

  it('loads a specific snapshot by timestamp', async () => {
    saveSnapshot('wf1', { ...workflow, name: 'v1' }, 'first');
    await new Promise((r) => setTimeout(r, 5));
    saveSnapshot('wf1', { ...workflow, name: 'v2' }, 'second');
    const list = listSnapshots('wf1');
    const oldest = list[list.length - 1];
    const loaded = loadSnapshot('wf1', oldest.timestamp);
    expect(loaded?.workflow.name).toBe('v1');
  });

  it('returns null when there are no snapshots', () => {
    expect(loadSnapshot('missing')).toBeNull();
    expect(listSnapshots('missing')).toEqual([]);
  });

  it('keeps snapshots isolated per workflow', () => {
    saveSnapshot('wf1', workflow, 'a');
    saveSnapshot('wf2', workflow, 'b');
    expect(listSnapshots('wf1')).toHaveLength(1);
    expect(listSnapshots('wf2')).toHaveLength(1);
  });

  it('sanitizes unsafe workflow ids into safe paths', () => {
    const info = saveSnapshot('../evil/id', workflow, 'test');
    expect(info).not.toBeNull();
    expect(info!.file.startsWith(dir)).toBe(true);
    expect(info!.file).not.toContain('..');
  });
});
