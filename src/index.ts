#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { readFileSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { createServer as createHttpServer } from 'http';
import { N8nClient } from './n8n-client.js';
import type { ApiResponse } from './types.js';
import {
  loadTemplatesMetadata,
  loadTemplateFile,
  resolveTemplate,
} from './templates.js';
import { searchNodes, getNode, catalogStats } from './node-catalog.js';
import { validateWorkflow } from './validate.js';
import { applyWorkflowOps, type WorkflowOp } from './workflow-ops.js';
import { searchRemoteTemplates, getRemoteTemplate } from './templates-remote.js';
import { parseToolsets, shouldRegister } from './toolsets.js';
import { saveSnapshot, listSnapshots, loadSnapshot } from './snapshots.js';
import { autofixWorkflow } from './autofix.js';
import { diffWorkflows } from './diff.js';
import { computeHealth } from './health.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
);

// Get config from environment variables
const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_BASE_URL || !N8N_API_KEY) {
  console.error(
    'Warning: N8N_BASE_URL and N8N_API_KEY are not set. The server will start so clients can list tools, but calls to n8n will fail until they are provided.'
  );
}

const n8nClient = new N8nClient({
  baseUrl: N8N_BASE_URL || 'https://localhost',
  apiKey: N8N_API_KEY || '',
});

// ========== RESULT HELPERS ==========

function jsonResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    isError: true as const,
  };
}

function apiResult(result: ApiResponse) {
  if (result.error) {
    return errorResult({ error: result.error });
  }
  return jsonResult(result.data);
}

// Tool annotations
const readOnly = { readOnlyHint: true, destructiveHint: false };
const destructive = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true };
const mutating = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true };

// ========== SERVER ==========

// Tool/prompt registrations are collected first so the server can be
// instantiated per-transport (stdio uses one instance; HTTP mode creates a
// fresh instance per request, as recommended for stateless operation).
const enabledTools = parseToolsets(process.env.N8N_TOOLSETS);

const toolRegistrations: { name: string; config: any; handler: (...args: any[]) => any }[] = [];
const promptRegistrations: { name: string; config: any; cb: (...args: any[]) => any }[] = [];

function addTool(name: string, config: any, handler: (...args: any[]) => any) {
  if (!shouldRegister(name, enabledTools)) return;
  toolRegistrations.push({ name, config, handler });
}

function addPrompt(name: string, config: any, cb: (...args: any[]) => any) {
  promptRegistrations.push({ name, config, cb });
}

function buildServer(): McpServer {
  const server = new McpServer({
    name: 'mcp-n8n',
    version: packageJson.version,
  });
  for (const tool of toolRegistrations) {
    server.registerTool(tool.name, tool.config, tool.handler);
  }
  for (const prompt of promptRegistrations) {
    server.registerPrompt(prompt.name, prompt.config, prompt.cb);
  }
  return server;
}

// Shared schema fragments
const nodeSchema = z.object({
  name: z.string(),
  type: z.string(),
  position: z.array(z.number()).optional(),
  parameters: z.record(z.any()).optional(),
}).passthrough();

const listWorkflowFilters = {
  active: z.boolean().optional().describe('Filter by active status'),
  tags: z.string().optional().describe('Filter by tag ID'),
  name: z.string().optional().describe('Filter by workflow name'),
  projectId: z.string().optional().describe('Filter by project ID'),
  limit: z.number().int().positive().max(250).optional().describe('Number of results (max 250)'),
  cursor: z.string().optional().describe('Pagination cursor'),
};

// ========== WORKFLOW TOOLS ==========

addTool(
  'n8n_create_workflow',
  {
    description: 'Create a new workflow in n8n. Prefer n8n_search_nodes + n8n_validate_workflow first so the JSON is valid. You can specify nodes, connections, and settings.',
    inputSchema: {
      name: z.string().describe('Name of the workflow'),
      nodes: z.array(nodeSchema).optional().describe('Array of workflow nodes (defaults to empty)'),
      connections: z.record(z.any()).optional().describe('Node connections'),
      settings: z.record(z.any()).optional().describe('Workflow settings'),
    },
  },
  async (args) => apiResult(await n8nClient.createWorkflow(args as any))
);

addTool(
  'n8n_list_workflows',
  {
    description: 'List all workflows with full details. Can filter by active status, tags, name, or project. WARNING: Returns complete workflow data including nodes and connections - use n8n_list_workflows_summary for better token efficiency.',
    inputSchema: {
      ...listWorkflowFilters,
      fields: z.array(z.string()).optional().describe('Specific fields to return (e.g., ["id", "name", "active"]). Reduces token usage significantly.'),
    },
    annotations: readOnly,
  },
  async (args) => apiResult(await n8nClient.getWorkflows(args))
);

addTool(
  'n8n_list_workflows_summary',
  {
    description: 'List workflows with minimal data (id, name, active, tags, updatedAt only). Recommended for browsing and listing - uses 90% fewer tokens than n8n_list_workflows. Use n8n_get_workflow to fetch full details of a specific workflow.',
    inputSchema: listWorkflowFilters,
    annotations: readOnly,
  },
  async (args) =>
    apiResult(
      await n8nClient.getWorkflows({
        ...args,
        fields: ['id', 'name', 'active', 'tags', 'updatedAt', 'createdAt'],
      })
    )
);

addTool(
  'n8n_get_workflow',
  {
    description: 'Get one workflow by ID, including its nodes, connections, and settings. Read-only. Use this after n8n_list_workflows_summary when you need the full definition of a single workflow. Returns the workflow object, or an error if the ID does not exist.',
    inputSchema: { id: z.string().describe('Workflow ID') },
    annotations: readOnly,
  },
  async ({ id }) => apiResult(await n8nClient.getWorkflow(id))
);

addTool(
  'n8n_update_workflow',
  {
    description: 'Update an existing workflow. Supports partial updates: omitted fields keep their current values (the current workflow is fetched and merged automatically).',
    inputSchema: {
      id: z.string().describe('Workflow ID to update'),
      name: z.string().optional().describe('New workflow name'),
      nodes: z.array(nodeSchema).optional().describe('Updated workflow nodes'),
      connections: z.record(z.any()).optional().describe('Updated connections'),
      settings: z.record(z.any()).optional().describe('Updated settings'),
    },
  },
  async ({ id, ...updates }) => {
    const current = await n8nClient.getWorkflow(id);
    if (!current.error) saveSnapshot(id, current.data, 'before update');
    return apiResult(await n8nClient.updateWorkflow(id, updates as any));
  }
);

