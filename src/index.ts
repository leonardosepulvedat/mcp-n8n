#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { N8nClient } from './n8n-client.js';
import type { ApiResponse } from './types.js';
import {
  loadTemplatesMetadata,
  loadTemplateFile,
  resolveTemplate,
} from './templates.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
);

// Get config from environment variables
const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_BASE_URL || !N8N_API_KEY) {
  console.error('Error: N8N_BASE_URL and N8N_API_KEY environment variables are required');
  process.exit(1);
}

const n8nClient = new N8nClient({
  baseUrl: N8N_BASE_URL,
  apiKey: N8N_API_KEY,
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
const readOnly = { readOnlyHint: true };
const destructive = { destructiveHint: true };

// ========== SERVER ==========

const server = new McpServer({
  name: 'mcp-n8n',
  version: packageJson.version,
});

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

server.registerTool(
  'n8n_create_workflow',
  {
    description: 'Create a new workflow in n8n. You can specify nodes, connections, and settings.',
    inputSchema: {
      name: z.string().describe('Name of the workflow'),
      nodes: z.array(nodeSchema).optional().describe('Array of workflow nodes (defaults to empty)'),
      connections: z.record(z.any()).optional().describe('Node connections'),
      settings: z.record(z.any()).optional().describe('Workflow settings'),
    },
  },
  async (args) => apiResult(await n8nClient.createWorkflow(args as any))
);

server.registerTool(
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

server.registerTool(
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

server.registerTool(
  'n8n_get_workflow',
  {
    description: 'Get detailed information about a specific workflow by ID.',
    inputSchema: { id: z.string().describe('Workflow ID') },
    annotations: readOnly,
  },
  async ({ id }) => apiResult(await n8nClient.getWorkflow(id))
);

server.registerTool(
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
  async ({ id, ...updates }) => apiResult(await n8nClient.updateWorkflow(id, updates as any))
);

server.registerTool(
  'n8n_delete_workflow',
  {
    description: 'Delete a workflow permanently.',
    inputSchema: { id: z.string().describe('Workflow ID to delete') },
    annotations: destructive,
  },
  async ({ id }) => apiResult(await n8nClient.deleteWorkflow(id))
);

server.registerTool(
  'n8n_activate_workflow',
  {
    description: 'Activate a workflow to start receiving triggers.',
    inputSchema: { id: z.string().describe('Workflow ID to activate') },
  },
  async ({ id }) => apiResult(await n8nClient.activateWorkflow(id))
);

server.registerTool(
  'n8n_deactivate_workflow',
  {
    description: 'Deactivate a workflow to stop receiving triggers.',
    inputSchema: { id: z.string().describe('Workflow ID to deactivate') },
  },
  async ({ id }) => apiResult(await n8nClient.deactivateWorkflow(id))
);

server.registerTool(
  'n8n_transfer_workflow',
  {
    description: 'Transfer a workflow to another project.',
    inputSchema: {
      id: z.string().describe('Workflow ID'),
      destinationProjectId: z.string().describe('Destination project ID'),
    },
  },
  async ({ id, destinationProjectId }) =>
    apiResult(await n8nClient.transferWorkflow(id, destinationProjectId))
);

server.registerTool(
  'n8n_get_workflow_tags',
  {
    description: 'Get all tags associated with a workflow.',
    inputSchema: { id: z.string().describe('Workflow ID') },
    annotations: readOnly,
  },
  async ({ id }) => apiResult(await n8nClient.getWorkflowTags(id))
);

server.registerTool(
  'n8n_update_workflow_tags',
  {
    description: 'Update tags for a workflow.',
    inputSchema: {
      id: z.string().describe('Workflow ID'),
      tagIds: z.array(z.string()).describe('Array of tag IDs'),
    },
  },
  async ({ id, tagIds }) => apiResult(await n8nClient.updateWorkflowTags(id, tagIds))
);

// ========== EXECUTION TOOLS ==========

server.registerTool(
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

server.registerTool(
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

server.registerTool(
  'n8n_delete_execution',
  {
    description: 'Delete an execution record.',
    inputSchema: { id: z.string().describe('Execution ID to delete') },
    annotations: destructive,
  },
  async ({ id }) => apiResult(await n8nClient.deleteExecution(id))
);

server.registerTool(
  'n8n_retry_execution',
  {
    description: 'Retry a failed execution.',
    inputSchema: { id: z.string().describe('Execution ID to retry') },
  },
  async ({ id }) => apiResult(await n8nClient.retryExecution(id))
);

// ========== CREDENTIAL TOOLS ==========

server.registerTool(
  'n8n_create_credential',
  {
    description: 'Create a new credential for a specific node type.',
    inputSchema: {
      name: z.string().describe('Credential name'),
      type: z.string().describe('Credential type (e.g., "httpBasicAuth")'),
      data: z.record(z.any()).describe('Credential data'),
      projectId: z.string().optional().describe('Project ID'),
    },
  },
  async (args) => apiResult(await n8nClient.createCredential(args as any))
);

server.registerTool(
  'n8n_delete_credential',
  {
    description: 'Delete a credential (owner only).',
    inputSchema: { id: z.string().describe('Credential ID to delete') },
    annotations: destructive,
  },
  async ({ id }) => apiResult(await n8nClient.deleteCredential(id))
);

server.registerTool(
  'n8n_get_credential_schema',
  {
    description: 'Get the schema for a credential type to understand required fields.',
    inputSchema: { credentialTypeName: z.string().describe('Credential type name') },
    annotations: readOnly,
  },
  async ({ credentialTypeName }) => apiResult(await n8nClient.getCredentialSchema(credentialTypeName))
);

server.registerTool(
  'n8n_transfer_credential',
  {
    description: 'Transfer a credential to another project.',
    inputSchema: {
      id: z.string().describe('Credential ID'),
      destinationProjectId: z.string().describe('Destination project ID'),
    },
  },
  async ({ id, destinationProjectId }) =>
    apiResult(await n8nClient.transferCredential(id, destinationProjectId))
);

// ========== TAG TOOLS ==========

server.registerTool(
  'n8n_create_tag',
  {
    description: 'Create a new tag for organizing workflows.',
    inputSchema: { name: z.string().describe('Tag name') },
  },
  async ({ name }) => apiResult(await n8nClient.createTag({ name }))
);

server.registerTool(
  'n8n_list_tags',
  {
    description: 'List all tags available in n8n.',
    inputSchema: {},
    annotations: readOnly,
  },
  async () => apiResult(await n8nClient.getTags())
);

server.registerTool(
  'n8n_get_tag',
  {
    description: 'Get information about a specific tag.',
    inputSchema: { id: z.string().describe('Tag ID') },
    annotations: readOnly,
  },
  async ({ id }) => apiResult(await n8nClient.getTag(id))
);

server.registerTool(
  'n8n_update_tag',
  {
    description: 'Update a tag name.',
    inputSchema: {
      id: z.string().describe('Tag ID'),
      name: z.string().describe('New tag name'),
    },
  },
  async ({ id, name }) => apiResult(await n8nClient.updateTag(id, { name }))
);

server.registerTool(
  'n8n_delete_tag',
  {
    description: 'Delete a tag.',
    inputSchema: { id: z.string().describe('Tag ID to delete') },
    annotations: destructive,
  },
  async ({ id }) => apiResult(await n8nClient.deleteTag(id))
);

// ========== VARIABLE TOOLS ==========

server.registerTool(
  'n8n_create_variable',
  {
    description: 'Create a new environment variable in n8n.',
    inputSchema: {
      key: z.string().describe('Variable key'),
      value: z.string().describe('Variable value'),
      type: z.enum(['string', 'boolean', 'number']).optional().describe('Variable type'),
      projectId: z.string().optional().describe('Project ID'),
    },
  },
  async (args) => apiResult(await n8nClient.createVariable(args as any))
);

server.registerTool(
  'n8n_list_variables',
  {
    description: 'List all environment variables.',
    inputSchema: {
      projectId: z.string().optional().describe('Filter by project ID'),
      state: z.string().optional().describe('Filter by state'),
    },
    annotations: readOnly,
  },
  async (args) => apiResult(await n8nClient.getVariables(args))
);

server.registerTool(
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

server.registerTool(
  'n8n_delete_variable',
  {
    description: 'Delete an environment variable.',
    inputSchema: { id: z.string().describe('Variable ID to delete') },
    annotations: destructive,
  },
  async ({ id }) => apiResult(await n8nClient.deleteVariable(id))
);

// ========== USER TOOLS ==========

server.registerTool(
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

server.registerTool(
  'n8n_create_users',
  {
    description: 'Create multiple users at once.',
    inputSchema: {
      users: z
        .array(
          z.object({
            email: z.string(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            role: z.enum(['global:owner', 'global:admin', 'global:member']).optional(),
          })
        )
        .describe('Array of user objects'),
    },
  },
  async ({ users }) => apiResult(await n8nClient.createUsers(users as any))
);

server.registerTool(
  'n8n_get_user',
  {
    description: 'Get user by ID or email (owner only).',
    inputSchema: { id: z.string().describe('User ID or email') },
    annotations: readOnly,
  },
  async ({ id }) => apiResult(await n8nClient.getUser(id))
);

server.registerTool(
  'n8n_delete_user',
  {
    description: 'Delete a user.',
    inputSchema: { id: z.string().describe('User ID to delete') },
    annotations: destructive,
  },
  async ({ id }) => apiResult(await n8nClient.deleteUser(id))
);

server.registerTool(
  'n8n_change_user_role',
  {
    description: "Change a user's global role.",
    inputSchema: {
      id: z.string().describe('User ID'),
      role: z.enum(['global:owner', 'global:admin', 'global:member']).describe('New role'),
    },
  },
  async ({ id, role }) => apiResult(await n8nClient.changeUserRole(id, role))
);

// ========== PROJECT TOOLS ==========

server.registerTool(
  'n8n_create_project',
  {
    description: 'Create a new project in n8n.',
    inputSchema: {
      name: z.string().describe('Project name'),
      type: z.enum(['team', 'personal']).optional().describe('Project type'),
    },
  },
  async (args) => apiResult(await n8nClient.createProject(args as any))
);

server.registerTool(
  'n8n_list_projects',
  {
    description: 'List all projects.',
    inputSchema: {},
    annotations: readOnly,
  },
  async () => apiResult(await n8nClient.getProjects())
);

server.registerTool(
  'n8n_update_project',
  {
    description: 'Update a project.',
    inputSchema: {
      id: z.string().describe('Project ID'),
      name: z.string().optional().describe('New project name'),
      type: z.enum(['team', 'personal']).optional(),
    },
  },
  async ({ id, ...updates }) => apiResult(await n8nClient.updateProject(id, updates as any))
);

server.registerTool(
  'n8n_delete_project',
  {
    description: 'Delete a project.',
    inputSchema: { id: z.string().describe('Project ID to delete') },
    annotations: destructive,
  },
  async ({ id }) => apiResult(await n8nClient.deleteProject(id))
);

server.registerTool(
  'n8n_add_user_to_project',
  {
    description: 'Add a user to a project with a specific role.',
    inputSchema: {
      projectId: z.string().describe('Project ID'),
      userId: z.string().describe('User ID to add'),
      role: z.string().describe('User role in project'),
    },
  },
  async ({ projectId, userId, role }) =>
    apiResult(await n8nClient.addUserToProject(projectId, userId, role))
);

server.registerTool(
  'n8n_remove_user_from_project',
  {
    description: 'Remove a user from a project.',
    inputSchema: {
      projectId: z.string().describe('Project ID'),
      userId: z.string().describe('User ID to remove'),
    },
    annotations: destructive,
  },
  async ({ projectId, userId }) =>
    apiResult(await n8nClient.removeUserFromProject(projectId, userId))
);

server.registerTool(
  'n8n_change_user_project_role',
  {
    description: "Change a user's role within a project.",
    inputSchema: {
      projectId: z.string().describe('Project ID'),
      userId: z.string().describe('User ID'),
      role: z.string().describe('New role'),
    },
  },
  async ({ projectId, userId, role }) =>
    apiResult(await n8nClient.changeUserProjectRole(projectId, userId, role))
);

// ========== OTHER TOOLS ==========

server.registerTool(
  'n8n_generate_audit',
  {
    description: 'Generate a security audit report.',
    inputSchema: {},
    annotations: readOnly,
  },
  async () => apiResult(await n8nClient.generateAudit())
);

server.registerTool(
  'n8n_pull_source_control',
  {
    description: 'Pull changes from remote source control repository.',
    inputSchema: {},
  },
  async () => apiResult(await n8nClient.pullSourceControl())
);

// ========== WORKFLOW TEMPLATE TOOLS ==========

server.registerTool(
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

server.registerTool(
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

server.registerTool(
  'n8n_create_workflow_from_template',
  {
    description: 'Create a new workflow in n8n based on a template. Automatically selects the best template if not specified.',
    inputSchema: {
      templateId: z.string().optional().describe('Template ID to use (if known)'),
      userRequest: z.string().optional().describe('Description of what the user wants. Used to find the best matching template if templateId not provided.'),
      workflowName: z.string().optional().describe('Custom name for the new workflow (optional, will use template name if not provided)'),
      activate: z.boolean().optional().describe('Whether to activate the workflow after creation'),
    },
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

// ========== START SERVER ==========

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('n8n MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
