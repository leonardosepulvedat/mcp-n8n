# MCP n8n Server

[![smithery badge](https://smithery.ai/badge/mcp-n8n)](https://smithery.ai/server/mcp-n8n)
[![npm version](https://img.shields.io/npm/v/mcp-n8n.svg)](https://www.npmjs.com/package/mcp-n8n)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![n8n](https://img.shields.io/badge/n8n-compatible-orange.svg)](https://n8n.io)

**Operate and build n8n from Cursor or Claude** — administration of your instance (users, projects, executions, audit) **and** a builder loop so the agent can look up nodes, validate JSON, apply small edits, and debug the last failure.

Two env vars. Runs on your machine. No hosted account.

---

## 🎯 Token Optimization

**This server is optimized to minimize token consumption**, addressing one of the biggest issues with MCP servers - excessive API token usage.

### What We've Optimized:
- **90% reduction** in tokens for workflow listing with new `n8n_list_workflows_summary` endpoint
- **Field filtering** - request only the data you need
- **Smart defaults** - reduced from 100 to 10-20 results per query
- **Intelligent warnings** - alerts when operations will consume significant tokens

**See [TOKEN_OPTIMIZATION.md](./TOKEN_OPTIMIZATION.md) for detailed usage guide.**

---

## ✨ Features

### 🔄 Workflow Management
- **Create & Deploy**: Build workflows with natural language descriptions
- **CRUD Operations**: Full lifecycle management (Create, Read, Update, Delete)
- **Activation Control**: Enable/disable workflows on demand
- **Project Transfer**: Move workflows between projects seamlessly
- **Tag Management**: Organize workflows with custom tags

### 📊 Execution Monitoring
- **Real-time Tracking**: Monitor workflow executions with advanced filters
- **Detailed Insights**: Access full execution data and logs
- **Error Recovery**: Retry failed executions automatically
- **Cleanup Tools**: Manage execution history efficiently

### 🔐 Credential Management
- **Secure Creation**: Add credentials for any service
- **Schema Discovery**: Auto-discover required fields for credential types
- **Project Isolation**: Transfer credentials between projects safely
- **Type Support**: Compatible with all n8n credential types

### 🧱 Workflow Builder
- **Node catalog**: search ~60 of the most used n8n nodes (`n8n_search_nodes`, `n8n_get_node`) with required params, docs and examples — triggers, data utilities, databases, Google/Microsoft, messaging, and LangChain AI nodes
- **Validation**: `n8n_validate_workflow` catches missing params, broken connections and unknown types *before* save/activate
- **Surgical edits**: `n8n_update_workflow_partial` adds/removes nodes and connections without rewriting the whole flow
- **Debug loop**: `n8n_debug_last_error` returns the failing node and message from the last error
- **Public templates**: search and import from n8n.io (`n8n_search_public_templates`, `n8n_import_public_template`) plus 100 bundled templates as a fallback
- **Guided prompts**: MCP prompts `build-workflow` and `fix-workflow` walk any agent through the full build/validate/test/repair loop

### 🛡️ Safety Net & Real Testing
- **Automatic snapshots**: before every update, partial edit, or delete, the previous state is saved locally (`~/.mcp-n8n/snapshots`, configurable with `N8N_SNAPSHOT_DIR`)
- **Rollback**: `n8n_rollback_workflow` restores any snapshot — even recreates a deleted workflow (`recreate=true`)
- **End-to-end testing**: `n8n_trigger_webhook` calls a Webhook-trigger workflow on the instance and returns the real HTTP response, so the agent can verify the flow actually works

### 🎯 Bundled Templates
- 100 local starting points with keyword matching, if you prefer not to hit n8n.io

### 🏗️ Organization & Administration
- **Tags**: Categorize and organize resources
- **Variables**: Centralized environment variable management
- **Projects**: Multi-tenant project support
- **Users & Permissions**: Complete access control management
- **Audit Logs**: Generate security and compliance reports

---

## 🚀 Quick Start

### Installation via npm (Recommended)

This is the easiest way to get started:

```bash
npm install -g mcp-n8n
```

### Configuration

1. **Get your n8n API credentials**:
   - Navigate to your n8n instance → Settings → n8n API
   - Generate a new API key

2. **Configure Claude Desktop**:

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac/Linux) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

**Option A - Using global installation (if you ran `npm install -g mcp-n8n`):**
```json
{
  "mcpServers": {
    "n8n": {
      "command": "mcp-n8n",
      "env": {
        "N8N_BASE_URL": "https://your-n8n-instance.com",
        "N8N_API_KEY": "your-api-key-here",
        "N8N_TOOLSETS": "all"
      }
    }
  }
}
```

`N8N_TOOLSETS` is optional (`all` by default). Use `core,builder` if you want operations + creation without user/project admin tools. Use `admin` only for instance administration.

**Option B - Using npx (no installation needed, always latest version):**
```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["-y", "mcp-n8n"],
      "env": {
        "N8N_BASE_URL": "https://your-n8n-instance.com",
        "N8N_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

3. **Configure Cursor**:

Add to Cursor MCP settings (Settings → Extensions → MCP):

**Recommended - Using npx (always uses latest version):**
```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["-y", "mcp-n8n"],
      "env": {
        "N8N_BASE_URL": "https://your-n8n-instance.com",
        "N8N_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

> **Note**: Cursor requires using `npx` for MCP servers. The `-y` flag automatically installs/updates the package without prompting.

**Option C - Docker:**

```bash
docker build -t mcp-n8n .
```

```json
{
  "mcpServers": {
    "n8n": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "N8N_BASE_URL", "-e", "N8N_API_KEY",
        "-v", "mcp-n8n-data:/data",
        "mcp-n8n"
      ],
      "env": {
        "N8N_BASE_URL": "https://your-n8n-instance.com",
        "N8N_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

The `/data` volume persists workflow snapshots between runs.

4. **Restart Claude Desktop or Cursor**

---

## 💬 Usage Examples

Once configured, interact with n8n using natural language:

### Creating Workflows

```plaintext
"Create a workflow that monitors my Gmail inbox and sends
Slack notifications for important emails"
```

```plaintext
"Build a daily report workflow that pulls data from my database,
generates charts, and emails them to my team"
```

### Using Templates

```plaintext
"I need a WhatsApp chatbot with AI for customer support"
→ Automatically creates workflow from "WhatsApp AI Response Bot" template
```

```plaintext
"Create an automated stock analysis workflow"
→ Uses "Automated Stock Analysis with GPT-4" template
```

### Managing Workflows

```plaintext
"Show me all active workflows in the production project"
→ Uses n8n_list_workflows_summary for efficient token usage
```

```plaintext
"Show me the details of workflow abc123"
→ Uses n8n_get_workflow to fetch complete details only when needed
```

```plaintext
"Deactivate the 'Daily Backup' workflow"
```

```plaintext
"What went wrong with execution abc123?"
```

### Monitoring & Debugging

```plaintext
"Show me the last 10 failed executions"
```

```plaintext
"Retry all failed executions from workflow xyz456"
```

```plaintext
"Delete all successful executions older than 30 days"
```

---

## 🛠️ Available Tools

<details>
<summary><strong>Workflows</strong></summary>

- `n8n_create_workflow` - Create new workflows (validate first)
- `n8n_list_workflows_summary` - Token-efficient listing
- `n8n_list_workflows` - Full details with optional field filtering
- `n8n_get_workflow` - Full workflow JSON
- `n8n_update_workflow` - Replace fields (omitted fields keep current values)
- `n8n_update_workflow_partial` - Surgical edits: add/remove nodes and connections
- `n8n_delete_workflow` - Remove workflows permanently
- `n8n_activate_workflow` / `n8n_deactivate_workflow`
- `n8n_transfer_workflow` / tags tools

</details>

<details>
<summary><strong>Safety & Testing</strong></summary>

- `n8n_list_workflow_snapshots` - Local history of every change made through this server
- `n8n_rollback_workflow` - Restore a previous version, or recreate a deleted workflow
- `n8n_trigger_webhook` - Call a webhook workflow and get the real response

</details>

<details>
<summary><strong>Builder</strong></summary>

- `n8n_search_nodes` / `n8n_get_node` - Catalog of the most used nodes
- `n8n_validate_workflow` - Check JSON before save/activate
- `n8n_search_public_templates` / `n8n_import_public_template` - Official n8n.io library
- `n8n_list_workflow_templates` / `n8n_get_workflow_template` / `n8n_create_workflow_from_template` - Bundled templates

**100 Included Templates across 13 categories**:
- E-commerce: Shopify automation, WooCommerce support agents
- Social Media: Instagram, TikTok, LinkedIn, Twitter automation
- AI/Chat: Chatbots, AI agents, voice assistants
- Communication: WhatsApp, Telegram, Email automation
- Content: Blog automation, video generation, SEO optimization
- HR/Recruitment: Resume screening, candidate sourcing
- Sales/CRM: Lead generation, cold calling pipelines
- Finance: Stock analysis, invoice extraction
- Data Scraping: Google Maps, LinkedIn, Amazon, TikTok
- Monitoring: Website uptime, competitor tracking
- Productivity: Calendar, Notion, scheduling automation

</details>

<details>
<summary><strong>Executions (4 tools)</strong></summary>

- `n8n_list_executions` - Filter by status, workflow, project
- `n8n_get_execution` - Detailed execution data
- `n8n_delete_execution` - Remove execution records
- `n8n_retry_execution` - Retry failed executions
- `n8n_debug_last_error` - Failing node + message from the last error

</details>

<details>
<summary><strong>Credentials (4 tools)</strong></summary>

- `n8n_create_credential` - Add new credentials
- `n8n_delete_credential` - Remove credentials (owner only)
- `n8n_get_credential_schema` - Discover required fields
- `n8n_transfer_credential` - Move between projects

</details>

<details>
<summary><strong>Organization (19 tools)</strong></summary>

**Tags**: Create, list, get, update, delete
**Variables**: Create, list, update, delete
**Users**: List, create, get, delete, change role
**Projects**: Create, list, update, delete, manage users

</details>

<details>
<summary><strong>Advanced (2 tools)</strong></summary>

- `n8n_generate_audit` - Security audit reports
- `n8n_pull_source_control` - Version control integration

</details>

**55 tools** by default (`N8N_TOOLSETS=all`). `core,builder` exposes 24. Plus 2 MCP prompts (`build-workflow`, `fix-workflow`).

---

## 📚 Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Get up and running in 5 minutes
- **[Examples & Use Cases](EXAMPLES.md)** - Real-world automation examples
- **[Node Reference](NODE_REFERENCE.md)** - Detailed tool documentation
- **[Changelog](CHANGELOG.md)** - Version history and updates

---

## 🏗️ Project Structure

```
mcp-n8n/
├── src/
│   ├── index.ts          # MCP server implementation
│   ├── n8n-client.ts     # n8n API client
│   └── types.ts          # TypeScript definitions
├── examples/
│   ├── templates-metadata.json
│   └── *.json            # Pre-built workflow templates
├── dist/                 # Compiled output
├── QUICKSTART.md         # Quick start guide
├── EXAMPLES.md           # Usage examples
├── NODE_REFERENCE.md     # API documentation
└── package.json
```

---

## 🔧 Development

### Local Installation (For Development)

If you want to contribute or test local changes:

#### 1. Setup

```bash
# Clone repository
git clone https://github.com/leonardosepulvedat/mcp-n8n.git
cd mcp-n8n

# Install dependencies
npm install

# Build
npm run build

# Development with auto-rebuild
npm run watch
```

#### 2. Configure with Local Build

**For Claude Desktop**, add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-n8n/dist/index.js"],
      "env": {
        "N8N_BASE_URL": "https://your-n8n-instance.com",
        "N8N_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**For Cursor**, add to MCP settings:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-n8n/dist/index.js"],
      "env": {
        "N8N_BASE_URL": "https://your-n8n-instance.com",
        "N8N_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/mcp-n8n/` with the actual absolute path to your cloned repository (e.g., `/Users/yourname/projects/mcp-n8n/`).

#### 3. Testing

```bash
# Set environment variables
cp .env.example .env
# Edit .env with your credentials

# Build and test
npm run build
node dist/index.js
```

---

## How to Run

To run the main script, execute:

```bash
python main.py
```

## How to Test

To run the tests, execute:

```bash
pytest test_main.py
```

---

## 📋 Requirements

- **Node.js**: 20 or higher
- **n8n Instance**: Self-hosted or n8n Cloud (paid plan)
- **n8n API Key**: Required for authentication
- **AI IDE**: Claude Desktop or Cursor with MCP support

### n8n Requirements

- **Self-hosted**: Full API access ✅
- **n8n Cloud**: Requires paid plan for API access
- **Version**: Compatible with n8n v1.0.0+

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[n8n](https://n8n.io)** - The workflow automation platform
- **[Anthropic](https://anthropic.com)** - Claude and Model Context Protocol
- **[Cursor](https://cursor.sh)** - AI-powered code editor

---

## 🔗 Resources

- [n8n API Documentation](https://docs.n8n.io/api/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [n8n Community](https://community.n8n.io/)
- [MCP Servers Registry](https://github.com/modelcontextprotocol/servers)

---

## ⚠️ Important Notes

### API Access
- n8n Cloud requires a **paid plan** to access the API
- Self-hosted n8n has **full API access** on all plans
- Some operations require **owner/admin permissions**

### Security
- Never commit `.env` files with credentials
- Use environment variables for sensitive data
- API keys grant full access to your n8n instance
- Regularly rotate API keys for security

### Rate Limiting
- Respect n8n API rate limits
- Use pagination for large result sets
- Implement error handling for rate limit responses

---

## 🐛 Troubleshooting

### Connection Issues

**Problem**: "Cannot connect to n8n API"
- Verify `N8N_BASE_URL` is correct and accessible
- Check that API key is valid
- Ensure n8n instance is running

### Permission Errors

**Problem**: "Insufficient permissions"
- Some operations require owner/admin role
- Verify your user has appropriate permissions
- Check project-level access rights

### Template Issues

**Problem**: "Template not found"
- Ensure `examples/` directory is present
- Verify `templates-metadata.json` exists
- Check template file references are correct

---

## 💡 Tips & Best Practices

1. **Start with Templates**: Use pre-built templates as starting points
2. **Use Tags**: Organize workflows with tags for easy management
3. **Monitor Executions**: Regularly check failed executions
4. **Clean Up**: Remove old execution data to save space
5. **Version Control**: Use n8n's built-in version control features
6. **Test First**: Test workflows before activating in production

---

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/leonardosepulvedat/mcp-n8n/issues)
- **Discussions**: [GitHub Discussions](https://github.com/leonardosepulvedat/mcp-n8n/discussions)
- **n8n Community**: [community.n8n.io](https://community.n8n.io/)

---

<div align="center">

**[⬆ Back to Top](#mcp-n8n-server)**


</div>