addTool(
  'n8n_delete_workflow',
  {
    description: 'Delete a workflow permanently. A local snapshot is saved first so it can be restored with n8n_rollback_workflow (into a new workflow).',
    inputSchema: { id: z.string().describe('Workflow ID to delete') },
    annotations: destructive,
  },
  async ({ id }) => {
    const current = await n8nClient.getWorkflow(id);
    if (!current.error) saveSnapshot(id, current.data, 'before delete');
    return apiResult(await n8nClient.deleteWorkflow(id));
  }
);

addTool(
  'n8n_activate_workflow',
  {
    description: 'Activate a workflow to start receiving triggers.',
    inputSchema: { id: z.string().describe('Workflow ID to activate') },
  },
  async ({ id }) => apiResult(await n8nClient.activateWorkflow(id))
);

addTool(
  'n8n_deactivate_workflow',
  {
    description: 'Deactivate a workflow to stop receiving triggers.',
    inputSchema: { id: z.string().describe('Workflow ID to deactivate') },
  },
  async ({ id }) => apiResult(await n8nClient.deactivateWorkflow(id))
);

addTool(
  'n8n_transfer_workflow',
  {
    description: 'Move a workflow to another project. It leaves the source project; this is not a copy and nodes are not changed. Credentials may stay behind. Use n8n_list_projects for destinationProjectId. Returns the transfer result. Requires access to both projects.',
    inputSchema: {
      id: z.string().describe('Workflow ID'),
      destinationProjectId: z.string().describe('Destination project ID from n8n_list_projects'),
    },
    annotations: mutating,
  },
  async ({ id, destinationProjectId }) =>
    apiResult(await n8nClient.transferWorkflow(id, destinationProjectId))
);

addTool(
  'n8n_get_workflow_tags',
  {
    description: 'Get all tags associated with a workflow.',
    inputSchema: { id: z.string().describe('Workflow ID') },
    annotations: readOnly,
  },
  async ({ id }) => apiResult(await n8nClient.getWorkflowTags(id))
);

