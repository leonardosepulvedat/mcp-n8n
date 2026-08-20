export interface NodeCatalogEntry {
  type: string;
  displayName: string;
  category: string;
  aliases: string[];
  typeVersion: number;
  requiredParams: string[];
  needsCredentials: boolean;
  docs: string;
  notes: string;
  exampleParameters: Record<string, unknown>;
}

export const NODE_CATALOG: NodeCatalogEntry[] = [
  {
    type: 'n8n-nodes-base.webhook',
    displayName: 'Webhook',
    category: 'trigger',
    aliases: ['webhook', 'http trigger', 'incoming request'],
    typeVersion: 2,
    requiredParams: ['path', 'httpMethod'],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/',
    notes: 'Start node for incoming HTTP. Pair with respondToWebhook if you need a response.',
    exampleParameters: { path: 'hook', httpMethod: 'POST', responseMode: 'onReceived' },
  },
  {
    type: 'n8n-nodes-base.scheduleTrigger',
    displayName: 'Schedule Trigger',
    category: 'trigger',
    aliases: ['cron', 'schedule', 'timer', 'daily'],
    typeVersion: 1,
    requiredParams: ['rule'],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/',
    notes: 'Use rule.interval for recurring jobs.',
    exampleParameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } },
  },
  {
    type: 'n8n-nodes-base.manualTrigger',
    displayName: 'Manual Trigger',
    category: 'trigger',
    aliases: ['manual', 'test trigger'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.manualtrigger/',
    notes: 'Use for workflows that should only run by hand.',
    exampleParameters: {},
  },
  {
    type: 'n8n-nodes-base.httpRequest',
    displayName: 'HTTP Request',
    category: 'core',
    aliases: ['http', 'rest', 'api', 'fetch'],
    typeVersion: 4,
    requiredParams: ['url', 'method'],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/',
    notes: 'Prefer authentication via credentials, not hardcoded headers.',
    exampleParameters: { method: 'GET', url: 'https://api.example.com/data' },
  },
  {
    type: 'n8n-nodes-base.set',
    displayName: 'Edit Fields (Set)',
    category: 'core',
    aliases: ['set', 'edit fields', 'assign', 'map'],
    typeVersion: 3,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.set/',
    notes: 'Use assignments.assignments to add or overwrite fields.',
    exampleParameters: {
      assignments: { assignments: [{ name: 'status', value: 'ok', type: 'string' }] },
    },
  },
  {
    type: 'n8n-nodes-base.if',
    displayName: 'If',
    category: 'core',
    aliases: ['if', 'condition', 'branch'],
    typeVersion: 2,
    requiredParams: ['conditions'],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.if/',
    notes: 'True output is index 0, false is index 1.',
    exampleParameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [] } },
  },
  {
    type: 'n8n-nodes-base.switch',
    displayName: 'Switch',
    category: 'core',
    aliases: ['switch', 'router', 'cases'],
    typeVersion: 3,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.switch/',
    notes: 'Use for more than two branches.',
    exampleParameters: {},
  },
  {
    type: 'n8n-nodes-base.code',
    displayName: 'Code',
    category: 'core',
    aliases: ['code', 'javascript', 'js', 'function'],
    typeVersion: 2,
    requiredParams: ['jsCode'],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/',
    notes: 'Must return items as [{ json: {...} }].',
    exampleParameters: { jsCode: 'return items;' },
  },
  {
    type: 'n8n-nodes-base.merge',
    displayName: 'Merge',
    category: 'core',
    aliases: ['merge', 'join', 'combine'],
    typeVersion: 3,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge/',
    notes: 'Waits for both inputs before continuing.',
    exampleParameters: { mode: 'append' },
  },
  {
    type: 'n8n-nodes-base.splitInBatches',
    displayName: 'Split In Batches',
    category: 'core',
    aliases: ['loop', 'batch', 'split'],
    typeVersion: 3,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitinbatches/',
    notes: 'Loop over items. Connect the done output when the loop finishes.',
    exampleParameters: { batchSize: 10 },
  },
  {
    type: 'n8n-nodes-base.respondToWebhook',
    displayName: 'Respond to Webhook',
    category: 'core',
    aliases: ['respond', 'webhook response'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/',
    notes: 'Requires the Webhook node responseMode set to responseNode.',
    exampleParameters: { respondWith: 'json', responseBody: '={{ $json }}' },
  },
  {
    type: 'n8n-nodes-base.noOp',
    displayName: 'No Operation',
    category: 'core',
    aliases: ['noop', 'pass', 'placeholder'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.noop/',
    notes: 'Pass-through node. Useful as a join point.',
    exampleParameters: {},
  },
  {
    type: 'n8n-nodes-base.slack',
    displayName: 'Slack',
    category: 'communication',
    aliases: ['slack', 'message', 'channel'],
    typeVersion: 2,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack/',
    notes: 'Typical resource=message, operation=post. Needs Slack credentials.',
    exampleParameters: { resource: 'message', operation: 'post', text: 'Hello' },
  },
  {
    type: 'n8n-nodes-base.gmail',
    displayName: 'Gmail',
    category: 'communication',
    aliases: ['gmail', 'email', 'mail'],
    typeVersion: 2,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.gmail/',
    notes: 'Needs Google credentials. For sending: resource=message, operation=send.',
    exampleParameters: { resource: 'message', operation: 'send' },
  },
  {
    type: 'n8n-nodes-base.emailSend',
    displayName: 'Send Email',
    category: 'communication',
    aliases: ['smtp', 'send email', 'email'],
    typeVersion: 2,
    requiredParams: ['fromEmail', 'toEmail'],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.sendemail/',
    notes: 'SMTP credentials required.',
    exampleParameters: { fromEmail: 'alerts@example.com', toEmail: 'ops@example.com', subject: 'Alert' },
  },
  {
    type: 'n8n-nodes-base.telegram',
    displayName: 'Telegram',
    category: 'communication',
    aliases: ['telegram', 'bot'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.telegram/',
    notes: 'Needs a Telegram bot token. Do not hardcode chat IDs in shared templates.',
    exampleParameters: { resource: 'message', operation: 'sendMessage', text: 'Hello' },
  },
  {
    type: 'n8n-nodes-base.googleSheets',
    displayName: 'Google Sheets',
    category: 'data',
    aliases: ['sheets', 'spreadsheet', 'gsheet'],
    typeVersion: 4,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/',
    notes: 'Needs Google credentials and a documentId.',
    exampleParameters: { resource: 'sheet', operation: 'append' },
  },
  {
    type: 'n8n-nodes-base.openAi',
    displayName: 'OpenAI',
    category: 'ai',
    aliases: ['openai', 'gpt', 'chatgpt'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.openai/',
    notes: 'Prefer the LangChain agent nodes for newer AI workflows.',
    exampleParameters: { resource: 'text', operation: 'complete' },
  },
  {
    type: '@n8n/n8n-nodes-langchain.agent',
    displayName: 'AI Agent',
    category: 'ai',
    aliases: ['ai agent', 'langchain', 'agent'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/',
    notes: 'Needs a chat model sub-node connected as an AI connection, not a main connection.',
    exampleParameters: { promptType: 'define', text: 'You are a helpful assistant' },
  },
  {
    type: 'n8n-nodes-base.stickyNote',
    displayName: 'Sticky Note',
    category: 'core',
    aliases: ['note', 'comment', 'sticky'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.stickynote/',
    notes: 'Documentation only. Does not execute.',
    exampleParameters: { content: 'Describe this workflow here' },
  },
];

export function searchNodes(query: string, limit = 8): NodeCatalogEntry[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return NODE_CATALOG.slice(0, limit);

  const scored = NODE_CATALOG.map((node) => {
    let score = 0;
    const haystack = [node.type, node.displayName, node.category, ...node.aliases, node.notes]
      .join(' ')
      .toLowerCase();
    for (const term of terms) {
      if (node.type.toLowerCase() === term || node.displayName.toLowerCase() === term) score += 10;
      if (node.aliases.some((a) => a === term)) score += 8;
      if (haystack.includes(term)) score += 3;
    }
    return { node, score };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((row) => row.node);
}

export function getNode(typeOrName: string): NodeCatalogEntry | undefined {
  const q = typeOrName.toLowerCase();
  return NODE_CATALOG.find(
    (node) =>
      node.type.toLowerCase() === q ||
      node.displayName.toLowerCase() === q ||
      node.aliases.some((alias) => alias === q)
  );
}

export function summarizeNode(node: NodeCatalogEntry) {
  return {
    type: node.type,
    displayName: node.displayName,
    category: node.category,
    typeVersion: node.typeVersion,
    requiredParams: node.requiredParams,
    needsCredentials: node.needsCredentials,
    docs: node.docs,
    notes: node.notes,
    exampleParameters: node.exampleParameters,
  };
}
