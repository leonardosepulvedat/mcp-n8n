import { mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const MAX_SNAPSHOTS_PER_WORKFLOW = 20;

function snapshotRoot(): string {
  return process.env.N8N_SNAPSHOT_DIR || join(homedir(), '.mcp-n8n', 'snapshots');
}

function workflowDir(workflowId: string): string {
  // Workflow IDs are alphanumeric; strip anything else to stay path-safe
  const safe = workflowId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(snapshotRoot(), safe);
}

export interface SnapshotInfo {
  timestamp: string;
  reason: string;
  name?: string;
  file: string;
}

/**
 * Saves the current state of a workflow before a mutation so it can be
 * restored with n8n_rollback_workflow. Best-effort: failures are reported
 * back but never block the mutation itself.
 */
export function saveSnapshot(workflowId: string, workflow: any, reason: string): SnapshotInfo | null {
  try {
    const dir = workflowDir(workflowId);
    mkdirSync(dir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `${timestamp}.json`);
    writeFileSync(
      file,
      JSON.stringify(
        {
          savedAt: new Date().toISOString(),
          reason,
          workflow: {
            name: workflow.name,
            nodes: workflow.nodes,
            connections: workflow.connections,
            settings: workflow.settings,
          },
        },
        null,
        2
      )
    );

    // Retention: keep only the most recent snapshots
    const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
    while (files.length > MAX_SNAPSHOTS_PER_WORKFLOW) {
      const oldest = files.shift();
      if (oldest) rmSync(join(dir, oldest), { force: true });
    }

    return { timestamp, reason, name: workflow.name, file };
  } catch {
    return null;
  }
}

export function listSnapshots(workflowId: string): SnapshotInfo[] {
  const dir = workflowDir(workflowId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse()
    .map((file) => {
      try {
        const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
        return {
          timestamp: file.replace(/\.json$/, ''),
          reason: data.reason ?? 'unknown',
          name: data.workflow?.name,
          file: join(dir, file),
        };
      } catch {
        return { timestamp: file.replace(/\.json$/, ''), reason: 'unreadable', file: join(dir, file) };
      }
    });
}

export function loadSnapshot(workflowId: string, timestamp?: string): { workflow: any; info: SnapshotInfo } | null {
  const snapshots = listSnapshots(workflowId);
  if (snapshots.length === 0) return null;
  const target = timestamp
    ? snapshots.find((s) => s.timestamp === timestamp)
    : snapshots[0];
  if (!target) return null;
  try {
    const data = JSON.parse(readFileSync(target.file, 'utf8'));
    return { workflow: data.workflow, info: target };
  } catch {
    return null;
  }
}
