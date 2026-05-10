# LeadGenius CLI

The official command-line interface for [LeadGenius Pro](https://last.leadgenius.app) — B2B lead management, enrichment, AI scoring, and automation.

[![npm version](https://img.shields.io/npm/v/leadgenius-cli)](https://www.npmjs.com/package/leadgenius-cli)

## Features

- **20 command groups, 100+ commands** covering the full LeadGenius API
- **Interactive TUI** — menu-driven interface, launches with `lgp` (no args)
- **Smart formatting** — tables, progress bars, colored statuses (use `--format json` for raw output)
- **Client picker** — dropdown selection instead of typing client IDs
- **Smart search** — case-insensitive, auto-detects email/name/URL
- **CSV import** — import leads from CSV files with auto-header mapping
- **Session persistence** — credentials saved to `~/.leadgenius-cli/session.json`, auto-loaded on next run
- **EpsimoAI integration** — Cognito → EpsimoAI token exchange, cached for session
- **Chrome Extension** — Google OAuth + email sign-in, API test from browser
- **Cross-platform binaries** — macOS (Intel + Apple Silicon), Windows, Linux

## Installation

```bash
npm install -g leadgenius-cli
```

Or run without installing:

```bash
npx leadgenius-cli --help
```

## Quick Start

```bash
# First run — saves credentials for future sessions
lgp --api-key lgp_your_key_here auth test

# From now on, just run:
lgp auth test

# Launch interactive TUI
lgp

# List leads (prompts for client selection)
lgp leads list

# Search leads (case-insensitive)
lgp leads search -q "eric"

# Import from CSV
lgp leads import --file leads.csv
```

## Authentication

Set your API key via any of these methods (in priority order):

1. **CLI flag:** `lgp --api-key lgp_xxx ...`
2. **Environment variable:** `export LGP_API_KEY=lgp_xxx`
3. **Saved session:** `lgp config set api-key lgp_xxx` (persists to `~/.leadgenius-cli/session.json`)

```bash
# Verify connection
lgp auth test

# Manage saved credentials
lgp config show       # view (tokens masked)
lgp config set api-key lgp_xxx
lgp config reset      # clear all
```

## Global Options

| Flag | Default | Description |
|------|---------|-------------|
| `-k, --api-key <key>` | `LGP_API_KEY` env / saved session | API key (lgp_ prefix) |
| `-u, --url <url>` | `https://api.leadgenius.app` | API base URL |
| `-a, --admin-key <key>` | `LGP_ADMIN_KEY` env | Admin key for admin commands |
| `-f, --format <fmt>` | smart | `json` for raw JSON output |

## Command Reference

### auth — Authentication

```bash
lgp auth test                    # verify API key
```

### leads — Lead Management

```bash
lgp leads list                   # list leads (shows client picker)
lgp leads list -c <client-id>    # list with explicit client
lgp leads get <id>               # get lead detail
lgp leads search -q "Jane Doe"   # smart search (name, email, or URL)
lgp leads import --file data.csv # import from CSV
lgp leads import --file data.json
lgp leads dedup -c <id> -m email # find duplicates
lgp leads dedup-resolve --keep <id> --merge <id1>,<id2>
lgp leads transfer --from <id> --to <id> --dry-run
lgp leads activity <leadId> -t email_sent --notes "Follow-up"
lgp leads activities <leadId>    # engagement history
lgp leads validate-ownership     # scan for orphaned leads
lgp leads prune-blanks --client-id <id> --dry-run
```

### tasks — Background Jobs

```bash
lgp tasks list                   # list jobs
lgp tasks status <jobId>         # job status
lgp tasks enrich --lead <id>     # trigger enrichment
lgp tasks copyright --lead <id>  # trigger AI content
lgp tasks score --lead <id>      # trigger scoring
```

### fsd — Full-Stack Demand Pipeline

```bash
lgp fsd campaigns                # list campaigns
lgp fsd campaign <id>            # campaign detail
lgp fsd create-campaign -c <client> -n "My Campaign" --icp <id>
lgp fsd update-campaign <id> --target 200
lgp fsd deactivate-campaign <id>
lgp fsd run -c <client> --icp <id> --enrich --score
lgp fsd status <pipelineId>
```

### companies — Territory Intelligence

```bash
lgp companies list -c <client>   # list territory companies
lgp companies get <id>
lgp companies leads <id>         # leads for a company
lgp companies content-analysis <id>
lgp companies aggregate -c <client>
lgp companies events list
lgp companies events create --company-id <id> --type new_lead
lgp companies events generate -c <client>
lgp companies events radar
```

### users — User Management

```bash
lgp users list
lgp users get <id>
lgp users create -e user@example.com --role admin --group admin
lgp users update <id> --role member
lgp users delete <id>
lgp users provision -e user@example.com -p "Pass123!" --company-id <id>
lgp users menu-config            # available menus per group
```

### org — Organization Management

```bash
lgp org list                     # list companies
lgp org get <id>
lgp org create -n "Acme Corp"
lgp org rename <id> -n "New Name"
lgp org delete <id>
lgp org users <companyId>
lgp org add-user <companyId> -e user@example.com --role member
lgp org update-user <userId> --role admin
lgp org remove-user <userId>
```

### cognito — User Pool (requires admin key)

```bash
lgp cognito list                 # list Cognito users
lgp cognito get -e user@example.com
lgp cognito create -e user@example.com -p "Pass123!"
lgp cognito enable -e user@example.com
lgp cognito disable -e user@example.com
lgp cognito set-password -e user@example.com -p "NewPass!"
lgp cognito set-attributes -e user@example.com --attributes '{"custom:allowed_views":"role:companyAdmin|*"}'
```

### epsimo — EpsimoAI

```bash
lgp epsimo activate -e user@example.com -p "pass"  # login mode
lgp epsimo activate --cognito-token <jwt>           # exchange mode
lgp epsimo info -t <token>       # profile & plan
lgp epsimo credits -t <token>    # credit balance
lgp epsimo purchase -t <token> -a 100
lgp epsimo threads -t <token>    # thread usage
```

In TUI mode, EpsimoAI authenticates automatically via Cognito → EpsimoAI token exchange.

### tables — Generic CRUD

```bash
lgp tables list <TableName>      # list records
lgp tables get <TableName> <id>
lgp tables create <TableName> -d '{"name":"test"}'
lgp tables update <TableName> <id> -d '{"status":"active"}'
lgp tables delete <TableName> <id>
```

Supported tables: `Company`, `CompanyUser`, `ICP`, `ABMCampaign`, `TargetAccount`, `Agent`, `AgentSettings`, `SdrAiSettings`, `UrlSettings`, `Client`, `Maintenance`, `EnrichmentService`, and [many more](SKILL.md).

### generate — Lead Generation

```bash
lgp generate from-icp --icp <id> -c <client> --max-leads 200
lgp generate direct --provider <name> --config '{}' -c <client>
lgp generate status <runId>
lgp generate history
lgp generate schedule create --icp <id> -c <client> --frequency weekly
lgp generate schedule list
lgp generate schedule pause <id>
lgp generate schedule resume <id>
lgp generate schedule delete <id>
```

### campaigns — ABM Campaigns

```bash
lgp campaigns list
lgp campaigns create -n "Q2 Campaign" --type abm
```

### clients — Client Management

```bash
lgp clients list
lgp clients create -n "Acme Corp" --url https://acme.com
```

### shares — Shared Links

```bash
lgp shares list
lgp shares get <id>
lgp shares create --days 30 --allow-edit
lgp shares extend <id> --days 15
lgp shares set-expiry <id> --date 2026-12-31
lgp shares revoke <id>
lgp shares reactivate <id> --days 30
```

### webhooks — Inbound Events

```bash
lgp webhooks list --platform woodpecker
lgp webhooks get <id>
lgp webhooks reprocess <id>
```

### maintenance — Bugs & Enhancements

```bash
lgp maintenance bugs list
lgp maintenance bugs report --desc "Description" --email dev@example.com
lgp maintenance enhancements list
lgp maintenance enhancements request --desc "Feature idea" --email dev@example.com
```

### pipeline — Analytics

```bash
lgp pipeline --start 2026-04-01 --end 2026-05-01
```

### account-analysis — Account Intelligence

```bash
lgp account-analysis list -c <client>
lgp account-analysis analyze -c <client> --company "Acme"
lgp account-analysis export -c <client> --format csv --output report.csv
lgp account-analysis cache-clear
```

### admin — System Administration

```bash
lgp admin backup tables          # list DynamoDB tables
lgp admin backup create --table <name>
lgp admin backup create --all
lgp admin backup list
lgp admin backup describe --arn <arn>
lgp admin backup delete --arn <arn>
lgp admin backup restore --arn <arn> --target-table <name>
lgp admin pitr status
lgp admin pitr enable --table <name>
lgp admin pitr disable --table <name>
lgp admin org-tree --company <id> --detailed
lgp admin companies list
lgp admin companies show --id <id>
lgp admin users list --search "term"
lgp admin views
lgp admin clients
```

### config — Session Management

```bash
lgp config show                  # view saved session (tokens masked)
lgp config set api-key lgp_xxx   # save a value
lgp config set url https://api.leadgenius.app
lgp config get api-key           # retrieve a value
lgp config reset                 # clear all saved data
```

## Interactive TUI

Launch with no arguments:

```bash
lgp
```

```
🚀 LeadGenius Pro — Interactive Mode

✓ Connected as e42814d8-... (company: company-...)

? Main Menu
❯ 🔑 Auth — Test connection
  👥 Leads — Manage leads
  ⚡ Tasks — Background jobs
  🚀 FSD — Pipeline campaigns
  🏢 Companies — Territory intel
  ...
  🔧 Config — Session & credentials
  ✕ Exit
```

Features:
- Arrow keys to navigate, Enter to select
- Client picker dropdown (no need to type IDs)
- EpsimoAI auto-authentication via Cognito
- All commands available through menus

## CSV Import

Import leads from CSV files with automatic header mapping:

```csv
firstName,lastName,email,companyName,title
Jane,Doe,jane@acme.com,Acme Corp,VP Sales
John,Smith,john@example.com,Example Inc,CTO
```

```bash
lgp leads import --file leads.csv
# Prompts for client selection, then imports
```

Supports `,` and `;` delimiters, quoted fields, and any [EnrichLead field](references/api_endpoints.md) as a column header.

## Chrome Extension

The `dist/extension/` folder contains a Manifest V3 Chrome Extension with:

- **Google OAuth sign-in** via Cognito hosted UI
- **Email/password sign-in**
- **API connection test**
- **Quick link** to last.leadgenius.app

### Setup

1. Go to `chrome://extensions` → Enable Developer Mode → Load Unpacked
2. Select the `dist/extension/` folder
3. Add the extension's redirect URI to Cognito (see [setup instructions](SKILL.md))

## Cross-Platform Binaries

Build standalone binaries (no Node.js required):

```bash
npm run package
```

Outputs to `dist/bin/`:
- `lgp-macos-arm64` (Apple Silicon)
- `lgp-macos-x64` (Intel Mac)
- `lgp-win-x64.exe` (Windows)
- `lgp-linux-x64` (Linux / ChromeOS)

## Development

```bash
git clone https://github.com/thierryteisseire/leadgenius-cli.git
cd leadgenius-cli
npm install

# Run from source
npx tsx src/cli/index.ts --help

# Build
npm run build          # TypeScript + extension
npm run build:binary   # standalone binaries

# Type check
npx tsc --noEmit
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LGP_API_KEY` | API key (lgp_ prefix) | — |
| `LGP_URL` | API base URL | `https://api.leadgenius.app` |
| `LGP_ADMIN_KEY` | Admin key for admin commands | — |

## License

See [LICENSE](LICENSE).
