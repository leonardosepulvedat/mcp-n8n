#!/usr/bin/env node
/**
 * Generates data/nodes.json.gz from the real n8n node packages.
 *
 * Usage:
 *   node scripts/generate-node-catalog.mjs [modulesDir]
 *
 * modulesDir must be a node_modules folder containing n8n-nodes-base and
 * @n8n/n8n-nodes-langchain. If omitted, the script installs them into a
 * temporary folder (requires network access).
 */
import { createRequire } from 'module';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, existsSync, mkdtempSync } from 'fs';
import { gzipSync } from 'zlib';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGES = ['n8n-nodes-base', '@n8n/n8n-nodes-langchain'];

let modulesDir = process.argv[2];
if (!modulesDir) {
  const work = mkdtempSync(join(tmpdir(), 'mcp-n8n-catalog-'));
  console.log(`Installing node packages into ${work} (this takes a few minutes)...`);
  execSync(`npm init -y >/dev/null && npm install --no-audit --no-fund ${PACKAGES.join(' ')}`, {
    cwd: work,
    stdio: 'inherit',
    shell: '/bin/bash',
  });
  modulesDir = join(work, 'node_modules');
}

const requireFrom = createRequire(join(modulesDir, 'noop.js'));

function truncate(text, max) {
  if (typeof text !== 'string') return undefined;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function compactProperty(prop) {
  const out = {
    name: prop.name,
    displayName: prop.displayName,
    type: prop.type,
  };
  if (prop.required === true) out.required = true;
  if (prop.description) out.description = truncate(prop.description, 140);
  if (prop.default !== undefined) {
    const json = JSON.stringify(prop.default);
    if (json !== undefined && json.length <= 120) out.default = prop.default;
  }
  if (Array.isArray(prop.options) && prop.type === 'options') {
    out.options = prop.options
      .map((o) => (o && typeof o === 'object' ? o.value : o))
      .filter((v) => v !== undefined)
      .slice(0, 30);
  }
  if (prop.displayOptions?.show) {
    const show = {};
    for (const [key, values] of Object.entries(prop.displayOptions.show)) {
      if (key.startsWith('@')) continue; // version guards, not parameters
      if (Array.isArray(values) && JSON.stringify(values).length <= 120) show[key] = values;
    }
    if (Object.keys(show).length > 0) out.show = show;
  }
  return out;
}

function extractDescription(instance) {
  if (instance.nodeVersions) {
    const versions = Object.keys(instance.nodeVersions).map(Number);
    const latest = Math.max(...versions);
    return { desc: instance.nodeVersions[latest].description, latestVersion: latest };
  }
  const version = instance.description.version;
  const latestVersion = Array.isArray(version) ? Math.max(...version) : (version ?? 1);
  return { desc: instance.description, latestVersion };
}

const nodes = [];
const packageVersions = {};
let failures = 0;

for (const pkgName of PACKAGES) {
  const pkg = requireFrom(`${pkgName}/package.json`);
  packageVersions[pkgName] = pkg.version;
  for (const nodePath of pkg.n8n.nodes) {
    try {
      const mod = requireFrom(join(modulesDir, pkgName, nodePath));
      const baseName = nodePath.split('/').pop().replace('.node.js', '');
      const candidates = [mod[baseName], ...Object.values(mod)];
      let instance;
      for (const candidate of candidates) {
        if (typeof candidate !== 'function') continue;
        try {
          const inst = new candidate();
          if (inst?.description || inst?.nodeVersions) {
            instance = inst;
            break;
          }
        } catch {
          // not the node class; keep looking
        }
      }
      if (!instance) throw new Error('no node class export found');
      const { desc, latestVersion } = extractDescription(instance);
      const group = desc.group ?? [];
      const inputs = desc.inputs;
      nodes.push({
        type: `${pkgName}.${desc.name}`,
        displayName: desc.displayName,
        description: truncate(desc.description ?? '', 200),
        group,
        isTrigger:
          group.includes('trigger') || (Array.isArray(inputs) && inputs.length === 0),
        latestVersion,
        credentials: (desc.credentials ?? []).map((c) => ({
          name: c.name,
          ...(c.required === true && { required: true }),
        })),
        properties: (desc.properties ?? []).map(compactProperty),
      });
    } catch (error) {
      failures++;
      console.error(`  skip ${pkgName}/${nodePath}: ${error.message}`);
    }
  }
}

nodes.sort((a, b) => a.type.localeCompare(b.type));

const catalog = {
  generatedAt: new Date().toISOString(),
  packages: packageVersions,
  nodeCount: nodes.length,
  nodes,
};

const outDir = join(__dirname, '..', 'data');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const raw = JSON.stringify(catalog);
const gz = gzipSync(Buffer.from(raw), { level: 9 });
writeFileSync(join(outDir, 'nodes.json.gz'), gz);

console.log(
  `Generated ${nodes.length} nodes (${failures} failed) from ${Object.entries(packageVersions)
    .map(([n, v]) => `${n}@${v}`)
    .join(', ')} — raw ${(raw.length / 1024 / 1024).toFixed(2)} MB, gzip ${(gz.length / 1024).toFixed(0)} KB`
);
