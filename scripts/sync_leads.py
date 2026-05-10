#!/usr/bin/env python3
"""
GTM Engine — LeadGenius → Neon Sync (Multi-Client)

Wraps the leadgenius-neon-sync skill's unified script with
per-client config loading. Reads credentials and client IDs
from config/clients/<slug>.json.

Usage:
  python3 scripts/sync_leads.py --client acme
  python3 scripts/sync_leads.py --client acme --incremental
  python3 scripts/sync_leads.py --client acme --enrich-only
  python3 scripts/sync_leads.py --client acme --workers 10
"""

import sys
import os
import subprocess
import argparse

# Add parent dir so we can import client_config
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from client_config import init_client, get_neon_dsn, print_header, ENGINE_DIR


def main():
    parser = argparse.ArgumentParser(description="GTM Engine — Sync leads for a client")
    parser.add_argument("--client", "-c", required=True, help="Client slug")
    parser.add_argument("--incremental", action="store_true", help="Only sync new leads")
    parser.add_argument("--enrich-only", action="store_true", help="Re-enrich AI scores only")
    parser.add_argument("--workers", type=int, default=20, help="Thread pool size")
    args = parser.parse_args()

    config = init_client(args.client)
    neon_dsn = get_neon_dsn(config)
    client_ids = config.get("leadgenius", {}).get("client_ids", [])

    if not neon_dsn:
        print(f"❌ No Neon DSN configured for client '{args.client}'")
        print(f"   Edit config/clients/{args.client}.json → credentials.neon.dsn")
        sys.exit(1)

    print_header("LeadGenius → Neon Sync", config)

    # Build the command for the unified sync script
    sync_script = os.path.join(
        ENGINE_DIR, ".agents", "skills", "leadgenius-neon-sync",
        "scripts", "sync_leadgenius_to_neon.py"
    )

    if not os.path.exists(sync_script):
        print(f"❌ Sync script not found: {sync_script}")
        print("   Install the skill: npx skills add https://github.com/Epsimo/skills --skill leadgenius-neon-sync")
        sys.exit(1)

    cmd = [
        sys.executable, sync_script,
        "--neon-dsn", neon_dsn,
        "--workers", str(args.workers),
    ]

    if args.enrich_only:
        cmd.append("--enrich-only")
    elif client_ids:
        cmd.extend(["--clients", ",".join(client_ids)])
    else:
        print(f"⚠️  No LeadGenius client_ids configured for '{args.client}'")
        print(f"   Edit config/clients/{args.client}.json → leadgenius.client_ids")
        sys.exit(1)

    if args.incremental:
        cmd.append("--incremental")

    print(f"  Running: {' '.join(cmd[:4])}...")
    print()

    # Run it — inherit our env (which has LGP_API_KEY and LEADGENIUS_ADMIN_KEY set)
    result = subprocess.run(cmd, env=os.environ)
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
