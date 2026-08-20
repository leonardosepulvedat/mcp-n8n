import axios from 'axios';

const TEMPLATES_API = 'https://api.n8n.io/api/templates';

export interface RemoteTemplateSummary {
  id: number;
  name: string;
  description: string;
  totalViews: number;
  url: string;
  nodes: string[];
}

export async function searchRemoteTemplates(query: string, limit = 8): Promise<RemoteTemplateSummary[]> {
  const response = await axios.get(`${TEMPLATES_API}/search`, {
    params: { search: query, rows: Math.min(limit, 20) },
    timeout: 15000,
  });
  const workflows = response.data?.workflows ?? [];
  return workflows.map((item: any) => ({
    id: item.id,
    name: item.name,
    description: String(item.description || '').slice(0, 280),
    totalViews: item.totalViews ?? 0,
    url: `https://n8n.io/workflows/${item.id}`,
    nodes: (item.nodes ?? [])
      .map((node: any) => node.displayName || node.name)
      .filter(Boolean)
      .slice(0, 8),
  }));
}

export async function getRemoteTemplate(id: string | number): Promise<any> {
  const response = await axios.get(`${TEMPLATES_API}/workflows/${id}`, {
    timeout: 15000,
  });
  const workflow = response.data?.workflow ?? response.data;
  if (!workflow) {
    throw new Error(`Template ${id} not found`);
  }
  return {
    id,
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings ?? { executionOrder: 'v1' },
    url: `https://n8n.io/workflows/${id}`,
  };
}
