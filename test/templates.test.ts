import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { findBestTemplate, loadTemplatesMetadata } from '../src/templates.js';
import type { TemplateMetadata } from '../src/templates.js';

const EXAMPLES_DIR = join(__dirname, '..', 'examples');

const sampleTemplates: TemplateMetadata[] = [
  {
    id: 'tpl-chatbot',
    file: 'a.json',
    name: 'AI Chatbot with Memory',
    category: 'AI/Chat',
    description: 'A chatbot that remembers conversations',
    tags: ['ai', 'chatbot'],
    keywords: ['chat', 'bot', 'memory', 'conversation'],
    useCases: ['customer support chatbot'],
    complexity: 'medium',
  },
  {
    id: 'tpl-invoice',
    file: 'b.json',
    name: 'Invoice Processing',
    category: 'Finance',
    description: 'Extract data from invoices',
    tags: ['finance', 'ocr'],
    keywords: ['invoice', 'pdf', 'extraction'],
    useCases: ['automate invoice processing'],
    complexity: 'high',
  },
];

describe('findBestTemplate', () => {
  it('matches the most relevant template for a request', () => {
    const result = findBestTemplate('I need a chatbot for customer support', sampleTemplates);
    expect(result?.id).toBe('tpl-chatbot');
  });

  it('matches on keywords', () => {
    const result = findBestTemplate('process pdf invoices', sampleTemplates);
    expect(result?.id).toBe('tpl-invoice');
  });

  it('returns null when nothing matches', () => {
    const result = findBestTemplate('quantum physics simulation', sampleTemplates);
    expect(result).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(findBestTemplate('', sampleTemplates)).toBeNull();
    expect(findBestTemplate('chatbot', [])).toBeNull();
  });
});

describe('templates integrity', () => {
  it('every metadata entry points to an existing, valid JSON file', () => {
    const metadata = loadTemplatesMetadata();
    expect(metadata.templates.length).toBeGreaterThan(0);

    const files = new Set(readdirSync(EXAMPLES_DIR));
    for (const template of metadata.templates) {
      expect(files.has(template.file), `missing file: ${template.file}`).toBe(true);
      const workflow = JSON.parse(readFileSync(join(EXAMPLES_DIR, template.file), 'utf8'));
      expect(Array.isArray(workflow.nodes), `no nodes in ${template.file}`).toBe(true);
    }
  });

  it('templates contain no values matching known API key formats', () => {
    const forbidden = [
      /cal_live_[a-z0-9]+/,
      /sk-proj-[A-Za-z0-9]/,
      /xox[bap]-/,
      /ghp_[A-Za-z0-9]{36}/,
      /sk_live_[A-Za-z0-9]{20,}/,
      /AIza[A-Za-z0-9_\-]{35}/,
      /whsec_[A-Za-z0-9]{20,}/,
    ];

    const files = readdirSync(EXAMPLES_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const content = readFileSync(join(EXAMPLES_DIR, file), 'utf8');
      for (const pattern of forbidden) {
        expect(pattern.test(content), `${String(pattern)} found in ${file}`).toBe(false);
      }
    }
  });
});
