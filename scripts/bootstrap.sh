#!/bin/bash
# ═══════════════════════════════════════════════════════════
# GTM Engine — Bootstrap a New Client
#
# Creates config, data directory, Neon schema, and runbook
# for a new client in one command.
#
# Usage:
#   ./scripts/bootstrap.sh <client_slug>
#   ./scripts/bootstrap.sh acme
#
# Prerequisites:
#   - pip install psycopg2-binary
#   - npm install -g leadgenius-cli
# ═══════════════════════════════════════════════════════════

set -euo pipefail

CLIENT_SLUG="${1:?Usage: bootstrap.sh <client_slug>}"
ENGINE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "═══════════════════════════════════════════════════════════"
echo "  GTM Engine — Bootstrap Client: ${CLIENT_SLUG}"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── Step 1: Create config from template ─────────────────────
CONFIG_DIR="${ENGINE_DIR}/config/clients"
CONFIG_FILE="${CONFIG_DIR}/${CLIENT_SLUG}.json"

if [ -f "$CONFIG_FILE" ]; then
    echo "  ⚠️  Config already exists: ${CONFIG_FILE}"
    echo "     Skipping config creation."
else
    mkdir -p "$CONFIG_DIR"
    sed "s/CLIENT_SLUG/${CLIENT_SLUG}/g" "${ENGINE_DIR}/config/_template.json" > "$CONFIG_FILE"
    echo "  ✅ Created config: ${CONFIG_FILE}"
fi

# ── Step 2: Create data directory ────────────────────────────
DATA_DIR="${ENGINE_DIR}/data/clients/${CLIENT_SLUG}"
mkdir -p "$DATA_DIR"
echo "  ✅ Created data dir: ${DATA_DIR}"

# ── Step 3: Summary & next steps ────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ Client \"${CLIENT_SLUG}\" bootstrapped!"
echo ""
echo "  Next steps:"
echo ""
echo "  1. EDIT CONFIG with client credentials and ICP:"
echo "     ${CONFIG_FILE}"
echo ""
echo "     Required fields:"
echo "       • credentials.leadgenius.api_key   — Client's LGP key"
echo "       • credentials.leadgenius.admin_key  — Client's admin key"
echo "       • credentials.neon.dsn             — Client's Neon DSN"
echo "       • leadgenius.client_ids            — Campaign IDs in LGP"
echo "       • product.name                     — Client's product"
echo "       • icp.target_roles                 — Job titles to target"
echo ""
echo "  2. SYNC LEADS from LeadGenius to Neon:"
echo "     python3 scripts/sync_leads.py --client ${CLIENT_SLUG}"
echo ""
echo "  3. CHECK STATUS:"
echo "     python3 scripts/status.py --client ${CLIENT_SLUG}"
echo ""
echo "  4. RUN PIPELINE:"
echo "     ./scripts/run.sh --client ${CLIENT_SLUG}"
echo "     ./scripts/run.sh --client ${CLIENT_SLUG} --full"
echo ""
echo "═══════════════════════════════════════════════════════════"
