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
  // ----- More triggers -----
  {
    type: 'n8n-nodes-base.gmailTrigger',
    displayName: 'Gmail Trigger',
    category: 'trigger',
    aliases: ['gmail trigger', 'new email', 'email trigger'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.gmailtrigger/',
    notes: 'Polls Gmail for new messages. Needs Google credentials.',
    exampleParameters: { pollTimes: { item: [{ mode: 'everyMinute' }] } },
  },
  {
    type: 'n8n-nodes-base.telegramTrigger',
    displayName: 'Telegram Trigger',
    category: 'trigger',
    aliases: ['telegram trigger', 'telegram bot trigger'],
    typeVersion: 1,
    requiredParams: ['updates'],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.telegramtrigger/',
    notes: 'Fires on Telegram bot updates such as incoming messages.',
    exampleParameters: { updates: ['message'] },
  },
  {
    type: 'n8n-nodes-base.errorTrigger',
    displayName: 'Error Trigger',
    category: 'trigger',
    aliases: ['error trigger', 'on error', 'error handler'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.errortrigger/',
    notes: 'Starts an error-handling workflow. Set it as errorWorkflow in the settings of other workflows.',
    exampleParameters: {},
  },
  {
    type: 'n8n-nodes-base.formTrigger',
    displayName: 'n8n Form Trigger',
    category: 'trigger',
    aliases: ['form', 'form trigger', 'survey'],
    typeVersion: 2,
    requiredParams: ['formTitle'],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.formtrigger/',
    notes: 'Generates a hosted form whose submissions start the workflow.',
    exampleParameters: { formTitle: 'Contact form', formFields: { values: [{ fieldLabel: 'Email' }] } },
  },
  {
    type: 'n8n-nodes-base.executeWorkflowTrigger',
    displayName: 'Execute Workflow Trigger',
    category: 'trigger',
    aliases: ['subworkflow trigger', 'called by another workflow'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflowtrigger/',
    notes: 'Entry point for workflows called via the Execute Workflow node.',
    exampleParameters: {},
  },
  {
    type: 'n8n-nodes-base.emailReadImap',
    displayName: 'Email Trigger (IMAP)',
    category: 'trigger',
    aliases: ['imap', 'read email', 'inbox'],
    typeVersion: 2,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.emailimap/',
    notes: 'Watches a mailbox over IMAP.',
    exampleParameters: { mailbox: 'INBOX' },
  },
  {
    type: '@n8n/n8n-nodes-langchain.chatTrigger',
    displayName: 'Chat Trigger',
    category: 'trigger',
    aliases: ['chat', 'chat trigger', 'chatbot'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger/',
    notes: 'Starts AI chat workflows; usually connected to an AI Agent.',
    exampleParameters: {},
  },
  // ----- More core / data utilities -----
  {
    type: 'n8n-nodes-base.wait',
    displayName: 'Wait',
    category: 'core',
    aliases: ['wait', 'delay', 'pause', 'sleep'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/',
    notes: 'Pauses the execution for a time interval or until a webhook call.',
    exampleParameters: { amount: 5, unit: 'seconds' },
  },
  {
    type: 'n8n-nodes-base.filter',
    displayName: 'Filter',
    category: 'core',
    aliases: ['filter', 'where', 'keep items'],
    typeVersion: 2,
    requiredParams: ['conditions'],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.filter/',
    notes: 'Keeps only the items that match the conditions.',
    exampleParameters: { conditions: { options: { caseSensitive: true }, conditions: [] } },
  },
  {
    type: 'n8n-nodes-base.splitOut',
    displayName: 'Split Out',
    category: 'core',
    aliases: ['split out', 'explode array', 'flatten'],
    typeVersion: 1,
    requiredParams: ['fieldToSplitOut'],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitout/',
    notes: 'Turns an array field into individual items.',
    exampleParameters: { fieldToSplitOut: 'results' },
  },
  {
    type: 'n8n-nodes-base.aggregate',
    displayName: 'Aggregate',
    category: 'core',
    aliases: ['aggregate', 'group', 'collect items'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.aggregate/',
    notes: 'Combines multiple items into one (opposite of Split Out).',
    exampleParameters: { aggregate: 'aggregateAllItemData' },
  },
  {
    type: 'n8n-nodes-base.sort',
    displayName: 'Sort',
    category: 'core',
    aliases: ['sort', 'order by'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.sort/',
    notes: 'Sorts items by one or more fields.',
    exampleParameters: { sortFieldsUi: { sortField: [{ fieldName: 'createdAt', order: 'descending' }] } },
  },
  {
    type: 'n8n-nodes-base.limit',
    displayName: 'Limit',
    category: 'core',
    aliases: ['limit', 'top n', 'first items'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.limit/',
    notes: 'Keeps only the first N items.',
    exampleParameters: { maxItems: 10 },
  },
  {
    type: 'n8n-nodes-base.removeDuplicates',
    displayName: 'Remove Duplicates',
    category: 'core',
    aliases: ['dedupe', 'unique', 'remove duplicates'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.removeduplicates/',
    notes: 'Removes items with duplicate values.',
    exampleParameters: { compare: 'allFields' },
  },
  {
    type: 'n8n-nodes-base.dateTime',
    displayName: 'Date & Time',
    category: 'core',
    aliases: ['date', 'time', 'format date'],
    typeVersion: 2,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.datetime/',
    notes: 'Formats and does math with dates.',
    exampleParameters: { action: 'getCurrentDate' },
  },
  {
    type: 'n8n-nodes-base.html',
    displayName: 'HTML',
    category: 'core',
    aliases: ['html', 'scrape', 'extract html'],
    typeVersion: 1,
    requiredParams: ['operation'],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.html/',
    notes: 'Extracts content from HTML using CSS selectors, or generates HTML.',
    exampleParameters: { operation: 'extractHtmlContent' },
  },
  {
    type: 'n8n-nodes-base.markdown',
    displayName: 'Markdown',
    category: 'core',
    aliases: ['markdown', 'md to html'],
    typeVersion: 1,
    requiredParams: ['mode'],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.markdown/',
    notes: 'Converts between Markdown and HTML.',
    exampleParameters: { mode: 'markdownToHtml' },
  },
  {
    type: 'n8n-nodes-base.extractFromFile',
    displayName: 'Extract From File',
    category: 'core',
    aliases: ['extract file', 'parse csv', 'parse pdf', 'read file content'],
    typeVersion: 1,
    requiredParams: ['operation'],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.extractfromfile/',
    notes: 'Reads CSV, JSON, PDF, text, and more out of binary data.',
    exampleParameters: { operation: 'csv' },
  },
  {
    type: 'n8n-nodes-base.convertToFile',
    displayName: 'Convert To File',
    category: 'core',
    aliases: ['convert file', 'to csv', 'to binary'],
    typeVersion: 1,
    requiredParams: ['operation'],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.converttofile/',
    notes: 'Turns JSON items into a binary file (CSV, XLSX, etc.).',
    exampleParameters: { operation: 'csv' },
  },
  {
    type: 'n8n-nodes-base.executeWorkflow',
    displayName: 'Execute Workflow',
    category: 'core',
    aliases: ['subworkflow', 'call workflow', 'execute workflow'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/',
    notes: 'Calls another workflow (which must start with an Execute Workflow Trigger).',
    exampleParameters: { source: 'database', workflowId: '' },
  },
  {
    type: 'n8n-nodes-base.executeCommand',
    displayName: 'Execute Command',
    category: 'core',
    aliases: ['shell', 'command', 'bash'],
    typeVersion: 1,
    requiredParams: ['command'],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executecommand/',
    notes: 'Runs a shell command on the n8n host. Not available on n8n Cloud.',
    exampleParameters: { command: 'echo hello' },
  },
  {
    type: 'n8n-nodes-base.rssFeedRead',
    displayName: 'RSS Read',
    category: 'core',
    aliases: ['rss', 'feed', 'news'],
    typeVersion: 1,
    requiredParams: ['url'],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.rssfeedread/',
    notes: 'Reads entries from an RSS feed URL.',
    exampleParameters: { url: 'https://example.com/feed.xml' },
  },
  {
    type: 'n8n-nodes-base.ftp',
    displayName: 'FTP',
    category: 'core',
    aliases: ['ftp', 'sftp', 'file transfer'],
    typeVersion: 1,
    requiredParams: ['operation'],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.ftp/',
    notes: 'Uploads and downloads files over FTP or SFTP.',
    exampleParameters: { operation: 'download', path: '/file.txt' },
  },
  {
    type: 'n8n-nodes-base.ssh',
    displayName: 'SSH',
    category: 'core',
    aliases: ['ssh', 'remote command'],
    typeVersion: 1,
    requiredParams: ['command'],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.ssh/',
    notes: 'Runs commands on a remote host over SSH.',
    exampleParameters: { command: 'uptime' },
  },
  // ----- Databases and storage -----
  {
    type: 'n8n-nodes-base.postgres',
    displayName: 'Postgres',
    category: 'data',
    aliases: ['postgres', 'postgresql', 'sql'],
    typeVersion: 2,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/',
    notes: 'Run queries or insert/update rows. Prefer query parameters over string interpolation.',
    exampleParameters: { operation: 'executeQuery', query: 'SELECT * FROM users LIMIT 10' },
  },
  {
    type: 'n8n-nodes-base.mySql',
    displayName: 'MySQL',
    category: 'data',
    aliases: ['mysql', 'mariadb'],
    typeVersion: 2,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.mysql/',
    notes: 'Run queries or insert/update rows in MySQL/MariaDB.',
    exampleParameters: { operation: 'executeQuery', query: 'SELECT 1' },
  },
  {
    type: 'n8n-nodes-base.mongoDb',
    displayName: 'MongoDB',
    category: 'data',
    aliases: ['mongo', 'mongodb'],
    typeVersion: 1,
    requiredParams: ['operation', 'collection'],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.mongodb/',
    notes: 'CRUD operations on MongoDB collections.',
    exampleParameters: { operation: 'find', collection: 'users' },
  },
  {
    type: 'n8n-nodes-base.redis',
    displayName: 'Redis',
    category: 'data',
    aliases: ['redis', 'cache', 'key value'],
    typeVersion: 1,
    requiredParams: ['operation'],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.redis/',
    notes: 'Get/set keys, publish messages, and more.',
    exampleParameters: { operation: 'get', key: 'my-key' },
  },
  {
    type: 'n8n-nodes-base.supabase',
    displayName: 'Supabase',
    category: 'data',
    aliases: ['supabase'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.supabase/',
    notes: 'Row operations against a Supabase project.',
    exampleParameters: { operation: 'getAll', tableId: 'users' },
  },
  {
    type: 'n8n-nodes-base.airtable',
    displayName: 'Airtable',
    category: 'data',
    aliases: ['airtable'],
    typeVersion: 2,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.airtable/',
    notes: 'CRUD on Airtable bases and tables.',
    exampleParameters: { operation: 'search' },
  },
  {
    type: 'n8n-nodes-base.notion',
    displayName: 'Notion',
    category: 'data',
    aliases: ['notion'],
    typeVersion: 2,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.notion/',
    notes: 'Work with Notion pages and databases.',
    exampleParameters: { resource: 'databasePage', operation: 'getAll' },
  },
  {
    type: 'n8n-nodes-base.awsS3',
    displayName: 'AWS S3',
    category: 'data',
    aliases: ['s3', 'aws s3', 'bucket'],
    typeVersion: 2,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.awss3/',
    notes: 'Upload, download, and list objects in S3 buckets.',
    exampleParameters: { resource: 'file', operation: 'upload' },
  },
  // ----- Google & Microsoft -----
  {
    type: 'n8n-nodes-base.googleDrive',
    displayName: 'Google Drive',
    category: 'data',
    aliases: ['drive', 'google drive'],
    typeVersion: 3,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googledrive/',
    notes: 'Upload, download, and manage Drive files. Needs Google credentials.',
    exampleParameters: { resource: 'file', operation: 'upload' },
  },
  {
    type: 'n8n-nodes-base.googleCalendar',
    displayName: 'Google Calendar',
    category: 'productivity',
    aliases: ['calendar', 'google calendar', 'event'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlecalendar/',
    notes: 'Create and query calendar events. Needs Google credentials.',
    exampleParameters: { resource: 'event', operation: 'create' },
  },
  {
    type: 'n8n-nodes-base.googleDocs',
    displayName: 'Google Docs',
    category: 'productivity',
    aliases: ['docs', 'google docs', 'document'],
    typeVersion: 2,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googledocs/',
    notes: 'Create and update Google Docs.',
    exampleParameters: { operation: 'create' },
  },
  {
    type: 'n8n-nodes-base.microsoftOutlook',
    displayName: 'Microsoft Outlook',
    category: 'communication',
    aliases: ['outlook', 'microsoft email'],
    typeVersion: 2,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.microsoftoutlook/',
    notes: 'Send and read Outlook mail.',
    exampleParameters: { resource: 'message', operation: 'send' },
  },
  {
    type: 'n8n-nodes-base.microsoftTeams',
    displayName: 'Microsoft Teams',
    category: 'communication',
    aliases: ['teams', 'ms teams'],
    typeVersion: 2,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.microsoftteams/',
    notes: 'Post messages to Teams channels and chats.',
    exampleParameters: { resource: 'channelMessage', operation: 'create' },
  },
  // ----- Messaging & business apps -----
  {
    type: 'n8n-nodes-base.discord',
    displayName: 'Discord',
    category: 'communication',
    aliases: ['discord'],
    typeVersion: 2,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.discord/',
    notes: 'Send messages to Discord channels via bot or webhook.',
    exampleParameters: { resource: 'message', operation: 'send' },
  },
  {
    type: 'n8n-nodes-base.whatsApp',
    displayName: 'WhatsApp Business Cloud',
    category: 'communication',
    aliases: ['whatsapp'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.whatsapp/',
    notes: 'Send WhatsApp messages through the Business Cloud API.',
    exampleParameters: { resource: 'message', operation: 'send' },
  },
  {
    type: 'n8n-nodes-base.twilio',
    displayName: 'Twilio',
    category: 'communication',
    aliases: ['twilio', 'sms'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.twilio/',
    notes: 'Send SMS and WhatsApp messages via Twilio.',
    exampleParameters: { resource: 'sms', operation: 'send' },
  },
  {
    type: 'n8n-nodes-base.github',
    displayName: 'GitHub',
    category: 'developer',
    aliases: ['github', 'git', 'issues', 'pull request'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.github/',
    notes: 'Manage repos, issues, PRs, and releases.',
    exampleParameters: { resource: 'issue', operation: 'create' },
  },
  {
    type: 'n8n-nodes-base.jira',
    displayName: 'Jira Software',
    category: 'productivity',
    aliases: ['jira', 'ticket'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.jira/',
    notes: 'Create and manage Jira issues.',
    exampleParameters: { resource: 'issue', operation: 'create' },
  },
  {
    type: 'n8n-nodes-base.hubspot',
    displayName: 'HubSpot',
    category: 'crm',
    aliases: ['hubspot', 'crm'],
    typeVersion: 2,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.hubspot/',
    notes: 'Manage contacts, deals, and companies.',
    exampleParameters: { resource: 'contact', operation: 'create' },
  },
  {
    type: 'n8n-nodes-base.stripe',
    displayName: 'Stripe',
    category: 'finance',
    aliases: ['stripe', 'payment', 'charge'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.stripe/',
    notes: 'Work with customers, charges, and balance.',
    exampleParameters: { resource: 'customer', operation: 'getAll' },
  },
  {
    type: 'n8n-nodes-base.shopify',
    displayName: 'Shopify',
    category: 'ecommerce',
    aliases: ['shopify', 'store', 'orders'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.shopify/',
    notes: 'Manage products and orders in a Shopify store.',
    exampleParameters: { resource: 'order', operation: 'getAll' },
  },
  {
    type: 'n8n-nodes-base.wordpress',
    displayName: 'WordPress',
    category: 'cms',
    aliases: ['wordpress', 'blog', 'post'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.wordpress/',
    notes: 'Create and update posts and pages.',
    exampleParameters: { resource: 'post', operation: 'create' },
  },
  {
    type: 'n8n-nodes-base.youTube',
    displayName: 'YouTube',
    category: 'media',
    aliases: ['youtube', 'video'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.youtube/',
    notes: 'Manage videos and playlists. Needs Google credentials.',
    exampleParameters: { resource: 'video', operation: 'getAll' },
  },
  // ----- AI / LangChain sub-nodes -----
  {
    type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
    displayName: 'OpenAI Chat Model',
    category: 'ai',
    aliases: ['openai chat model', 'gpt model', 'chat model'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenai/',
    notes: 'Sub-node: connect it to an AI Agent or Chain via the ai_languageModel connection, not main.',
    exampleParameters: { model: { value: 'gpt-4o-mini' } },
  },
  {
    type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
    displayName: 'Simple Memory',
    category: 'ai',
    aliases: ['memory', 'chat memory', 'buffer memory'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: false,
    docs: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorybufferwindow/',
    notes: 'Sub-node: gives an AI Agent short-term conversation memory via the ai_memory connection.',
    exampleParameters: { contextWindowLength: 5 },
  },
  {
    type: '@n8n/n8n-nodes-langchain.openAi',
    displayName: 'OpenAI (LangChain)',
    category: 'ai',
    aliases: ['openai langchain', 'dall-e', 'whisper', 'image generation', 'transcribe'],
    typeVersion: 1,
    requiredParams: [],
    needsCredentials: true,
    docs: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.openai/',
    notes: 'Modern OpenAI node: chat, images, audio, and assistants.',
    exampleParameters: { resource: 'text', operation: 'message' },
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

// ========== HYBRID SEARCH: generated catalog (560 nodes) + curated overlay ==========

import {
  allGeneratedNodes,
  findGeneratedNode,
  catalogInfo,
  type GeneratedNode,
  type GeneratedProperty,
} from './catalog-data.js';

const curatedByType = new Map(NODE_CATALOG.map((entry) => [entry.type.toLowerCase(), entry]));

export interface NodeSearchResult {
  type: string;
  displayName: string;
  category: string;
  description: string;
  isTrigger: boolean;
  needsCredentials: boolean;
  latestVersion: number;
}

export interface NodeDetail extends NodeSearchResult {
  credentials: { name: string; required?: boolean }[];
  requiredParams: string[];
  parameters: GeneratedProperty[];
  parametersTruncated?: boolean;
  docs?: string;
  notes?: string;
  exampleParameters?: Record<string, unknown>;
}

function toSearchResult(node: GeneratedNode): NodeSearchResult {
  return {
    type: node.type,
    displayName: node.displayName,
    category: node.isTrigger ? 'trigger' : (node.group[0] ?? 'other'),
    description: node.description,
    isTrigger: node.isTrigger,
    needsCredentials: node.credentials.length > 0,
    latestVersion: node.latestVersion,
  };
}

function curatedToSearchResult(entry: NodeCatalogEntry): NodeSearchResult {
  return {
    type: entry.type,
    displayName: entry.displayName,
    category: entry.category,
    description: entry.notes,
    isTrigger: entry.category === 'trigger',
    needsCredentials: entry.needsCredentials,
    latestVersion: entry.typeVersion,
  };
}

export function searchNodes(query: string, limit = 8): NodeSearchResult[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const generated = allGeneratedNodes();

  if (generated.length === 0) {
    // Fallback: curated-only search (generated data file missing)
    const scored = NODE_CATALOG.map((node) => {
      let score = 0;
      const haystack = [node.type, node.displayName, ...node.aliases, node.notes].join(' ').toLowerCase();
      for (const term of terms) {
        if (node.displayName.toLowerCase() === term) score += 10;
        if (node.aliases.some((a) => a === term)) score += 8;
        if (haystack.includes(term)) score += 3;
      }
      return { node, score };
    })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((row) => curatedToSearchResult(row.node));
  }

  const scored = generated
    .map((node) => {
      let score = 0;
      const displayLower = node.displayName.toLowerCase();
      const shortType = (node.type.split('.').pop() ?? '').toLowerCase();
      const descLower = node.description.toLowerCase();
      const curated = curatedByType.get(node.type.toLowerCase());
      for (const term of terms) {
        if (displayLower === term || shortType === term) score += 10;
        else if (displayLower.includes(term) || shortType.includes(term)) score += 5;
        if (curated?.aliases.some((a) => a === term)) score += 8;
        else if (curated?.aliases.some((a) => a.includes(term))) score += 4;
        if (descLower.includes(term)) score += 2;
      }
      // Slight boost for curated (most-used) nodes to break ties sensibly
      if (score > 0 && curated) score += 1;
      return { node, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.node.type.localeCompare(b.node.type));

  return scored.slice(0, limit).map((row) => toSearchResult(row.node));
}

const MAX_PARAMETERS = 100;

export function getNode(typeOrName: string): NodeDetail | undefined {
  const q = typeOrName.toLowerCase().trim();

  // Resolve curated aliases ("incoming request" → webhook) first
  const curatedMatch = NODE_CATALOG.find(
    (node) =>
      node.type.toLowerCase() === q ||
      node.displayName.toLowerCase() === q ||
      node.aliases.some((alias) => alias === q)
  );

  const generated = findGeneratedNode(curatedMatch?.type ?? typeOrName);
  const curated = curatedMatch ?? (generated ? curatedByType.get(generated.type.toLowerCase()) : undefined);

  if (!generated && !curated) return undefined;

  if (!generated) {
    // Curated-only fallback
    return {
      ...curatedToSearchResult(curated!),
      credentials: [],
      requiredParams: curated!.requiredParams,
      parameters: [],
      docs: curated!.docs,
      notes: curated!.notes,
      exampleParameters: curated!.exampleParameters as Record<string, unknown>,
    };
  }

  const requiredParams = [
    ...new Set([
      ...generated.properties.filter((p) => p.required && !p.show).map((p) => p.name),
      ...(curated?.requiredParams ?? []),
    ]),
  ];

  return {
    ...toSearchResult(generated),
    credentials: generated.credentials,
    requiredParams,
    parameters: generated.properties.slice(0, MAX_PARAMETERS),
    ...(generated.properties.length > MAX_PARAMETERS && { parametersTruncated: true }),
    ...(curated?.docs && { docs: curated.docs }),
    ...(curated?.notes && { notes: curated.notes }),
    ...(curated?.exampleParameters && {
      exampleParameters: curated.exampleParameters as Record<string, unknown>,
    }),
  };
}

export function getGeneratedSchema(type: string): GeneratedNode | undefined {
  return findGeneratedNode(type);
}

export function catalogStats(): { source: string; nodeCount: number } {
  const info = catalogInfo();
  if (info) {
    return {
      source: Object.entries(info.packages).map(([n, v]) => `${n}@${v}`).join(', '),
      nodeCount: info.nodeCount,
    };
  }
  return { source: 'curated fallback', nodeCount: NODE_CATALOG.length };
}