addTool(
  'n8n_update_workflow_tags',
  {
    description: 'Replace the entire tag set of one workflow with tagIds. Tags omitted from the array are removed from that workflow; nodes are not changed. Call n8n_list_tags to resolve names to IDs and n8n_get_workflow_tags to see the current set first. Sending the same IDs again leaves the tags unchanged. Returns the updated tag list. Requires permission to edit the workflow.',
    inputSchema: {
      id: z.string().describe('Workflow ID'),
      tagIds: z.array(z.string()).describe('Complete list of tag IDs that should remain on the workflow'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ id, tagIds }) => apiResult(await n8nClient.updateWorkflowTags(id, tagIds))
);

// ========== EXECUTION TOOLS ==========

addTool(
  'n8n_list_executions',
  {
    description: 'List workflow executions. Can filter by status, workflow ID, or project. TIP: Set includeData=false and use fields parameter to reduce token usage.',
    inputSchema: {
      status: z.enum(['error', 'success', 'waiting', 'running', 'canceled']).optional().describe('Filter by execution status'),
      workflowId: z.string().optional().describe('Filter by workflow ID'),
      projectId: z.string().optional().describe('Filter by project ID'),
      includeData: z.boolean().optional().describe('Include execution data (WARNING: significantly increases token usage)'),
      limit: z.number().int().positive().optional().describe('Number of results'),
      cursor: z.string().optional().describe('Pagination cursor'),
      fields: z.array(z.string()).optional().describe('Specific fields to return (e.g., ["id", "status", "workflowId"]). Reduces token usage.'),
    },
    annotations: readOnly,
  },
  async (args) => apiResult(await n8nClient.getExecutions(args))
);

addTool(
  'n8n_get_execution',
  {
    description: 'Get detailed information about a specific execution.',
    inputSchema: {
      id: z.string().describe('Execution ID'),
      includeData: z.boolean().optional().describe('Include execution data'),
    },
    annotations: readOnly,
  },
  async ({ id, includeData }) => apiResult(await n8nClient.getExecution(id, includeData))
);

addTool(
  'n8n_delete_execution',
  {
    description: 'Delete one execution history record by ID. Irreversible: the run log is removed and the workflow itself is kept. Call n8n_get_execution first if you still need the error or output. Returns the deletion result.',
    inputSchema: { id: z.string().describe('Execution ID to delete') },
    annotations: destructive,
  },
  async ({ id }) => apiResult(await n8nClient.deleteExecution(id))
);

addTool(
  'n8n_retry_execution',
  {
    description: 'Retry a failed execution by ID, starting a new run when n8n allows it. Does not edit the workflow. Use n8n_debug_last_error first if you need the failing node. Fails when the execution cannot be retried. Returns the new execution.',
    inputSchema: { id: z.string().describe('Execution ID to retry') },
    annotations: mutating,
  },
  async ({ id }) => apiResult(await n8nClient.retryExecution(id))
);

// ========== CREDENTIAL TOOLS ==========

addTool(
  'n8n_create_credential',
  {
    description: 'Create a stored credential for a credential type such as httpBasicAuth, not a node type. Call n8n_get_credential_schema first and put every required field in data. A duplicate name is rejected. This stores the secret on the instance and does not attach it to a node. Optional projectId scopes it to that project. Returns the new credential id and metadata, not the secret. Requires permission to create credentials.',
    inputSchema: {
      name: z.string().describe('Credential name, unique in its scope'),
      type: z.string().describe('Credential type from n8n_get_credential_schema, for example httpBasicAuth'),
      data: z.record(z.any()).describe('Field values required by that credential type'),
      projectId: z.string().optional().describe('Project ID to scope the credential; omit for the instance default'),
    },
    annotations: mutating,
  },
  async (args) => apiResult(await n8nClient.createCredential(args as any))
);

addTool(
  'n8n_delete_credential',
  {
    description: 'Delete a credential (owner only).',
    inputSchema: { id: z.string().describe('Credential ID to delete') },
    annotations: destructive,
  },
  async ({ id }) => apiResult(await n8nClient.deleteCredential(id))
);

addTool(
  'n8n_get_credential_schema',
  {
    description: 'Get the schema for a credential type to understand required fields.',
    inputSchema: { credentialTypeName: z.string().describe('Credential type name') },
    annotations: readOnly,
  },
  async ({ credentialTypeName }) => apiResult(await n8nClient.getCredentialSchema(credentialTypeName))
);

addTool(
  'n8n_transfer_credential',
  {
    description: 'Move a credential to another project. It leaves the source project; this is not a copy, so workflows there lose access to it. Use n8n_list_projects for destinationProjectId. Returns the transfer result. Requires access to both projects.',

    inputSchema: {
      id: z.string().describe('Credential ID'),
      destinationProjectId: z.string().describe('Destination project ID'),
    },
    annotations: mutating,
  },
  async ({ id, destinationProjectId }) =>
    apiResult(await n8nClient.transferCredential(id, destinationProjectId))
);

// ========== TAG TOOLS ==========

addTool(
  'n8n_create_tag',
  {
    description: 'Create a tag by name. Call n8n_list_tags first; a duplicate name is rejected. This does not attach the tag to a workflow — use n8n_update_workflow_tags for that. Returns the new tag id and name.',
    inputSchema: { name: z.string().describe('Tag name, unique among existing tags') },
    annotations: mutating,
  },
  async ({ name }) => apiResult(await n8nClient.createTag({ name }))
);

addTool(
  'n8n_list_tags',
  {
    description: 'List all tags available in n8n.',
    inputSchema: {},
    annotations: readOnly,
  },
  async () => apiResult(await n8nClient.getTags())
);

addTool(
  'n8n_get_tag',
  {
    description: 'Get information about a specific tag.',
    inputSchema: { id: z.string().describe('Tag ID') },
    annotations: readOnly,
  },
  async ({ id }) => apiResult(await n8nClient.getTag(id))
);

addTool(
  'n8n_update_tag',
  {
    description: 'Rename a tag. The id stays the same, so workflows that already use it keep the tag. Call n8n_list_tags for the id. A name that already exists is rejected. Returns the updated tag.',
    inputSchema: {
      id: z.string().describe('Tag ID'),
      name: z.string().describe('New unique tag name'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ id, name }) => apiResult(await n8nClient.updateTag(id, { name }))
);

addTool(
  'n8n_delete_tag',
  {
    description: 'Delete a tag by id. Workflows lose that tag; the workflows themselves are not deleted. Irreversible. Call n8n_list_tags to confirm the id. Returns the deletion result.',
    inputSchema: { id: z.string().describe('Tag ID to delete') },
    annotations: destructive,
  },
  async ({ id }) => apiResult(await n8nClient.deleteTag(id))
);

// ========== VARIABLE TOOLS ==========

addTool(
  'n8n_create_variable',
  {
    description: 'Create an environment variable. Call n8n_list_variables first; a duplicate key is rejected. type is string, boolean, or number. Optional projectId scopes it to a project. The value is stored on the instance and can be read later with n8n_list_variables. Returns the created variable. Requires permission to manage variables.',
    inputSchema: {
      key: z.string().describe('Variable key, unique in its scope'),
      value: z.string().describe('Variable value'),
      type: z.enum(['string', 'boolean', 'number']).optional().describe('Variable type; omit to let n8n default it'),
      projectId: z.string().optional().describe('Project ID; omit for an instance variable'),
    },
    annotations: mutating,
  },
  async (args) => apiResult(await n8nClient.createVariable(args as any))
);

addTool(
  'n8n_list_variables',
  {
    description: 'List environment variables. Read-only. Optional projectId and state narrow the list. Returns id, key, value, and type. Does not create or change variables; use n8n_create_variable or n8n_update_variable for that.',
    inputSchema: {
      projectId: z.string().optional().describe('Filter by project ID'),
      state: z.string().optional().describe('Filter by state'),
    },
    annotations: readOnly,
  },
  async (args) => apiResult(await n8nClient.getVariables(args))
);

addTool(
  'n8n_update_variable',
  {
    description: 'Update an environment variable.',
    inputSchema: {
      id: z.string().describe('Variable ID'),
      key: z.string().optional().describe('New key'),
      value: z.string().optional().describe('New value'),
      type: z.enum(['string', 'boolean', 'number']).optional(),
    },
  },
  async ({ id, ...updates }) => apiResult(await n8nClient.updateVariable(id, updates as any))
);

addTool(
  'n8n_delete_variable',
  {
    description: 'Delete an environment variable.',
    inputSchema: { id: z.string().describe('Variable ID to delete') },
    annotations: destructive,
  },
  async ({ id }) => apiResult(await n8nClient.deleteVariable(id))
);

// ========== USER TOOLS ==========

addTool(
  'n8n_list_users',
  {
    description: 'List all users (owner only).',
    inputSchema: {
      includeRole: z.boolean().optional().describe('Include role information'),
    },
    annotations: readOnly,
  },
  async ({ includeRole }) => apiResult(await n8nClient.getUsers(includeRole))
);

addTool(
  'n8n_create_users',
  {
    description: 'Create one or more n8n users in one call. Owner only. Each item needs an email; role is global:owner, global:admin, or global:member. Call n8n_list_users first — an email that already exists is rejected. Does not create workflows for them. Returns the created users. If one email fails, treat the whole call as failed and do not retry blindly.',
    inputSchema: {
      users: z
        .array(
          z.object({
            email: z.string().describe('Email address, unique on the instance'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            role: z.enum(['global:owner', 'global:admin', 'global:member']).optional().describe('Instance role; omit for the n8n default'),
          })
        )
        .describe('Users to create'),
    },
    annotations: mutating,
  },
  async ({ users }) => apiResult(await n8nClient.createUsers(users as any))
);

addTool(
  'n8n_get_user',
  {
    description: 'Get user by ID or email (owner only).',
    inputSchema: { id: z.string().describe('User ID or email') },
    annotations: readOnly,
  },
  async ({ id }) => apiResult(await n8nClient.getUser(id))
);

addTool(
  'n8n_delete_user',
  {
    description: 'Delete a user by id. Owner only. Irreversible: the account is removed. Workflows are not deleted by this tool. Call n8n_list_users to confirm the id. Returns the deletion result.',
    inputSchema: { id: z.string().describe('User ID to delete') },
    annotations: destructive,
  },
  async ({ id }) => apiResult(await n8nClient.deleteUser(id))
);

addTool(
  'n8n_change_user_role',
  {
    description: "Set a user's instance-wide role to global:owner, global:admin, or global:member. Owner only. This is not a project role; use n8n_change_user_project_role for membership inside one project. Sending the same role again leaves the user unchanged. Returns the updated user.",
    inputSchema: {
      id: z.string().describe('User ID'),
      role: z.enum(['global:owner', 'global:admin', 'global:member']).describe('New instance-wide role'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ id, role }) => apiResult(await n8nClient.changeUserRole(id, role))
);

// ========== PROJECT TOOLS ==========

addTool(
  'n8n_create_project',
  {
    description: 'Create a project. name is required. type is team or personal; omit it to let n8n apply its default. This does not add members — use n8n_add_user_to_project after you have the new id. A duplicate name may be rejected. Returns the new project id, name, and type. Requires permission to create projects.',
    inputSchema: {
      name: z.string().describe('Project name'),
      type: z.enum(['team', 'personal']).optional().describe('team or personal; omit for the n8n default'),
    },
    annotations: mutating,
  },
  async (args) => apiResult(await n8nClient.createProject(args as any))
);

addTool(
  'n8n_list_projects',
  {
    description: 'List projects visible to this API key. Read-only. Returns id, name, and type for each project, without workflow contents. Use an id with n8n_update_project, n8n_delete_project, or the transfer tools.',
    inputSchema: {},
    annotations: readOnly,
  },
  async () => apiResult(await n8nClient.getProjects())
);

addTool(
  'n8n_update_project',
  {
    description: 'Rename a project or change its type between team and personal. Only fields you send are changed; omitted fields stay as they are. Call n8n_list_projects for the id. Does not move workflows or change members. Sending the current name and type again leaves the project unchanged. Returns the updated project. Requires permission to edit that project.',
    inputSchema: {
      id: z.string().describe('Project ID from n8n_list_projects'),
      name: z.string().optional().describe('New project name; omit to keep the current name'),
      type: z.enum(['team', 'personal']).optional().describe('New type, team or personal; omit to keep the current type'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ id, ...updates }) => apiResult(await n8nClient.updateProject(id, updates as any))
);

addTool(
  'n8n_delete_project',
  {
    description: 'Delete a project by id. Irreversible. Workflows and credentials in it can become inaccessible; this tool does not export them. Call n8n_export_all_workflows first if you need a copy, and n8n_list_projects to confirm the id. Returns the deletion result. Requires permission to delete that project.',
    inputSchema: { id: z.string().describe('Project ID to delete') },
    annotations: destructive,
  },
  async ({ id }) => apiResult(await n8nClient.deleteProject(id))
);

addTool(
  'n8n_add_user_to_project',
  {
    description: 'Add an existing user to a project with a project role. The user must already exist (n8n_list_users) and the project must exist (n8n_list_projects). This does not change their instance-wide role. If they are already a member, n8n rejects the call; use n8n_change_user_project_role instead. Returns the membership. Requires permission to manage that project.',
    inputSchema: {
      projectId: z.string().describe('Project ID from n8n_list_projects'),
      userId: z.string().describe('Existing user ID from n8n_list_users'),
      role: z.string().describe('Project role n8n accepts for a member, such as project:admin'),
    },
    annotations: mutating,
  },
  async ({ projectId, userId, role }) =>
    apiResult(await n8nClient.addUserToProject(projectId, userId, role))
);

addTool(
  'n8n_remove_user_from_project',
  {
    description: 'Remove a user from one project. They lose access to that project only; the account and other projects stay. To undo it, call n8n_add_user_to_project again. Returns the removal result. Requires permission to manage that project.',
    inputSchema: {
      projectId: z.string().describe('Project ID'),
      userId: z.string().describe('User ID to remove'),
    },
    annotations: destructive,
  },
  async ({ projectId, userId }) =>
    apiResult(await n8nClient.removeUserFromProject(projectId, userId))
);

addTool(
  'n8n_change_user_project_role',
  {
    description: "Change a member's role inside one project. Does not change their instance-wide role; use n8n_change_user_role for that. The user must already belong to the project — if not, call n8n_add_user_to_project. Sending the same role again leaves the membership unchanged. Returns the updated membership.",
    inputSchema: {
      projectId: z.string().describe('Project ID'),
      userId: z.string().describe('User ID of a current project member'),
      role: z.string().describe('New project role, such as project:admin'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ projectId, userId, role }) =>
    apiResult(await n8nClient.changeUserProjectRole(projectId, userId, role))
);

// ========== OTHER TOOLS ==========

addTool(
  'n8n_generate_audit',
  {
    description: 'Generate the instance security audit. Read-only: it does not change workflows, credentials, or users. Returns the report sections from the n8n audit API. Requires an owner or admin API key. Use this instead of guessing security issues from workflow JSON.',
    inputSchema: {},
    annotations: readOnly,
  },
  async () => apiResult(await n8nClient.generateAudit())
);

addTool(
  'n8n_pull_source_control',
  {
    description: 'Pull the Git repository connected in n8n and apply it to this instance. Workflows that differ from the remote can be overwritten. This is not a local backup (n8n_export_all_workflows) and not a snapshot restore (n8n_rollback_workflow). Fails if source control is not configured. Returns the pull result. Requires permission to use source control.',
    inputSchema: {},
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  },
  async () => apiResult(await n8nClient.pullSourceControl())
);

addTool(
  'n8n_export_all_workflows',
  {
    description: 'Back up every workflow of the instance as individual JSON files in a local directory. Complements the per-change snapshots with a full-instance safety net.',
    inputSchema: {
      directory: z.string().optional().describe('Target directory (default: ~/.mcp-n8n/backups/<timestamp>)'),
    },
    annotations: readOnly,
  },
  async ({ directory }) => {
    const all = await n8nClient.getAllWorkflows();
    if (all.error) return errorResult({ error: all.error });

    const dir =
      directory ||
      join(homedir(), '.mcp-n8n', 'backups', new Date().toISOString().replace(/[:.]/g, '-'));
    mkdirSync(dir, { recursive: true });

    const exported: { id: string; name: string; file: string }[] = [];
    for (const workflow of all.data) {
      const safeName = String(workflow.name ?? 'workflow')
        .replace(/[^a-zA-Z0-9-_ ]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 60);
      const file = `${workflow.id}-${safeName}.json`;
      writeFileSync(join(dir, file), JSON.stringify(workflow, null, 2));
      exported.push({ id: workflow.id, name: workflow.name, file });
    }

    return jsonResult({
      directory: dir,
      count: exported.length,
      workflows: exported.slice(0, 50),
      ...(exported.length > 50 && { note: `Showing 50 of ${exported.length}` }),
    });
  }
);

addTool(
  'n8n_import_workflows',
  {
    description: 'Import workflow JSON files from a local directory (e.g. a backup created with n8n_export_all_workflows) as new workflows in the instance.',
    inputSchema: {
      directory: z.string().describe('Directory containing .json workflow files'),
      activate: z.boolean().optional().describe('Activate workflows that were active in the backup (default false)'),
    },
  },
  async ({ directory, activate }) => {
    let files: string[];
    try {
      files = readdirSync(directory).filter((f) => f.endsWith('.json'));
    } catch (error: any) {
      return errorResult({ error: `Cannot read directory: ${error.message}` });
    }
    if (files.length === 0) return errorResult({ error: 'No .json files found in the directory' });

    const created: { file: string; id?: string; name?: string; activated?: boolean; error?: string }[] = [];
    for (const file of files) {
      try {
        const source = JSON.parse(readFileSync(join(directory, file), 'utf8'));
        const result = await n8nClient.createWorkflow({
          name: source.name,
          nodes: source.nodes,
          connections: source.connections,
          settings: source.settings,
        });
        if (result.error) {
          created.push({ file, error: result.error });
          continue;
        }
        const entry: any = { file, id: result.data.id, name: result.data.name };
        if (activate && source.active && result.data.id) {
          const activation = await n8nClient.activateWorkflow(result.data.id);
          entry.activated = !activation.error;
          if (activation.error) entry.activationError = activation.error;
        }
        created.push(entry);
      } catch (error: any) {
        created.push({ file, error: error.message });
      }
    }

    return jsonResult({
      imported: created.filter((c) => !c.error).length,
      failed: created.filter((c) => c.error).length,
      results: created,
    });
  }
);

// ========== WORKFLOW TEMPLATE TOOLS ==========

addTool(
  'n8n_list_workflow_templates',
  {
    description: 'List available workflow templates with their metadata. Use this to discover what pre-built workflows are available.',
    inputSchema: {
      category: z.string().optional().describe('Filter by category (e.g., "AI/Chat", "E-commerce/Support")'),
      search: z.string().optional().describe('Search keywords in name, description, tags, and use cases'),
    },
    annotations: readOnly,
  },
  async ({ category, search }) => {
    const templatesData = loadTemplatesMetadata();
    let filteredTemplates = templatesData.templates;

    if (category) {
      const categoryLower = category.toLowerCase();
      filteredTemplates = filteredTemplates.filter(t =>
        t.category.toLowerCase().includes(categoryLower)
      );
    }

    if (search) {
      const searchTerms = search.toLowerCase().split(/\s+/);
      filteredTemplates = filteredTemplates.filter(t => {
        const searchableText = [t.name, t.description, ...t.tags, ...t.keywords, ...t.useCases]
          .join(' ')
          .toLowerCase();
        return searchTerms.some((term: string) => searchableText.includes(term));
      });
    }

    return jsonResult({
      templates: filteredTemplates.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description,
        tags: t.tags,
        complexity: t.complexity,
        useCases: t.useCases.slice(0, 3),
      })),
      total: filteredTemplates.length,
    });
  }
);

addTool(
  'n8n_get_workflow_template',
  {
    description: 'Get a specific workflow template by ID or intelligently find the best matching template based on user requirements.',
    inputSchema: {
      templateId: z.string().optional().describe('Template ID (if known)'),
      userRequest: z.string().optional().describe("User's description of what they want to build. Used to intelligently match the best template."),
    },
    annotations: readOnly,
  },
  async (args) => {
    const selectedTemplate = resolveTemplate(args);
    if (!selectedTemplate) {
      return errorResult({
        error: 'No matching template found',
        suggestion: 'Use n8n_list_workflow_templates to see available templates',
      });
    }

    const workflowData = loadTemplateFile(selectedTemplate.file);
    if (!workflowData) {
      return errorResult({ error: 'Failed to load template file', template: selectedTemplate });
    }

    return jsonResult({
      metadata: selectedTemplate,
      workflow: workflowData,
      message: `Found template: ${selectedTemplate.name}`,
    });
  }
);

addTool(
  'n8n_create_workflow_from_template',
  {
    description: 'Create a new workflow from a bundled template. Pass templateId, or userRequest to match a local template; if neither matches, the call fails — then use n8n_list_workflow_templates. workflowName overrides the template name. activate=true turns triggers on after creation. Template credentials are not created; they must be attached in n8n. Does not modify an existing workflow. Returns the new workflow id and name.',
    inputSchema: {
      templateId: z.string().optional().describe('Bundled template ID. Omit to match userRequest instead.'),
      userRequest: z.string().optional().describe('What to build, used only when templateId is omitted'),
      workflowName: z.string().optional().describe('Name for the new workflow; omit to keep the template name'),
      activate: z.boolean().optional().describe('true activates triggers immediately; omit or false leaves it inactive'),
    },
    annotations: mutating,
  },
  async (args) => {
    const selectedTemplate = resolveTemplate(args);
    if (!selectedTemplate) {
      return errorResult({
        error: 'No matching template found',
        suggestion: 'Use n8n_list_workflow_templates to see available templates',
      });
    }

    const workflowData = loadTemplateFile(selectedTemplate.file);
    if (!workflowData) {
      return errorResult({ error: 'Failed to load template file', template: selectedTemplate });
    }

    const newWorkflow = {
      name: args.workflowName || workflowData.name || selectedTemplate.name,
      nodes: workflowData.nodes,
      connections: workflowData.connections,
      settings: workflowData.settings || { executionOrder: 'v1' },
    };

    const createResult = await n8nClient.createWorkflow(newWorkflow);
    if (createResult.error) {
      return errorResult({ error: createResult.error, template: selectedTemplate });
    }

    if (args.activate && createResult.data && createResult.data.id) {
      const activateResult = await n8nClient.activateWorkflow(createResult.data.id);
      if (activateResult.error) {
        return jsonResult({
          workflow: createResult.data,
          activationError: activateResult.error,
          message: 'Workflow created but activation failed',
          template: selectedTemplate,
        });
      }
    }

    return jsonResult({
      success: true,
      workflow: createResult.data,
      template: selectedTemplate,
      message: `Successfully created workflow from template: ${selectedTemplate.name}`,
      url: createResult.data?.id ? `${N8N_BASE_URL}/workflow/${createResult.data.id}` : undefined,
    });
  }
);

// ========== BUILDER TOOLS ==========

addTool(
  'n8n_search_nodes',
  {
    description: 'Search the full catalog of 560 n8n nodes (extracted from the real n8n packages). Use this BEFORE creating a workflow so node types are correct. Returns summaries; use n8n_get_node for the full parameter schema.',
    inputSchema: {
      query: z.string().describe('What the node should do (e.g. "slack", "postgres", "vector store", "schedule")'),
      limit: z.number().int().positive().max(20).optional().describe('Max results (default 8)'),
    },
    annotations: readOnly,
  },
  async ({ query, limit }) =>
    jsonResult({
      catalog: catalogStats(),
      nodes: searchNodes(query, limit ?? 8),
    })
);

addTool(
  'n8n_get_node',
  {
    description: 'Get the real parameter schema of an n8n node type: parameters with types, options and display conditions, required params, credentials, latest typeVersion, plus curated notes and an example for common nodes.',
    inputSchema: {
      type: z.string().describe('Node type or alias (e.g. "n8n-nodes-base.slack" or "webhook")'),
    },
    annotations: readOnly,
  },
  async ({ type }) => {
    const node = getNode(type);
    if (!node) {
      return errorResult({
        error: `Unknown node "${type}"`,
        suggestion: 'Use n8n_search_nodes to find the correct type',
      });
    }
    return jsonResult(node);
  }
);

addTool(
  'n8n_autofix_workflow',
  {
    description: 'Apply safe mechanical fixes to a workflow: missing typeVersion, missing positions, duplicate node names, connections to nonexistent nodes, and missing "=" prefixes on expressions. By default returns a preview; set apply=true to save (a snapshot is taken first).',
    inputSchema: {
      id: z.string().describe('Workflow ID'),
      apply: z.boolean().optional().describe('Save the fixed workflow (default false = preview only)'),
    },
  },
  async ({ id, apply }) => {
    const current = await n8nClient.getWorkflow(id);
    if (current.error) return errorResult({ error: current.error });

    const result = autofixWorkflow(current.data);
    if (result.fixes.length === 0) {
      return jsonResult({ message: 'Nothing to fix', fixes: [], validation: validateWorkflow(current.data) });
    }

    if (apply) {
      saveSnapshot(id, current.data, 'before autofix');
      const updated = await n8nClient.updateWorkflow(id, result.workflow);
      if (updated.error) return errorResult({ error: updated.error, fixes: result.fixes });
      return jsonResult({
        applied: true,
        fixes: result.fixes,
        validation: validateWorkflow(result.workflow),
      });
    }

    return jsonResult({
      applied: false,
      fixes: result.fixes,
      hint: 'Run again with apply=true to save. A snapshot is saved first, so it can be rolled back.',
    });
  }
);

addTool(
  'n8n_validate_workflow',
  {
    description: 'Validate a workflow JSON before creating or updating it. Checks node names, types, required parameters, and connections. Always call this before n8n_create_workflow or n8n_activate_workflow.',
    inputSchema: {
      name: z.string().optional(),
      nodes: z.array(z.any()).optional(),
      connections: z.record(z.any()).optional(),
      workflowId: z.string().optional().describe('If set, validate the workflow already stored in n8n'),
    },
    annotations: readOnly,
  },
  async (args) => {
    let workflow = { name: args.name, nodes: args.nodes, connections: args.connections };
    if (args.workflowId) {
      const stored = await n8nClient.getWorkflow(args.workflowId);
      if (stored.error) return errorResult({ error: stored.error });
      workflow = {
        name: stored.data.name,
        nodes: stored.data.nodes,
        connections: stored.data.connections,
      };
    }
    const result = validateWorkflow(workflow);
    return result.valid ? jsonResult(result) : errorResult(result);
  }
);

addTool(
  'n8n_update_workflow_partial',
  {
    description: 'Apply surgical edits to an existing workflow without rewriting it. Operations: setName, addNode, removeNode, updateNode, addConnection, removeConnection. Fetches the current workflow, applies the ops, and saves.',
    inputSchema: {
      id: z.string().describe('Workflow ID'),
      operations: z
        .array(
          z.object({
            op: z.enum(['setName', 'addNode', 'removeNode', 'updateNode', 'addConnection', 'removeConnection']),
            name: z.string().optional(),
            node: z.record(z.any()).optional(),
            parameters: z.record(z.any()).optional(),
            typeVersion: z.number().optional(),
            source: z.string().optional(),
            target: z.string().optional(),
            sourceOutput: z.number().optional(),
            targetInput: z.number().optional(),
          })
        )
        .describe('List of edits to apply in order'),
      validate: z.boolean().optional().describe('Validate before saving (default true)'),
    },
  },
  async ({ id, operations, validate }) => {
    const current = await n8nClient.getWorkflow(id);
    if (current.error) return errorResult({ error: current.error });
    saveSnapshot(id, current.data, 'before partial update');

    const applied = applyWorkflowOps(current.data, operations as WorkflowOp[]);
    if (applied.errors.length > 0) {
      return errorResult({ error: 'Some operations failed', details: applied.errors });
    }

    if (validate !== false) {
      const check = validateWorkflow(applied.workflow);
      if (!check.valid) {
        return errorResult({
          error: 'Updated workflow is invalid; not saved',
          validation: check,
        });
      }
    }

    return apiResult(await n8nClient.updateWorkflow(id, applied.workflow));
  }
);

addTool(
  'n8n_debug_last_error',
  {
    description: 'Get the most recent failed execution (optionally for one workflow) with the failing node and error message. Use this to repair a broken workflow.',
    inputSchema: {
      workflowId: z.string().optional().describe('Limit to one workflow'),
    },
    annotations: readOnly,
  },
  async ({ workflowId }) => apiResult(await n8nClient.debugLastError(workflowId))
);

addTool(
  'n8n_get_node_execution_data',
  {
    description: 'Inspect the data that flowed through a specific node in an execution, without downloading the whole execution. Without nodeName, returns an overview of all executed nodes (status, item counts, errors). With nodeName, returns the actual output items (limited sample) and error details for that node.',
    inputSchema: {
      executionId: z.string().describe('Execution ID'),
      nodeName: z.string().optional().describe('Node name to inspect (omit for an overview of all nodes)'),
      itemsLimit: z.number().int().positive().max(20).optional().describe('Max output items to return per run (default 3)'),
    },
    annotations: readOnly,
  },
  async ({ executionId, nodeName, itemsLimit }) => {
    const execution = await n8nClient.getExecution(executionId, true);
    if (execution.error) return errorResult({ error: execution.error });

    const resultData = execution.data?.data?.resultData ?? execution.data?.resultData;
    const runData: Record<string, any[]> = resultData?.runData ?? {};
    if (Object.keys(runData).length === 0) {
      return errorResult({ error: 'Execution has no run data (it may not have started or data was pruned)' });
    }

    if (!nodeName) {
      return jsonResult({
        executionId,
        status: execution.data?.status,
        lastNodeExecuted: resultData?.lastNodeExecuted,
        executionError: resultData?.error?.message,
        nodes: Object.entries(runData).map(([name, runs]) => {
          const last = runs[runs.length - 1] ?? {};
          const mainOutputs: any[][] = last.data?.main ?? [];
          return {
            name,
            runs: runs.length,
            status: last.executionStatus,
            error: last.error?.message,
            outputItems: mainOutputs.map((branch) => branch?.length ?? 0),
            executionTimeMs: last.executionTime,
          };
        }),
      });
    }

    const runs = runData[nodeName];
    if (!runs) {
      return errorResult({
        error: `Node "${nodeName}" did not run in this execution`,
        availableNodes: Object.keys(runData),
      });
    }

    const limit = itemsLimit ?? 3;
    return jsonResult({
      executionId,
      nodeName,
      runs: runs.map((run: any, index: number) => {
        const mainOutputs: any[][] = run.data?.main ?? [];
        return {
          run: index,
          status: run.executionStatus,
          executionTimeMs: run.executionTime,
          error: run.error
            ? { message: run.error.message, description: run.error.description }
            : undefined,
          outputItems: mainOutputs.map((branch) => branch?.length ?? 0),
          sample: (mainOutputs[0] ?? []).slice(0, limit).map((item: any) => item?.json ?? item),
        };
      }),
    });
  }
);

addTool(
  'n8n_workflow_health',
  {
    description: 'Operational health report computed from recent executions: success rate, failure count, average duration, and last failure per workflow, sorted worst-first. Use it to find which workflows need attention.',
    inputSchema: {
      workflowId: z.string().optional().describe('Limit to one workflow'),
      limit: z.number().int().positive().max(500).optional().describe('How many recent executions to analyze (default 100)'),
    },
    annotations: readOnly,
  },
  async ({ workflowId, limit }) => {
    const executions = await n8nClient.getExecutionsPaged({ workflowId }, limit ?? 100);
    if (executions.error) return errorResult({ error: executions.error });

    const names = new Map<string, string>();
    if (!workflowId) {
      const workflows = await n8nClient.getWorkflows({ fields: ['id', 'name'], limit: 250 });
      for (const wf of workflows.data?.data ?? []) names.set(String(wf.id), wf.name);
    }

    return jsonResult({
      sampleSize: executions.data.length,
      workflows: computeHealth(executions.data, names),
    });
  }
);

addTool(
  'n8n_search_public_templates',
  {
    description: 'Search official n8n.io workflow templates (thousands, always current). Returns summaries only. Then use n8n_import_public_template to copy one into the instance.',
    inputSchema: {
      query: z.string().describe('What the workflow should do'),
      limit: z.number().int().positive().max(20).optional(),
    },
    annotations: readOnly,
  },
  async ({ query, limit }) => {
    try {
      return jsonResult({ templates: await searchRemoteTemplates(query, limit ?? 8) });
    } catch (error: any) {
      return errorResult({ error: error.message || 'Failed to search public templates' });
    }
  }
);

addTool(
  'n8n_import_public_template',
  {
    description: 'Download an official n8n.io template by ID and create it as a workflow in this instance. Credentials still have to be attached in n8n.',
    inputSchema: {
      templateId: z.string().describe('Numeric ID from n8n_search_public_templates'),
      workflowName: z.string().optional(),
      activate: z.boolean().optional(),
    },
  },
  async ({ templateId, workflowName, activate }) => {
    try {
      const template = await getRemoteTemplate(templateId);
      const created = await n8nClient.createWorkflow({
        name: workflowName || template.name,
        nodes: template.nodes,
        connections: template.connections,
        settings: template.settings,
      });
      if (created.error) return errorResult({ error: created.error, template });
      if (activate && created.data?.id) {
        const activation = await n8nClient.activateWorkflow(created.data.id);
        if (activation.error) {
          return jsonResult({
            workflow: created.data,
            activationError: activation.error,
            message: 'Imported but activation failed (usually missing credentials)',
            source: template.url,
          });
        }
      }
      return jsonResult({
        success: true,
        workflow: created.data,
        source: template.url,
        message: `Imported "${template.name}" from n8n.io`,
      });
    } catch (error: any) {
      return errorResult({ error: error.message || 'Failed to import template' });
    }
  }
);

// ========== TESTING & SAFETY TOOLS ==========

addTool(
  'n8n_trigger_webhook',
  {
    description: 'Call a Webhook-trigger workflow on the n8n instance to test it end-to-end and see the real response. Use test=true only while the workflow is in "Listen for test event" mode in the editor; otherwise the workflow must be active.',
    inputSchema: {
      path: z.string().describe('Webhook path as configured in the Webhook node (e.g. "my-hook" or a UUID)'),
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional().describe('HTTP method (default POST)'),
      body: z.record(z.any()).optional().describe('JSON body to send'),
      test: z.boolean().optional().describe('Use the /webhook-test/ path instead of /webhook/'),
    },
  },
  async (args) => apiResult(await n8nClient.triggerWebhook(args as any))
);

addTool(
  'n8n_list_workflow_snapshots',
  {
    description: 'List local snapshots of a workflow. A snapshot is saved automatically before every update, partial update, or delete done through this server.',
    inputSchema: { id: z.string().describe('Workflow ID') },
    annotations: readOnly,
  },
  async ({ id }) => {
    const snapshots = listSnapshots(id);
    return jsonResult({
      workflowId: id,
      snapshots: snapshots.map(({ timestamp, reason, name }) => ({ timestamp, reason, name })),
      total: snapshots.length,
    });
  }
);

addTool(
  'n8n_rollback_workflow',
  {
    description: 'Restore a workflow to a previous snapshot (latest by default). The current state is snapshotted first, so a rollback can itself be undone. If the workflow was deleted, set recreate=true to restore it as a new workflow.',
    inputSchema: {
      id: z.string().describe('Workflow ID'),
      timestamp: z.string().optional().describe('Snapshot timestamp from n8n_list_workflow_snapshots (default: most recent)'),
      recreate: z.boolean().optional().describe('Create a new workflow from the snapshot instead of updating (for deleted workflows)'),
    },
  },
  async ({ id, timestamp, recreate }) => {
    const snapshot = loadSnapshot(id, timestamp);
    if (!snapshot) {
      return errorResult({
        error: `No snapshot found for workflow ${id}${timestamp ? ` at ${timestamp}` : ''}`,
        suggestion: 'Use n8n_list_workflow_snapshots to see what is available',
      });
    }

    if (recreate) {
      const created = await n8nClient.createWorkflow({
        name: snapshot.workflow.name,
        nodes: snapshot.workflow.nodes,
        connections: snapshot.workflow.connections,
        settings: snapshot.workflow.settings,
      });
      if (created.error) return errorResult({ error: created.error });
      return jsonResult({
        success: true,
        restoredFrom: snapshot.info.timestamp,
        workflow: created.data,
        message: 'Snapshot restored as a new workflow',
      });
    }

    const current = await n8nClient.getWorkflow(id);
    if (current.error) {
      return errorResult({
        error: current.error,
        suggestion: 'If the workflow was deleted, retry with recreate=true',
      });
    }
    saveSnapshot(id, current.data, 'before rollback');

    const updated = await n8nClient.updateWorkflow(id, {
      name: snapshot.workflow.name,
      nodes: snapshot.workflow.nodes,
      connections: snapshot.workflow.connections,
      settings: snapshot.workflow.settings,
    });
    if (updated.error) return errorResult({ error: updated.error });
    return jsonResult({
      success: true,
      restoredFrom: snapshot.info.timestamp,
      reason: snapshot.info.reason,
      workflow: updated.data,
    });
  }
);

addTool(
  'n8n_diff_workflow_snapshot',
  {
    description: 'Compare a workflow snapshot against the current state (or another snapshot): nodes added/removed/modified, changed parameters, and connection changes. Useful before deciding whether to roll back.',
    inputSchema: {
      id: z.string().describe('Workflow ID'),
      from: z.string().optional().describe('Snapshot timestamp to compare from (default: most recent snapshot)'),
      to: z.string().optional().describe('Snapshot timestamp to compare to (default: current state in n8n)'),
    },
    annotations: readOnly,
  },
  async ({ id, from, to }) => {
    const fromSnapshot = loadSnapshot(id, from);
    if (!fromSnapshot) {
      return errorResult({
        error: `No snapshot found for workflow ${id}${from ? ` at ${from}` : ''}`,
        suggestion: 'Use n8n_list_workflow_snapshots to see what is available',
      });
    }

    let target: any;
    let targetLabel: string;
    if (to) {
      const toSnapshot = loadSnapshot(id, to);
      if (!toSnapshot) return errorResult({ error: `No snapshot found at ${to}` });
      target = toSnapshot.workflow;
      targetLabel = to;
    } else {
      const current = await n8nClient.getWorkflow(id);
      if (current.error) return errorResult({ error: current.error });
      target = current.data;
      targetLabel = 'current';
    }

    return jsonResult({
      workflowId: id,
      from: fromSnapshot.info.timestamp,
      to: targetLabel,
      diff: diffWorkflows(fromSnapshot.workflow, target),
    });
  }
);

// ========== GUIDED PROMPTS ==========

addPrompt(
  'build-workflow',
  {
    title: 'Build an n8n workflow',
    description: 'Guided flow to build a validated, working n8n workflow from a plain-language description.',
    argsSchema: { goal: z.string().describe('What the workflow should do') },
  },
  ({ goal }) => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: [
            `Build an n8n workflow that does the following: ${goal}`,
            '',
            'Follow this process strictly:',
            '1. Check n8n_search_public_templates and n8n_list_workflow_templates for an existing template that matches; importing beats building from scratch.',
            '2. If building: use n8n_search_nodes / n8n_get_node to get the exact node types and required parameters. Never guess a node type.',
            '3. Draft the workflow JSON and run n8n_validate_workflow. Fix every error before saving.',
            '4. Create it with n8n_create_workflow. For later edits prefer n8n_update_workflow_partial.',
            '5. If it has a Webhook trigger, test it with n8n_trigger_webhook and check the response.',
            '6. If an execution fails, use n8n_debug_last_error to find the failing node, fix it, and re-test.',
            '7. Only activate (n8n_activate_workflow) once validation passes and credentials are attached.',
          ].join('\n'),
        },
      },
    ],
  })
);

