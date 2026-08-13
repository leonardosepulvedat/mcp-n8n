import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface TemplateMetadata {
  id: string;
  file: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  keywords: string[];
  useCases: string[];
  complexity: string;
}

export interface TemplatesData {
  templates: TemplateMetadata[];
}

export function loadTemplatesMetadata(): TemplatesData {
  try {
    const metadataPath = join(__dirname, '../examples/templates-metadata.json');
    const data = readFileSync(metadataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading templates metadata:', error);
    return { templates: [] };
  }
}

export function loadTemplateFile(filename: string): any {
  try {
    const templatePath = join(__dirname, '../examples', filename);
    const data = readFileSync(templatePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading template file:', error);
    return null;
  }
}

export function findBestTemplate(
  userRequest: string,
  templates: TemplateMetadata[]
): TemplateMetadata | null {
  if (!userRequest || templates.length === 0) {
    return null;
  }

  const searchTerms = userRequest.toLowerCase().split(/\s+/);
  const scores = templates.map(template => {
    let score = 0;

    searchTerms.forEach(term => {
      if (template.keywords.some(kw => kw.includes(term) || term.includes(kw))) {
        score += 5;
      }
      if (template.tags.some(tag => tag.includes(term) || term.includes(tag))) {
        score += 3;
      }
      if (template.name.toLowerCase().includes(term)) {
        score += 4;
      }
      if (template.description.toLowerCase().includes(term)) {
        score += 2;
      }
      if (template.useCases.some(uc => uc.toLowerCase().includes(term))) {
        score += 6;
      }
    });

    return { template, score };
  });

  scores.sort((a, b) => b.score - a.score);

  if (scores[0] && scores[0].score > 0) {
    return scores[0].template;
  }

  return null;
}

export function resolveTemplate(args: {
  templateId?: string;
  userRequest?: string;
}): TemplateMetadata | null {
  const templatesData = loadTemplatesMetadata();
  if (args.templateId) {
    return templatesData.templates.find(t => t.id === args.templateId) || null;
  }
  if (args.userRequest) {
    return findBestTemplate(args.userRequest, templatesData.templates);
  }
  return null;
}
