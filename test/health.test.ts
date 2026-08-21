import { describe, it, expect } from 'vitest';
import { computeHealth } from '../src/health.js';

describe('computeHealth', () => {
  it('aggregates executions per workflow, worst first', () => {
    const executions = [
      { workflowId: 'good', status: 'success', startedAt: '2026-08-20T10:00:00Z', stoppedAt: '2026-08-20T10:00:02Z' },
      { workflowId: 'good', status: 'success', startedAt: '2026-08-20T11:00:00Z', stoppedAt: '2026-08-20T11:00:04Z' },
      { workflowId: 'bad', status: 'error', startedAt: '2026-08-20T09:00:00Z', stoppedAt: '2026-08-20T09:00:01Z' },
      { workflowId: 'bad', status: 'success', startedAt: '2026-08-20T08:00:00Z', stoppedAt: '2026-08-20T08:00:01Z' },
    ];
    const names = new Map([['good', 'Good flow'], ['bad', 'Bad flow']]);
    const health = computeHealth(executions, names);

    expect(health[0].workflowId).toBe('bad');
    expect(health[0].successRate).toBe(50);
    expect(health[0].lastFailureAt).toBe('2026-08-20T09:00:00Z');
    expect(health[1]).toMatchObject({ workflowId: 'good', workflowName: 'Good flow', successRate: 100, avgDurationMs: 3000 });
  });

  it('handles running executions without durations', () => {
    const health = computeHealth([{ workflowId: 'w', status: 'running', startedAt: '2026-08-20T10:00:00Z' }]);
    expect(health[0].running).toBe(1);
    expect(health[0].successRate).toBeNull();
    expect(health[0].avgDurationMs).toBeNull();
  });
});