addPrompt(
  'fix-workflow',
  {
    title: 'Diagnose and fix a failing n8n workflow',
    description: 'Guided flow to find why a workflow is failing and repair it safely.',
    argsSchema: { workflowId: z.string().describe('ID of the failing workflow') },
  },
  ({ workflowId }) => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: [
            `Diagnose and fix n8n workflow ${workflowId}.`,
            '',
            'Follow this process strictly:',
            `1. Run n8n_debug_last_error with workflowId=${workflowId} to get the failing node and error message.`,
            '2. Fetch the workflow with n8n_get_workflow and inspect the failing node; use n8n_get_node to check its required parameters.',
            '3. Apply the smallest possible fix with n8n_update_workflow_partial (a snapshot is saved automatically, so the change is reversible with n8n_rollback_workflow).',
            '4. Validate with n8n_validate_workflow, then re-test (n8n_trigger_webhook if it has a webhook, or n8n_retry_execution on the failed execution).',
            '5. Report what was broken, what changed, and the evidence that it now works.',
          ].join('\n'),
        },
      },
    ],
  })
);

// ========== START SERVER ==========

async function startHttp(port: number) {
  const token = process.env.N8N_MCP_HTTP_TOKEN;
  const httpServer = createHttpServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, server: 'mcp-n8n', version: packageJson.version, tools: enabledTools.size }));
      return;
    }
    if (token && req.headers.authorization !== `Bearer ${token}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized: set Authorization: Bearer <N8N_MCP_HTTP_TOKEN>' }));
      return;
    }
    try {
      // Stateless mode: fresh server + transport per request
      const server = buildServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.on('close', () => {
        transport.close();
        server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error('HTTP request error:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
  });
  httpServer.listen(port, () => {
    console.error(
      `n8n MCP Server listening on http://localhost:${port} (streamable HTTP, ${enabledTools.size} tools${token ? ', bearer auth enabled' : ', no auth - use N8N_MCP_HTTP_TOKEN in production'})`
    );
  });
}

async function main() {
  const httpPort = process.env.N8N_MCP_HTTP_PORT ? parseInt(process.env.N8N_MCP_HTTP_PORT, 10) : undefined;
  if (httpPort) {
    await startHttp(httpPort);
    return;
  }
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`n8n MCP Server running on stdio (${enabledTools.size} tools, N8N_TOOLSETS=${process.env.N8N_TOOLSETS || 'all'})`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
