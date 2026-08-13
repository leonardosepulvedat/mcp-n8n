import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { N8nClient } from '../src/n8n-client.js';

vi.mock('axios');

describe('N8nClient', () => {
  let post: ReturnType<typeof vi.fn>;
  let get: ReturnType<typeof vi.fn>;
  let put: ReturnType<typeof vi.fn>;
  let client: N8nClient;

  beforeEach(() => {
    post = vi.fn().mockResolvedValue({ data: { id: 'wf-1' } });
    get = vi.fn().mockResolvedValue({ data: {} });
    put = vi.fn().mockResolvedValue({ data: { id: 'wf-1' } });
    vi.mocked(axios.create).mockReturnValue({
      post,
      get,
      put,
      delete: vi.fn(),
      patch: vi.fn(),
    } as any);
    client = new N8nClient({ baseUrl: 'https://n8n.example.com', apiKey: 'key' });
  });

  it('configures the API base URL and auth header', () => {
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'https://n8n.example.com/api/v1',
      headers: {
        'X-N8N-API-KEY': 'key',
        'Content-Type': 'application/json',
      },
    });
  });

  describe('createWorkflow', () => {
    it('fills in the fields the n8n API requires', async () => {
      await client.createWorkflow({ name: 'My workflow' });

      const [url, body] = post.mock.calls[0];
      expect(url).toBe('/workflows');
      expect(body).toEqual({
        name: 'My workflow',
        nodes: [],
        connections: {},
        settings: { executionOrder: 'v1' },
      });
    });

    it('keeps caller-provided nodes and settings', async () => {
      const nodes = [{ name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }];
      await client.createWorkflow({ name: 'wf', nodes: nodes as any, settings: { timezone: 'UTC' } });

      expect(post.mock.calls[0][1].nodes).toEqual(nodes);
      expect(post.mock.calls[0][1].settings).toEqual({ timezone: 'UTC' });
    });
  });

  describe('updateWorkflow', () => {
    it('fetches the current workflow and merges partial updates', async () => {
      const existing = {
        name: 'Old name',
        nodes: [{ name: 'Webhook' }],
        connections: { Webhook: {} },
        settings: { executionOrder: 'v1' },
      };
      get.mockResolvedValue({ data: existing });

      await client.updateWorkflow('wf-1', { name: 'New name' });

      expect(get).toHaveBeenCalledWith('/workflows/wf-1');
      const [url, body] = put.mock.calls[0];
      expect(url).toBe('/workflows/wf-1');
      // Only the name changes; everything else is preserved from the fetch
      expect(body).toEqual({ ...existing, name: 'New name' });
    });

    it('returns the API error message when the fetch fails', async () => {
      get.mockRejectedValue({
        response: { data: { message: 'workflow not found' } },
        message: 'Request failed',
      });

      const result = await client.updateWorkflow('missing', { name: 'x' });
      expect(result.error).toBe('workflow not found');
    });
  });

  describe('getWorkflows', () => {
    it('filters returned fields locally when fields are requested', async () => {
      get.mockResolvedValue({
        data: {
          data: [
            { id: '1', name: 'A', active: true, nodes: [{ big: 'payload' }] },
            { id: '2', name: 'B', active: false, nodes: [{ big: 'payload' }] },
          ],
        },
      });

      const result = await client.getWorkflows({ fields: ['id', 'name'] });

      expect(result.data.data).toEqual([
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ]);
      // The fields parameter must not be forwarded to the API
      expect(get.mock.calls[0][1].params).toEqual({});
    });
  });
});
