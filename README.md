# GTM Engine

> Multi-client Go-To-Market pipeline — from ICP definition to outreach, automated.

One engine, many clients. Each client gets its own config, credentials, database, and LeadGenius account — sharing all skills, scripts, and pipeline logic.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Step-by-Step: Your First Client](#step-by-step-your-first-client)
- [Daily Operations](#daily-operations)
- [Commands Reference](#commands-reference)
- [Architecture](#architecture)
- [Config Reference](#config-reference)
- [Multi-Client Operations](#multi-client-operations)
- [Troubleshooting](#troubleshooting)

---

## What It Does

The GTM Engine runs an 8-stage B2B sales pipeline for each client:

```
┌──────────┐    ┌───────────┐    ┌─────────┐    ┌──────────┐
│ 1. ICP   │───→│ 2. Search │───→│ 3. Scrape│───→│ 4. Enrich│
│  Define  │    │  LinkedIn │    │  Leads   │    │  Data    │
└──────────┘    └───────────┘    └─────────┘    └──────────┘
                                                      │
┌──────────┐    ┌───────────┐    ┌─────────┐    ┌─────▼────┐
│ 8. Send  │◀───│ 7. Score  │◀───│ 6. Rank │◀───│ 5. Monitor│
│ Outreach │    │  AI Score │    │  Intent │    │  Signals │
└──────────┘    └───────────┘    └─────────┘    └──────────┘
```

**Platforms used:** LeadGenius Pro, Neon Postgres, Trigify, Notion, Vayne, AnyMailFinder, Anthropic Claude.

---

## Prerequisites

Before you start, make sure you have:

### 1. System Requirements

```bash
# Node.js 18+ (for the LeadGenius CLI)
node --version   # v18.x or higher

# Python 3.9+
python3 --version

# Git
git --version
```

### 2. Install LeadGenius CLI

```bash
npm install -g leadgenius-cli

# Verify
lgp --version
```

### 3. Install Python Dependencies

```bash
pip install psycopg2-binary requests
```

### 4. Platform Accounts

You'll need accounts on these platforms. Gather credentials before starting:

| Platform | What You Need | Where to Get It |
|---|---|---|
| **LeadGenius Pro** | API key + Admin key | [last.leadgenius.app](https://last.leadgenius.app) → Settings → API |
| **Neon Postgres** | Connection string (DSN) | [console.neon.tech](https://console.neon.tech) → Project → Connection Details |
| **Trigify** | API key | [app.trigify.io](https://app.trigify.io) → Settings → API |
| **Notion** *(optional)* | API key + Dashboard page ID | [notion.so/my-integrations](https://www.notion.so/my-integrations) |

---

## Getting Started

### Clone and Configure

```bash
# 1. Clone the repo
git clone https://github.com/Epsimo/gtm-engine.git
cd gtm-engine

# 2. Set up shared environment (API keys used across all clients)
cp .env.template .env
```

### Edit `.env` — Shared API Keys

Open `.env` and fill in the keys that are shared across all clients:

```bash
# .env — fill in your values
TRIGIFY_API_KEY=trig_your_key_here
VAYNE_API_KEY=your_vayne_key
ANYMAILFINDER_API_KEY=your_key
ANTHROPIC_API_KEY=sk-ant-your_key
```

> **Note:** Client-specific keys (LeadGenius, Neon, Notion) go in each client's JSON config, not here.

---

## Step-by-Step: Your First Client

Follow this checklist in order. Each step has a **verification** command so you know it worked.

---

### ☐ Step 1 — Bootstrap the Client

Creates a config file from the template and a data directory.

```bash
./scripts/bootstrap.sh acme
```

**Output:**
```
✅ Created config: config/clients/acme.json
✅ Created data dir: data/clients/acme
```

**Verify:**
```bash
ls config/clients/acme.json   # Should exist
ls data/clients/acme/          # Should exist (empty)
```

---

### ☐ Step 2 — Get LeadGenius Credentials

Before editing the config, gather these from the LeadGenius platform:

1. **Log in** to [last.leadgenius.app](https://last.leadgenius.app)
2. Go to **Settings → API** to find:
   - `API Key` (starts with `lgp_...`)
   - `Admin Key` (used for rate-limit bypass and user management)
3. Find your **Client IDs** (campaign identifiers):

```bash
# Set the API key temporarily
lgp config set api-key lgp_your_client_key_here

# List all clients (campaigns) in the account
lgp leads search -q "any keyword" --format json | head -20
# → Look for "client_id" values in the output
```

Write down: `api_key`, `admin_key`, and all `client_id` values.

---

### ☐ Step 3 — Create a Neon Database

1. Go to [console.neon.tech](https://console.neon.tech)
2. Click **New Project** → give it a name (e.g., `acme-gtm`)
3. Copy the **Connection String** (DSN) — it looks like:
   ```
   postgresql://neondb_owner:npg_XXXX@ep-something.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

> **Tip:** The free tier gives you one project with 512 MB storage — plenty for a GTM pipeline.

---

### ☐ Step 4 — Edit the Client Config

Open `config/clients/acme.json` and fill in all the sections:

```bash
# Open in your editor
code config/clients/acme.json  # or vim, nano, etc.
```

Here's what to fill in — section by section:

#### Product (what the client sells)

```json
"product": {
  "name": "Acme Corp — Sales Automation Platform",
  "category": "sales ops",
  "keywords": ["CRM migration", "sales automation", "pipeline management"],
  "problem_solved": "Manual sales processes slowing down revenue teams"
}
```

#### ICP (who to target)

```json
"icp": {
  "target_roles": [
    "VP of Sales", "CRO", "Head of Revenue Operations",
    "Director of Sales", "Sales Operations Manager"
  ],
  "target_industries": ["SaaS", "Fintech", "Manufacturing"],
  "target_geography": ["United States", "Canada"],
  "target_company_size": { "min_employees": 50, "max_employees": 500 },
  "disqualification": ["< 20 employees", "Already using Salesforce CPQ"]
}
```

#### Credentials (from Steps 2 & 3)

```json
"credentials": {
  "leadgenius": {
    "api_key": "lgp_your_actual_key_here",
    "admin_key": "your_actual_admin_key_here"
  },
  "neon": {
    "dsn": "postgresql://neondb_owner:npg_XXXX@ep-something.us-east-1.aws.neon.tech/neondb?sslmode=require"
  },
  "notion": {
    "api_key": "",
    "dashboard_page_id": ""
  }
}
```

#### LeadGenius Client IDs (from Step 2)

```json
"leadgenius": {
  "client_ids": [
    "your-client-id-1",
    "your-client-id-2"
  ],
  "account_email": "user@acme.com"
}
```

**Verify:**
```bash
python3 scripts/status.py --client acme
```

Expected output:
```
📋 Client: acme
Product:  Acme Corp — Sales Automation Platform
LGP Clients: 2
✅ Config complete        ← All required fields are filled
⚠️  No Neon DSN configured ← If you still see this, check credentials.neon.dsn
```

---

### ☐ Step 5 — Sync Leads from LeadGenius to Neon

This pulls all leads from LeadGenius, enriches AI scores, and discovers company URLs:

```bash
python3 scripts/sync_leads.py --client acme
```

**What happens:**
1. 📋 **Schema setup** — Creates `leads`, `leads_golden`, and `companies` tables in Neon
2. 📦 **Lead import** — Fetches all leads from each client ID, enriches AI scores
3. 🌐 **URL enrichment** — Discovers company websites via Clearbit Autocomplete

**First run** can take 10-30 minutes depending on lead count.

**Verify:**
```bash
python3 scripts/status.py --client acme
```

Expected:
```
📊 Neon DB:
   Leads:     1,234 (golden: 1,100)
   Scored:    950 (77.0%)
   Companies: 456 (URLs: 420 / 92.1%)
```

---

### ☐ Step 6 — Set Up Monitoring *(optional)*

Configure Trigify to monitor LinkedIn signals for your ICP:

1. Edit `config/clients/acme.json` → `monitoring` section
2. The `trigify_search_prefix` is already set to `[acme]` by bootstrap

Trigify searches will be tagged with the client prefix to keep signals isolated.

---

### ☐ Step 7 — Done! Run the Pipeline

```bash
# Quick status check
./scripts/run.sh --client acme --status

# Full pipeline (sync + enrich + status)
./scripts/run.sh --client acme --full

# Sync leads only
./scripts/run.sh --client acme --sync

# Re-enrich AI scores without re-importing leads
./scripts/run.sh --client acme --enrich
```

---

## Daily Operations

### Incremental Sync (recommended for daily use)

Only imports new leads — much faster than a full sync:

```bash
python3 scripts/sync_leads.py --client acme --incremental
```

### Re-Score Leads

Re-check leads that haven't been AI-scored yet:

```bash
python3 scripts/sync_leads.py --client acme --enrich-only
```

### Check All Clients at a Glance

```bash
python3 scripts/status.py --all
```

Output:
```
═══════════════════════════════════════════════
  GTM Engine — Status Dashboard
═══════════════════════════════════════════════

  3 client(s) configured: acme, bigco, startup

  📋 Client: acme       ✅ Config complete   📊 1,234 leads
  📋 Client: bigco      ✅ Config complete   📊 3,456 leads
  📋 Client: startup    ⚠️  Missing: neon.dsn
```

### Run Pipeline for All Clients

```bash
# Quick check all
./scripts/run.sh --all

# Full pipeline for all
./scripts/run.sh --all --full
```

---

## Commands Reference

| Command | What It Does |
|---|---|
| `./scripts/bootstrap.sh <slug>` | Create config + data dir for a new client |
| `python3 scripts/sync_leads.py --client <slug>` | Full sync: import leads + AI scores + company URLs |
| `python3 scripts/sync_leads.py --client <slug> --incremental` | Sync only new leads (skip existing) |
| `python3 scripts/sync_leads.py --client <slug> --enrich-only` | Re-enrich AI scores only (no lead import) |
| `python3 scripts/sync_leads.py --client <slug> --workers 5` | Control thread count (default: 20 with admin key) |
| `python3 scripts/status.py --client <slug>` | Show client config + DB stats |
| `python3 scripts/status.py --all` | Show all clients |
| `./scripts/run.sh --client <slug>` | Quick status check |
| `./scripts/run.sh --client <slug> --full` | Full pipeline (sync + status) |
| `./scripts/run.sh --client <slug> --sync` | Sync leads only |
| `./scripts/run.sh --client <slug> --enrich` | Re-enrich only |
| `./scripts/run.sh --all [--full\|--sync\|--enrich]` | Batch run all clients |

---

## Architecture

```
gtm-engine/
│
├── .agents/skills/                     ← Shared AI agent skills (install once)
│   ├── leadgenius-cli/                 ✅ LGP CLI commands & API reference
│   ├── leadgenius-neon-sync/           ✅ Unified sync pipeline (the core engine)
│   ├── neon-postgres/                  ✅ Neon connection best practices
│   └── notion-api/                     ✅ Notion API integration
│
├── config/
│   ├── _template.json                  ← Master template (committed)
│   └── clients/                        ← Per-client configs (gitignored)
│       ├── acme.json
│       └── bigco.json
│
├── scripts/
│   ├── bootstrap.sh                    ← One-command client setup
│   ├── client_config.py                ← Shared config loader (all scripts import this)
│   ├── sync_leads.py                   ← Multi-client sync wrapper
│   ├── status.py                       ← Status dashboard
│   └── run.sh                          ← Universal pipeline runner
│
├── data/clients/                       ← Per-client data (gitignored)
│   ├── acme/
│   │   ├── icp.md                      ← ICP document
│   │   ├── signals.json                ← Intent signals
│   │   └── leads-export.csv            ← Exported leads
│   └── bigco/
│
├── .env                                ← Shared API keys (gitignored)
├── .env.template                       ← Template showing required vars (committed)
└── README.md                           ← This file
```

### What's Shared vs. Isolated

| Layer | Shared (one copy) | Isolated (per client) |
|---|---|---|
| **Skills** | All `.agents/skills/*` | — |
| **Scripts** | All `scripts/*.py`, `scripts/*.sh` | — |
| **LeadGenius** | — | Own API key, admin key, client IDs |
| **Database** | — | Own Neon project (separate DSN) |
| **Trigify** | Same API key | Searches tagged `[slug]` |
| **Notion** | Same or separate key | Own dashboard page |
| **Config** | `_template.json` | `config/clients/<slug>.json` |
| **Data** | — | `data/clients/<slug>/` |

---

## Config Reference

The client config file (`config/clients/<slug>.json`) has these sections:

### `_meta` — Metadata

| Field | Type | Description |
|---|---|---|
| `client_slug` | string | Unique identifier, must match filename |
| `created_at` | string | ISO date |
| `version` | string | Config schema version |

### `product` — What the Client Sells

| Field | Type | Example |
|---|---|---|
| `name` | string | `"Acme — Sales Automation"` |
| `category` | string | `"sales ops"` |
| `keywords` | array | `["CRM", "pipeline", "automation"]` |
| `problem_solved` | string | `"Manual sales processes"` |

### `icp` — Ideal Customer Profile

| Field | Type | Example |
|---|---|---|
| `target_roles` | array | `["VP Sales", "CRO", "Head RevOps"]` |
| `target_industries` | array | `["SaaS", "Fintech"]` |
| `target_geography` | array | `["United States", "France"]` |
| `target_company_size` | object | `{ "min_employees": 50, "max_employees": 500 }` |
| `disqualification` | array | `["< 20 employees", "Competitor customer"]` |

### `credentials` — API Keys & Connections

| Field | Type | Required | Source |
|---|---|---|---|
| `leadgenius.api_key` | string | **Yes** | LeadGenius Settings → API |
| `leadgenius.admin_key` | string | **Yes** | LeadGenius Settings → API |
| `neon.dsn` | string | **Yes** | Neon Console → Connection Details |
| `notion.api_key` | string | No | Notion Integrations page |
| `notion.dashboard_page_id` | string | No | Notion page URL → extract ID |

### `leadgenius` — Campaign Setup

| Field | Type | Description |
|---|---|---|
| `client_ids` | array | Campaign IDs from LeadGenius |
| `account_email` | string | Account email for reference |

### `monitoring` — Signal Sources

| Field | Type | Default |
|---|---|---|
| `trigify_search_prefix` | string | `"[slug]"` |
| `sources.google_news` | bool | `true` |
| `sources.trigify` | bool | `true` |
| `frequency` | string | `"DAILY"` |

### `scoring` — Intent Thresholds

| Field | Type | Default | Description |
|---|---|---|---|
| `high_intent_threshold` | int | `60` | Score ≥ this = hot lead |
| `medium_intent_threshold` | int | `35` | Score ≥ this = warm lead |

---

## Multi-Client Operations

### Adding a Second (Third, Fourth...) Client

The process is identical every time:

```bash
# Bootstrap
./scripts/bootstrap.sh newclient

# Edit config (fill credentials + ICP)
code config/clients/newclient.json

# Sync
python3 scripts/sync_leads.py --client newclient

# Verify
python3 scripts/status.py --all
```

### Running All Clients Daily

Set up a cron job or run manually:

```bash
# Full pipeline for all configured clients
./scripts/run.sh --all --full

# Or just incremental sync
for slug in $(ls config/clients/*.json | xargs -I{} basename {} .json | grep -v _template); do
  python3 scripts/sync_leads.py --client "$slug" --incremental
done
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `Client config not found` | Run `./scripts/bootstrap.sh <slug>` first |
| `No Neon DSN configured` | Edit `config/clients/<slug>.json` → `credentials.neon.dsn` |
| `No LeadGenius client_ids` | Find IDs via `lgp leads search -q "keyword"` → look for `client_id` |
| `Connection reset during sync` | The sync script auto-reconnects. If persistent, try `--workers 5` |
| `SSL error on Neon` | Make sure DSN ends with `?sslmode=require` |
| `lgp command not found` | Run `npm install -g leadgenius-cli` |
| `psycopg2 not found` | Run `pip install psycopg2-binary` |
| `Permission denied on bootstrap.sh` | Run `chmod +x scripts/bootstrap.sh scripts/run.sh` |
| `status.py shows 0 leads` | Run `python3 scripts/sync_leads.py --client <slug>` first |

---

## Security

- **`.env`** — Contains shared API keys → gitignored, never committed
- **`config/clients/*.json`** — Contains per-client credentials → gitignored
- **`data/clients/`** — Contains lead data and exports → gitignored
- **`_template.json`** — Safe, contains no real values → committed
- **`.env.template`** — Shows required variables, no values → committed

---

## License

Proprietary — EpsimoAI © 2026
