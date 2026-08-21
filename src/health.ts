export interface WorkflowHealth {
  workflowId: string;
  workflowName?: string;
  executions: number;
  succeeded: number;
  failed: number;
  running: number;
  waiting: number;
  canceled: number;
  successRate: number | null;
  avgDurationMs: number | null;
  lastExecutionAt?: string;
  lastFailureAt?: string;
}

/**
 * Aggregates raw executions (as returned by the n8n public API) into
 * per-workflow health statistics, sorted worst-first.
 */
export function computeHealth(
  executions: any[],
  workflowNames: Map<string, string> = new Map()
): WorkflowHealth[] {
  const byWorkflow = new Map<string, any[]>();
  for (const execution of executions) {
    const id = String(execution.workflowId ?? 'unknown');
    if (!byWorkflow.has(id)) byWorkflow.set(id, []);
    byWorkflow.get(id)!.push(execution);
  }

  const results: WorkflowHealth[] = [];
  for (const [workflowId, execs] of byWorkflow) {
    const counts = { success: 0, error: 0, running: 0, waiting: 0, canceled: 0 };
    const durations: number[] = [];
    let lastExecutionAt: string | undefined;
    let lastFailureAt: string | undefined;

    for (const execution of execs) {
      const status: string = execution.status ?? (execution.finished ? 'success' : 'error');
      if (status in counts) (counts as any)[status]++;

      if (execution.startedAt) {
        if (!lastExecutionAt || execution.startedAt > lastExecutionAt) {
          lastExecutionAt = execution.startedAt;
        }
        if (status === 'error' && (!lastFailureAt || execution.startedAt > lastFailureAt)) {
          lastFailureAt = execution.startedAt;
        }
        if (execution.stoppedAt) {
          const duration = new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime();
          if (Number.isFinite(duration) && duration >= 0) durations.push(duration);
        }
      }
    }

    const finished = counts.success + counts.error;
    results.push({
      workflowId,
      workflowName: workflowNames.get(workflowId),
      executions: execs.length,
      succeeded: counts.success,
      failed: counts.error,
      running: counts.running,
      waiting: counts.waiting,
      canceled: counts.canceled,
      successRate: finished > 0 ? Math.round((counts.success / finished) * 100) : null,
      avgDurationMs:
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : null,
      lastExecutionAt,
      lastFailureAt,
    });
  }

  // Worst first: lowest success rate, then most failures
  return results.sort((a, b) => {
    const rateA = a.successRate ?? 101;
    const rateB = b.successRate ?? 101;
    return rateA - rateB || b.failed - a.failed;
  });
}
