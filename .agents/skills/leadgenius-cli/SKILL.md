---
name: leadgenius-cli
description: Manage B2B leads, enrichment, AI scoring, and sales automation via the LeadGenius Pro platform. Use when the user asks to find leads, enrich contacts, score prospects, manage campaigns, import CSV leads, provision users, run FSD pipelines, check EpsimoAI credits, manage territory companies, or interact with the LeadGenius API. Also use when the user mentions "lgp", "LeadGenius", "lead enrichment", "lead scoring", "ICP", "FSD pipeline", "territory companies", or "EpsimoAI".
license: See LICENSE file in repository root
compatibility: Requires Node.js >= 18 and leadgenius-cli npm package
metadata:
  author: Thierry Teisseire
  version: "2.0.15"
  homepage: https://last.leadgenius.app
  repository: https://github.com/thierryteisseire/leadgenius-cli
allowed-tools: Bash(lgp:*), Bash(npx:leadgenius-cli *)
---

# LeadGenius CLI Skill

Operate the LeadGenius Pro B2B platform from the command line. This skill provides the `lgp` CLI for lead management, enrichment, AI scoring, pipeline automation, user provisioning, and more.

## Setup

Install the CLI globally:

```bash
npm install -g leadgenius-cli
```

Set the API key (persists across sessions):

```bash
lgp config set api-key lgp_YOUR_KEY_HERE
lgp auth test
```

Credentials are saved to `~/.leadgenius-cli/session.json` and auto-loaded on subsequent runs.

## Core Workflows

### Search and list leads

```bash
# Smart search — auto-detects email, name, or URL, case-insensitive
lgp leads search -q "Jane Doe"
lgp leads search -q "user@example.com"

# List leads for a client (shows interactive client picker if -c omitted)
lgp leads list
lgp leads list -c <client-id> --limit 20
```

### Import leads from CSV

```bash
lgp leads import --file leads.csv
```

CSV headers map directly to API fields: `firstName`, `lastName`, `email`, `companyName`, `title`, `linkedinUrl`, etc. The CLI prompts for client selection.

### Enrich, score, and generate AI content

```bash
lgp tasks enrich --lead <id>
lgp tasks score --lead <id>
lgp tasks copyright --lead <id>
```

### Run FSD pipeline (full automation)

```bash
lgp fsd run -c <client> --icp <id> --enrich --score
lgp fsd status <pipelineId>
lgp fsd campaigns
```

### Provision a new user for UI login at last.leadgenius.app

```bash
# Creates Cognito user + CompanyUser + optional API key
lgp users provision -e user@example.com -p "SecurePass123!" --company-id <id> --role admin --group admin

# Set UI access (requires admin key)
lgp cognito set-attributes -e user@example.com --attributes '{"custom:allowed_views":"role:companyAdmin|*"}'
```

### Manage territory companies

```bash
lgp companies list -c <client>
lgp companies leads <companyId>
lgp companies content-analysis <companyId>
lgp companies aggregate -c <client>
lgp companies events radar
```

### EpsimoAI credits and threads

In TUI mode (`lgp` with no args), EpsimoAI authenticates automatically via Cognito token exchange. In CLI mode:

```bash
lgp epsimo activate --cognito-token <jwt>
lgp epsimo info -t <token>
lgp epsimo credits -t <token>
lgp epsimo threads -t <token>
```

### Report bugs and request features

```bash
lgp maintenance bugs report --desc "Description of the issue" --email dev@company.com
lgp maintenance enhancements request --desc "Feature idea" --email dev@company.com
lgp maintenance bugs list
```

## All Command Groups

| Group | Description | Key Commands |
|-------|-------------|-------------|
| `auth` | Test connection | `auth test` |
| `leads` | Lead CRUD, search, import, dedup | `list`, `search -q`, `import --file`, `dedup` |
| `tasks` | Background jobs | `enrich`, `score`, `copyright` |
| `fsd` | Full-Stack Demand pipeline | `run`, `campaigns`, `status` |
| `companies` | Territory intelligence | `list`, `leads`, `aggregate`, `events` |
| `users` | User management | `list`, `create`, `provision`, `menu-config` |
| `org` | Company management | `list`, `create`, `rename`, `add-user` |
| `cognito` | Cognito user pool (admin) | `list`, `get`, `create`, `set-attributes` |
| `epsimo` | EpsimoAI integration | `activate`, `info`, `credits`, `threads` |
| `tables` | Generic CRUD for any table | `list <Table>`, `create`, `update`, `delete` |
| `generate` | Lead generation | `from-icp`, `direct`, `schedule` |
| `campaigns` | ABM campaigns | `list`, `create` |
| `clients` | Client management | `list`, `create` |
| `shares` | Shared links | `create`, `extend`, `revoke` |
| `webhooks` | Inbound events | `list`, `get`, `reprocess` |
| `maintenance` | Bugs & enhancements | `bugs list/report`, `enhancements list/request` |
| `pipeline` | Analytics | `--start --end` |
| `account-analysis` | Account intelligence | `list`, `analyze`, `export` |
| `admin` | Backups, PITR, system | `backup`, `pitr`, `org-tree`, `views` |
| `config` | Session management | `show`, `set`, `get`, `reset` |

## Output Format

By default, the CLI shows smart-formatted output with tables, colors, and progress bars. Use `--format json` for raw JSON (useful for piping to `jq` or scripts):

```bash
lgp leads list -c <id> --format json | jq '.data[].email'
```

## Interactive TUI

Launch with no arguments for a menu-driven interface:

```bash
lgp
```

The TUI provides client picker dropdowns, auto-authentication for EpsimoAI, and all commands accessible via menus.

## API Base URL

```
https://api.leadgenius.app/api/automation/
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `LGP_API_KEY` | API key (lgp_ prefix) |
| `LGP_URL` | Base URL (default: https://api.leadgenius.app) |
| `LGP_ADMIN_KEY` | Admin key for cognito/admin commands |

## Reference Docs

- [Full CLI README](README.md)
- [API Endpoints](references/api_endpoints.md) — all REST endpoints with request/response examples
- [CLI Reference](references/cli_reference.md) — detailed flag documentation
- [Workflows](references/workflows.md) — step-by-step business workflows
- [Use Cases](references/use_cases.md) — end-to-end scenarios
