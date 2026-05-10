# GTM Engine

> Multi-client GTM Intelligence Stack — ICP → Discover → Scrape → Enrich → Monitor → Score → Outreach

One engine, many clients. Each client gets its own config, credentials, database, and LeadGenius account — but shares all skills, scripts, and pipeline logic.

## Quick Start: Add a New Client

```bash
# 1. Bootstrap (creates config + data dir)
./scripts/bootstrap.sh acme

# 2. Edit config with client credentials and ICP
#    → config/clients/acme.json

# 3. Sync leads from LeadGenius → Neon
python3 scripts/sync_leads.py --client acme

# 4. Check status
python3 scripts/status.py --client acme
```

## Commands

| Command | Description |
|---|---|
| `./scripts/bootstrap.sh <slug>` | Set up a new client |
| `python3 scripts/sync_leads.py --client <slug>` | Full sync (import + enrich + URLs) |
| `python3 scripts/sync_leads.py --client <slug> --incremental` | Sync new leads only |
| `python3 scripts/sync_leads.py --client <slug> --enrich-only` | Re-enrich AI scores only |
| `python3 scripts/status.py --client <slug>` | Show client status & DB stats |
| `python3 scripts/status.py --all` | Show all clients |
| `./scripts/run.sh --client <slug> --full` | Full pipeline run |
| `./scripts/run.sh --all` | Batch run all clients |

## Architecture

```
gtm-engine/
├── .agents/skills/              ← Shared skills (install once)
│   ├── leadgenius-cli/          ✅ LGP CLI commands & API
│   ├── leadgenius-neon-sync/    ✅ Unified sync pipeline
│   ├── neon-postgres/           ✅ Neon connection & best practices
│   └── notion-api/              ✅ Notion API integration
│
├── config/
│   ├── _template.json           ← Master template
│   └── clients/
│       ├── client_a.json        ← Client A (own LGP key + Neon DB)
│       └── client_b.json        ← Client B (own LGP key + Neon DB)
│
├── scripts/
│   ├── bootstrap.sh             ← One-command client setup
│   ├── client_config.py         ← Shared config loader (imported by all scripts)
│   ├── sync_leads.py            ← Multi-client sync wrapper
│   ├── status.py                ← Status dashboard
│   └── run.sh                   ← Universal pipeline runner
│
├── data/clients/                ← Per-client output
│   ├── client_a/
│   │   ├── icp.md
│   │   ├── signals.json
│   │   └── leads-export.csv
│   └── client_b/
│
├── docs/                        ← Documentation
│
├── .env                         ← Shared API keys (Trigify, etc.)
└── .env.template                ← Template for new deployments
```

## Per-Client Isolation

Each client has its **own**:
- LeadGenius API key + admin key
- Neon Postgres database (separate DSN)
- LeadGenius client/campaign IDs
- Notion dashboard page (optional)
- Config file (`config/clients/<slug>.json`)
- Data directory (`data/clients/<slug>/`)

Shared across all clients:
- Skills (agent instructions)
- Scripts (pipeline logic)
- Trigify API key (searches tagged with `[slug]` prefix)
- Notion API key (if same workspace)

## Config Reference

See `config/_template.json` for the full structure. Key sections:

| Section | Description |
|---|---|
| `credentials.leadgenius` | Client's LGP API key + admin key |
| `credentials.neon` | Client's Neon Postgres DSN |
| `credentials.notion` | Client's Notion API key + dashboard page |
| `leadgenius.client_ids` | Campaign IDs in LeadGenius |
| `product` | Client's product name, category, keywords |
| `icp` | Target roles, industries, geography, company size |
| `monitoring` | Signal sources and frequency |
| `scoring` | Intent score thresholds |

## Prerequisites

```bash
npm install -g leadgenius-cli
pip install psycopg2-binary requests
```
