#!/bin/bash
# ═══════════════════════════════════════════════════════════
# GTM Engine — Universal Runner
#
# Run the full pipeline for one or all clients.
#
# Usage:
#   ./scripts/run.sh --client acme              # Quick (free sources)
#   ./scripts/run.sh --client acme --full       # Full pipeline
#   ./scripts/run.sh --client acme --sync       # Sync leads only
#   ./scripts/run.sh --client acme --status     # Check status
#   ./scripts/run.sh --all                       # All clients, quick
#   ./scripts/run.sh --all --full                # All clients, full
# ═══════════════════════════════════════════════════════════

set -euo pipefail

ENGINE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_DIR="${ENGINE_DIR}/config/clients"

CLIENT=""
MODE="quick"
ALL_CLIENTS=false

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --client|-c) CLIENT="$2"; shift 2 ;;
        --all)       ALL_CLIENTS=true; shift ;;
        --full)      MODE="full"; shift ;;
        --sync)      MODE="sync"; shift ;;
        --enrich)    MODE="enrich"; shift ;;
        --status)    MODE="status"; shift ;;
        *)           echo "Unknown option: $1"; exit 1 ;;
    esac
done

run_client() {
    local slug="$1"
    local mode="$2"

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  🚀 Client: ${slug} | Mode: ${mode}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    case "$mode" in
        status)
            python3 "${ENGINE_DIR}/scripts/status.py" --client "$slug"
            ;;
        sync)
            python3 "${ENGINE_DIR}/scripts/sync_leads.py" --client "$slug"
            ;;
        enrich)
            python3 "${ENGINE_DIR}/scripts/sync_leads.py" --client "$slug" --enrich-only
            ;;
        full)
            python3 "${ENGINE_DIR}/scripts/sync_leads.py" --client "$slug"
            python3 "${ENGINE_DIR}/scripts/status.py" --client "$slug"
            ;;
        quick)
            python3 "${ENGINE_DIR}/scripts/status.py" --client "$slug"
            ;;
    esac
}

if [ "$ALL_CLIENTS" = true ]; then
    echo "═══════════════════════════════════════════════════════════"
    echo "  GTM Engine — Batch Run (mode: ${MODE})"
    echo "═══════════════════════════════════════════════════════════"

    for config_file in "${CONFIG_DIR}"/*.json; do
        [ "$(basename "$config_file")" = "_template.json" ] && continue
        slug=$(basename "$config_file" .json)
        run_client "$slug" "$MODE"
    done

    echo ""
    echo "  ✅ All clients processed."
elif [ -n "$CLIENT" ]; then
    run_client "$CLIENT" "$MODE"
else
    echo "Usage: ./scripts/run.sh --client <slug> [--full|--sync|--enrich|--status]"
    echo "       ./scripts/run.sh --all [--full|--sync|--enrich|--status]"
    exit 1
fi
