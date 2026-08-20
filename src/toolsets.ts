export type ToolsetName = 'core' | 'builder' | 'admin';

const TOOLSETS: Record<ToolsetName, string[]> = {
  core: [
    'n8n_create_workflow',
    'n8n_list_workflows_summary',
    'n8n_list_workflows',
    'n8n_get_workflow',
    'n8n_update_workflow',
    'n8n_update_workflow_partial',
    'n8n_delete_workflow',
    'n8n_activate_workflow',
    'n8n_deactivate_workflow',
    'n8n_list_executions',
    'n8n_get_execution',
    'n8n_retry_execution',
    'n8n_debug_last_error',
  ],
  builder: [
    'n8n_search_nodes',
    'n8n_get_node',
    'n8n_validate_workflow',
    'n8n_search_public_templates',
    'n8n_import_public_template',
    'n8n_list_workflow_templates',
    'n8n_get_workflow_template',
    'n8n_create_workflow_from_template',
  ],
  admin: [
    'n8n_transfer_workflow',
    'n8n_get_workflow_tags',
    'n8n_update_workflow_tags',
    'n8n_delete_execution',
    'n8n_create_credential',
    'n8n_delete_credential',
    'n8n_get_credential_schema',
    'n8n_transfer_credential',
    'n8n_create_tag',
    'n8n_list_tags',
    'n8n_get_tag',
    'n8n_update_tag',
    'n8n_delete_tag',
    'n8n_create_variable',
    'n8n_list_variables',
    'n8n_update_variable',
    'n8n_delete_variable',
    'n8n_list_users',
    'n8n_create_users',
    'n8n_get_user',
    'n8n_delete_user',
    'n8n_change_user_role',
    'n8n_create_project',
    'n8n_list_projects',
    'n8n_update_project',
    'n8n_delete_project',
    'n8n_add_user_to_project',
    'n8n_remove_user_from_project',
    'n8n_change_user_project_role',
    'n8n_generate_audit',
    'n8n_pull_source_control',
  ],
};

export function parseToolsets(raw?: string): Set<string> {
  const value = (raw || 'all').trim().toLowerCase();
  if (!value || value === 'all') {
    return new Set(Object.values(TOOLSETS).flat());
  }
  const enabled = new Set<string>();
  for (const part of value.split(',').map((p) => p.trim())) {
    if (part in TOOLSETS) {
      for (const name of TOOLSETS[part as ToolsetName]) enabled.add(name);
    }
  }
  return enabled.size > 0 ? enabled : new Set(Object.values(TOOLSETS).flat());
}

export function shouldRegister(name: string, enabled: Set<string>): boolean {
  return enabled.has(name);
}
