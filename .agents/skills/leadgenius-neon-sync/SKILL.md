---
name: leadgenius-neon-sync
description: Synchronize B2B leads and company data from LeadGenius Pro into a Neon Serverless Postgres database. Creates tables, imports leads, enriches AI scores (with smart JSON parsing for inconsistent formats), and discovers company URLs via Clearbit. Use when the user mentions "sync leads to Neon", "populate database", "import leads to Postgres", "enrich leads database", "sync LeadGenius to Neon", "create customer database", "update leads in Neon", "refresh lead scores", "sync new leads", "LeadGenius to database", "neon sync", or wants to build a sales-ready database from their LeadGenius lead pool. Also use when the user wants to set up a new customer database for a new client.
---

# LeadGenius → Neon Sync

Synchronize leads and company data from the LeadGenius Pro platform into a Neon Serverless Postgres database in a single automated pass. Handles initial setup, full imports, incremental syncs, and AI score enrichment.

## Prerequisites

Before running, ensure these are configured in the project `.env` file:

```
leadgenius_api=<LeadGenius API key>
leadgenius_admin_key=<LeadGenius Admin key — enables rate-limit bypass>
neon_api=<Neon API key — for database provisioning>
```

The `lgp` CLI must be installed and available on PATH. Verify with `lgp --version`.

Python dependencies: `psycopg2-binary`, `requests` (for Clearbit URL discovery).

## Architecture Overview

The sync pipeline has 3 phases, all handled by a single script (`sync_leadgenius_to_neon.py`):

```
Phase 1: SCHEMA SETUP
  └─ Create leads, leads_golden, companies tables if they don't exist

Phase 2: LEAD IMPORT + AI SCORE ENRICHMENT
  └─ For each client_id:
     ├─ Paginate through all leads via `lgp leads list`
     ├─ For each lead, fetch deep metadata via `lgp leads get <id>`
     ├─ Parse aiLeadScore JSON (with smart fallbacks)
     ├─ UPSERT into leads table
     └─ UPSERT into leads_golden table

Phase 3: COMPANY URL ENRICHMENT
  └─ For companies still missing website_url:
     ├─ Extract from lead deep metadata (companyUrl / companyDomain)
     └─ Fallback to Clearbit Autocomplete API for remaining gaps
```

## How to Run

### Full sync (new database or full refresh)

```bash
python3 scripts/sync_leadgenius_to_neon.py \
  --neon-dsn "postgresql://user:pass@host/db?sslmode=require" \
  --clients "client-id-1,client-id-2"
```

### Incremental sync (new leads only)

```bash
python3 scripts/sync_leadgenius_to_neon.py \
  --neon-dsn "postgresql://user:pass@host/db?sslmode=require" \
  --clients "client-id-1" \
  --incremental
```

### Re-enrich AI scores only (no new lead import)

```bash
python3 scripts/sync_leadgenius_to_neon.py \
  --neon-dsn "postgresql://user:pass@host/db?sslmode=require" \
  --enrich-only
```

## Critical Implementation Details

These are hard-won lessons from processing 8,700+ leads. Follow them exactly.

### AI Score JSON Parsing

The `aiLeadScore` field from LeadGenius is wildly inconsistent. The parsing must handle ALL of these formats:

1. **Standard JSON object** — `{"score": 65, "justification": "...", "recommendation": "..."}`
2. **French spelling variant** — `{"score": 65, "justification": "...", "recommandation": "..."}` (note: recommandation, not recommendation)
3. **Raw integer string** — `"65"` (no JSON structure at all, just the number as a string)
4. **Formatted string** — `"65/100"` or `"65%"` (number embedded in text)
5. **Pure integer** — `65` (parsed by json.loads as int, not dict)
6. **Null** — the field is missing entirely

The parsing waterfall:

```python
ai_lead_score_str = detail.get("aiLeadScore")
if ai_lead_score_str:
    try:
        score_data = json.loads(ai_lead_score_str)
        if isinstance(score_data, dict):
            # Standard JSON — extract all 3 fields
            score_val = int(score_data.get("score", 0))
            score_just = score_data.get("justification")
            score_rec = score_data.get("recommendation") or score_data.get("recommandation")
        elif isinstance(score_data, int):
            # Pure integer parsed by json.loads
            score_val = score_data
    except json.JSONDecodeError:
        # Raw string like "65" or "65/100" — regex extract
        match = re.search(r'\d+', str(ai_lead_score_str))
        if match:
            score_val = int(match.group())

# Fallback to separate API fields
if score_val is None:
    raw = detail.get("aiScoreValue")
    if raw is not None:
        match = re.search(r'\d+', str(raw))
        if match:
            score_val = int(match.group())

if not score_just:
    score_just = detail.get("aiScoreJustification")

if not score_rec:
    score_rec = detail.get("aiNextAction")
```

### Company URL Discovery

