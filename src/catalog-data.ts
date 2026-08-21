import { readFileSync } from 'fs';
import { gunzipSync } from 'zlib';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface GeneratedProperty {
  name: string;
  displayName: string;
  type: string;
  required?: boolean;
  description?: string;
  default?: unknown;
  options?: unknown[];
  /** displayOptions.show conditions: this property only applies when these parameter values match */
  show?: Record<string, unknown[]>;
}

export interface GeneratedNode {
  type: string;
  displayName: string;
  description: string;
  group: string[];
  isTrigger: boolean;
  latestVersion: number;
  credentials: { name: string; required?: boolean }[];
  properties: GeneratedProperty[];
}

interface CatalogFile {
  generatedAt: string;
  packages: Record<string, string>;
  nodeCount: number;
  nodes: GeneratedNode[];
}

let cache: CatalogFile | null | undefined;

export function loadGeneratedCatalog(): CatalogFile | null {
  if (cache !== undefined) return cache;
  try {
    const raw = gunzipSync(readFileSync(join(__dirname, '..', 'data', 'nodes.json.gz')));
    cache = JSON.parse(raw.toString('utf8'));
  } catch {
    cache = null;
  }
  return cache ?? null;
}

const byType = new Map<string, GeneratedNode>();
let indexed = false;

function ensureIndex(): void {
  if (indexed) return;
  const catalog = loadGeneratedCatalog();
  if (catalog) {
    for (const node of catalog.nodes) {
      byType.set(node.type.toLowerCase(), node);
      // Short name without package prefix ("slack", "agent")
      const short = node.type.split('.').pop();
      if (short && !byType.has(short.toLowerCase())) byType.set(short.toLowerCase(), node);
    }
  }
  indexed = true;
}

export function findGeneratedNode(typeOrName: string): GeneratedNode | undefined {
  ensureIndex();
  const q = typeOrName.toLowerCase().trim();
  const direct = byType.get(q);
  if (direct) return direct;
  const catalog = loadGeneratedCatalog();
  if (!catalog) return undefined;
  return catalog.nodes.find((n) => n.displayName.toLowerCase() === q);
}

export function allGeneratedNodes(): GeneratedNode[] {
  return loadGeneratedCatalog()?.nodes ?? [];
}

export function catalogInfo(): { nodeCount: number; packages: Record<string, string> } | null {
  const catalog = loadGeneratedCatalog();
  return catalog ? { nodeCount: catalog.nodeCount, packages: catalog.packages } : null;
}
