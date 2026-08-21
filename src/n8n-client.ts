import axios, { AxiosInstance } from 'axios';
import type {
  N8nConfig,
  WorkflowData,
  ExecutionFilters,
  CredentialData,
  TagData,
  VariableData,
  UserData,
  ProjectData,
  ApiResponse
} from './types.js';

export class N8nClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(config: N8nConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v1`,
      headers: {
        'X-N8N-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Calls a Webhook-trigger workflow directly so the agent can test it
   * end-to-end. `test` uses the /webhook-test/ path, which only works while
   * the workflow is open in "Listen for test event" mode in the editor;
   * production requires the workflow to be active.
   */
  async triggerWebhook(options: {
    path: string;
    method?: string;
    body?: any;
    test?: boolean;
  }): Promise<ApiResponse> {
    try {
      const prefix = options.test ? 'webhook-test' : 'webhook';
      const cleanPath = options.path.replace(/^\/+/, '');
      const url = `${this.baseUrl}/${prefix}/${cleanPath}`;
      const method = (options.method ?? 'POST').toLowerCase();
      const response = await axios.request({
        url,
        method,
        data: options.body,
        timeout: 30000,
        validateStatus: () => true,
      });
      return {
        data: {
          url,
          status: response.status,
          body: response.data,
        },
      };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  // ========== WORKFLOWS ==========

  async createWorkflow(workflow: WorkflowData): Promise<ApiResponse> {
    try {
      // The n8n public API requires nodes, connections and settings on create
      const body = {
        name: workflow.name,
        nodes: workflow.nodes ?? [],
        connections: workflow.connections ?? {},
        settings: workflow.settings ?? { executionOrder: 'v1' },
      };
      const response = await this.client.post('/workflows', body);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async getWorkflows(filters?: {
    active?: boolean;
    tags?: string;
    name?: string;
    projectId?: string;
    limit?: number;
    cursor?: string;
    fields?: string[];
  }): Promise<ApiResponse> {
    try {
      const { fields, ...apiFilters } = filters || {};
      const response = await this.client.get('/workflows', { params: apiFilters });

      // If fields are specified, filter the response data
      if (fields && fields.length > 0 && response.data?.data) {
        const filteredData = response.data.data.map((workflow: any) => {
          const filtered: any = {};
          fields.forEach(field => {
            if (workflow.hasOwnProperty(field)) {
              filtered[field] = workflow[field];
            }
          });
          return filtered;
        });
        return { data: { ...response.data, data: filteredData } };
      }

      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async getWorkflow(id: string): Promise<ApiResponse> {
    try {
      const response = await this.client.get(`/workflows/${id}`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async updateWorkflow(id: string, workflow: Partial<WorkflowData>): Promise<ApiResponse> {
    try {
      // The n8n public API replaces the whole workflow on PUT (partial updates
      // are rejected), so fetch the current state and merge the changes.
      const current = await this.client.get(`/workflows/${id}`);
      const existing = current.data;
      const body = {
        name: workflow.name ?? existing.name,
        nodes: workflow.nodes ?? existing.nodes,
        connections: workflow.connections ?? existing.connections,
        settings: workflow.settings ?? existing.settings ?? { executionOrder: 'v1' },
      };
      const response = await this.client.put(`/workflows/${id}`, body);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async deleteWorkflow(id: string): Promise<ApiResponse> {
    try {
      const response = await this.client.delete(`/workflows/${id}`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async activateWorkflow(id: string): Promise<ApiResponse> {
    try {
      const response = await this.client.post(`/workflows/${id}/activate`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async deactivateWorkflow(id: string): Promise<ApiResponse> {
    try {
      const response = await this.client.post(`/workflows/${id}/deactivate`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async transferWorkflow(id: string, destinationProjectId: string): Promise<ApiResponse> {
    try {
      const response = await this.client.put(`/workflows/${id}/transfer`, {
        destinationProjectId,
      });
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async getWorkflowTags(id: string): Promise<ApiResponse> {
    try {
      const response = await this.client.get(`/workflows/${id}/tags`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async updateWorkflowTags(id: string, tagIds: string[]): Promise<ApiResponse> {
    try {
      const response = await this.client.put(`/workflows/${id}/tags`, { tagIds });
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  // ========== EXECUTIONS ==========

  async getExecutions(filters?: ExecutionFilters & { fields?: string[] }): Promise<ApiResponse> {
    try {
      const { fields, ...apiFilters } = filters || {};
      const response = await this.client.get('/executions', { params: apiFilters });

      // If fields are specified, filter the response data
      if (fields && fields.length > 0 && response.data?.data) {
        const filteredData = response.data.data.map((execution: any) => {
          const filtered: any = {};
          fields.forEach(field => {
            if (execution.hasOwnProperty(field)) {
              filtered[field] = execution[field];
            }
          });
          return filtered;
        });
        return { data: { ...response.data, data: filteredData } };
      }

      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  /** Fetches every workflow, following pagination cursors. */
  async getAllWorkflows(): Promise<ApiResponse> {
    try {
      const all: any[] = [];
      let cursor: string | undefined;
      do {
        const response = await this.client.get('/workflows', {
          params: { limit: 100, ...(cursor ? { cursor } : {}) },
        });
        all.push(...(response.data?.data ?? []));
        cursor = response.data?.nextCursor ?? undefined;
      } while (cursor);
      return { data: all };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  /** Fetches executions across pages, up to maxResults. */
  async getExecutionsPaged(filters: { workflowId?: string; status?: string }, maxResults = 100): Promise<ApiResponse> {
    try {
      const all: any[] = [];
      let cursor: string | undefined;
      do {
        const response = await this.client.get('/executions', {
          params: {
            limit: Math.min(100, maxResults - all.length),
            ...(filters.workflowId ? { workflowId: filters.workflowId } : {}),
            ...(filters.status ? { status: filters.status } : {}),
            ...(cursor ? { cursor } : {}),
          },
        });
        all.push(...(response.data?.data ?? []));
        cursor = response.data?.nextCursor ?? undefined;
      } while (cursor && all.length < maxResults);
      return { data: all.slice(0, maxResults) };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async getExecution(id: string, includeData = false): Promise<ApiResponse> {
    try {
      const response = await this.client.get(`/executions/${id}`, {
        params: { includeData },
      });
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async deleteExecution(id: string): Promise<ApiResponse> {
    try {
      const response = await this.client.delete(`/executions/${id}`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async debugLastError(workflowId?: string): Promise<ApiResponse> {
    try {
      const list = await this.client.get('/executions', {
        params: {
          status: 'error',
          ...(workflowId ? { workflowId } : {}),
          limit: 1,
        },
      });
      const execution = list.data?.data?.[0];
      if (!execution) {
        return { data: { message: 'No failed executions found' } };
      }
      const full = await this.client.get(`/executions/${execution.id}`, {
        params: { includeData: true },
      });
      const data = full.data;
      const resultData = data.data?.resultData ?? data.resultData;
      const error = resultData?.error;
      return {
        data: {
          executionId: data.id ?? execution.id,
          workflowId: data.workflowId ?? execution.workflowId,
          status: data.status ?? execution.status,
          stoppedAt: data.stoppedAt ?? execution.stoppedAt,
          lastNodeExecuted: resultData?.lastNodeExecuted,
          error: error
            ? {
                message: error.message,
                name: error.name,
                node: error.node?.name ?? error.node,
                description: error.description,
              }
            : undefined,
          hint: 'Fix the node named in lastNodeExecuted, then call n8n_validate_workflow and n8n_update_workflow_partial.',
        },
      };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async retryExecution(id: string): Promise<ApiResponse> {
    try {
      const response = await this.client.post(`/executions/${id}/retry`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  // ========== CREDENTIALS ==========

  async createCredential(credential: CredentialData): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/credentials', credential);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async deleteCredential(id: string): Promise<ApiResponse> {
    try {
      const response = await this.client.delete(`/credentials/${id}`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async getCredentialSchema(credentialTypeName: string): Promise<ApiResponse> {
    try {
      const response = await this.client.get(`/credentials/schema/${credentialTypeName}`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async transferCredential(id: string, destinationProjectId: string): Promise<ApiResponse> {
    try {
      const response = await this.client.put(`/credentials/${id}/transfer`, {
        destinationProjectId,
      });
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  // ========== TAGS ==========

  async createTag(tag: TagData): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/tags', tag);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async getTags(): Promise<ApiResponse> {
    try {
      const response = await this.client.get('/tags');
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async getTag(id: string): Promise<ApiResponse> {
    try {
      const response = await this.client.get(`/tags/${id}`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async updateTag(id: string, tag: TagData): Promise<ApiResponse> {
    try {
      const response = await this.client.put(`/tags/${id}`, tag);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async deleteTag(id: string): Promise<ApiResponse> {
    try {
      const response = await this.client.delete(`/tags/${id}`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  // ========== VARIABLES ==========

  async createVariable(variable: VariableData): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/variables', variable);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async getVariables(filters?: { projectId?: string; state?: string }): Promise<ApiResponse> {
    try {
      const response = await this.client.get('/variables', { params: filters });
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async updateVariable(id: string, variable: Partial<VariableData>): Promise<ApiResponse> {
    try {
      const response = await this.client.put(`/variables/${id}`, variable);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async deleteVariable(id: string): Promise<ApiResponse> {
    try {
      const response = await this.client.delete(`/variables/${id}`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  // ========== USERS ==========

  async getUsers(includeRole = false): Promise<ApiResponse> {
    try {
      const response = await this.client.get('/users', { params: { includeRole } });
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async createUsers(users: UserData[]): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/users', users);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async getUser(id: string): Promise<ApiResponse> {
    try {
      const response = await this.client.get(`/users/${id}`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    try {
      const response = await this.client.delete(`/users/${id}`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async changeUserRole(id: string, role: string): Promise<ApiResponse> {
    try {
      const response = await this.client.patch(`/users/${id}/role`, { role });
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  // ========== PROJECTS ==========

  async createProject(project: ProjectData): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/projects', project);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async getProjects(): Promise<ApiResponse> {
    try {
      const response = await this.client.get('/projects');
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async updateProject(id: string, project: Partial<ProjectData>): Promise<ApiResponse> {
    try {
      const response = await this.client.put(`/projects/${id}`, project);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async deleteProject(id: string): Promise<ApiResponse> {
    try {
      const response = await this.client.delete(`/projects/${id}`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async addUserToProject(projectId: string, userId: string, role: string): Promise<ApiResponse> {
    try {
      const response = await this.client.post(`/projects/${projectId}/users`, {
        userId,
        role,
      });
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async removeUserFromProject(projectId: string, userId: string): Promise<ApiResponse> {
    try {
      const response = await this.client.delete(`/projects/${projectId}/users/${userId}`);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async changeUserProjectRole(projectId: string, userId: string, role: string): Promise<ApiResponse> {
    try {
      const response = await this.client.patch(`/projects/${projectId}/users/${userId}`, {
        role,
      });
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  // ========== OTHER ==========

  async generateAudit(): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/audit');
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }

  async pullSourceControl(): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/source-control/pull');
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.message || error.message };
    }
  }
}