Company URLs come from two sources:

1. **LeadGenius API** — `companyUrl` or `companyDomain` fields on the lead detail. These are extracted during the lead import phase.
2. **Clearbit Autocomplete API** (free, no key needed) — For companies still missing URLs after the API pass. Query: `https://autocomplete.clearbit.com/v1/companies/suggest?query={company_name}`. Take the first result's `domain` field.

### Neon Serverless Connection Resilience

Neon aggressively drops idle connections (serverless cold starts). Every DB write must be wrapped in reconnection logic:

```python
def execute_with_reconnect(sql, params):
    try:
        cur.execute(sql, params)
    except (psycopg2.InterfaceError, psycopg2.OperationalError):
        conn = psycopg2.connect(NEON_DSN)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(sql, params)
```

### Concurrency

Use `concurrent.futures.ThreadPoolExecutor` with 20 workers for the API calls (which are I/O bound). The admin key (`LEADGENIUS_ADMIN_KEY`) bypasses LeadGenius rate limits. Without it, reduce workers to 2-3.

DB writes should use a `threading.Lock` or be handled sequentially from the main thread to avoid connection pool issues with psycopg2 in multi-threaded contexts.

## Database Schema

### `leads` table

```sql
CREATE TABLE IF NOT EXISTS leads (
    id                      UUID PRIMARY KEY,
    first_name              TEXT,
    last_name               TEXT,
    full_name               TEXT,
    email                   TEXT,
    linkedin_url            TEXT,
    company_name            TEXT,
    company_url             TEXT,
    title                   TEXT,
    status                  TEXT,
    client_id               TEXT,
    company_id              TEXT,
    engagement_history      JSONB,
    last_engagement_at      TIMESTAMP,
    engagement_score        INTEGER,
    created_at              TIMESTAMP,
    updated_at              TIMESTAMP,
    ai_score_value          INTEGER,
    ai_score_justification  TEXT,
    ai_score_recommendation TEXT,
    ai_score_checked        BOOLEAN DEFAULT FALSE
);
```

### `leads_golden` table

Same schema as `leads` (minus `ai_score_checked`). This is a curated copy for downstream analytics. Both tables are updated simultaneously during sync.

### `companies` table

```sql
CREATE TABLE IF NOT EXISTS companies (
    company_name         TEXT PRIMARY KEY,
    lead_count           BIGINT,
    website_url          TEXT,
    avg_engagement_score NUMERIC,
    last_activity_at     TIMESTAMP
);
```

## Field Mapping: LeadGenius API → Neon

| LeadGenius API Field | Neon Column | Notes |
|---|---|---|
| `id` | `id` | UUID, primary key |
| `firstName` | `first_name` | |
| `lastName` | `last_name` | |
| `fullName` | `full_name` | |
| `email` | `email` | |
| `linkedinUrl` | `linkedin_url` | |
| `companyName` | `company_name` | |
| `companyUrl` | `company_url` | Lead-level company URL |
| `title` | `title` | Job title |
| `status` | `status` | |
| `client_id` | `client_id` | |
| `company_id` | `company_id` | |
| `createdAt` | `created_at` | |
| `updatedAt` | `updated_at` | |
| `aiLeadScore` (JSON) | `ai_score_value` | Parsed via waterfall logic above |
| `aiLeadScore` (JSON) | `ai_score_justification` | May be null if AI didn't generate one |
| `aiLeadScore` (JSON) | `ai_score_recommendation` | Check both "recommendation" and "recommandation" keys |
| `aiScoreJustification` | `ai_score_justification` | Fallback if not in aiLeadScore JSON |
| `aiNextAction` | `ai_score_recommendation` | Fallback if not in aiLeadScore JSON |

## Creating a New Customer Database

To set up a brand new Neon database for a different customer:

1. Create a new Neon project/database via the Neon console or API
2. Get the connection string (DSN)
3. Run the sync script with the new DSN and the relevant client IDs:

```bash
python3 scripts/sync_leadgenius_to_neon.py \
  --neon-dsn "postgresql://user:pass@new-host/new-db?sslmode=require" \
  --clients "new-client-id"
```

The script auto-creates all tables on first run. No manual SQL needed.

## Troubleshooting

| Problem | Solution |
|---|---|
| `Connection reset` during long runs | The reconnection wrapper handles this automatically. If it persists, reduce `max_workers` to 5. |
| Missing `ai_score_justification` | Many leads genuinely have no justification from the AI — they only got a raw number score. This is expected. |
| `ai_score_recommendation` empty | Check if the API used the French key `recommandation` — the parser handles both spellings. |
| DuckDuckGo/Google search blocked | Use the Clearbit Autocomplete API instead — it's free, fast, and doesn't block IPs. |
| `psycopg2.OperationalError: SSL` | Always use `?sslmode=require` in the Neon DSN. Neon drops non-SSL connections. |
