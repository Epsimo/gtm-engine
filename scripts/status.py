#!/usr/bin/env python3
"""
GTM Engine — Status Dashboard

Quick status check for one or all clients:
  - LeadGenius lead counts
  - Neon DB stats (leads, scores, companies)
  - Config completeness

Usage:
  python3 scripts/status.py --client acme
  python3 scripts/status.py --all
"""

import sys
import os
import json
import subprocess
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from client_config import init_client, load_client_config, list_clients, get_neon_dsn, load_shared_env

try:
    import psycopg2
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False


def check_config_completeness(config):
    """Return a list of missing required fields."""
    missing = []
    creds = config.get("credentials", {})
    if not creds.get("leadgenius", {}).get("api_key"):
        missing.append("credentials.leadgenius.api_key")
    if not creds.get("neon", {}).get("dsn"):
        missing.append("credentials.neon.dsn")
    if not config.get("leadgenius", {}).get("client_ids"):
        missing.append("leadgenius.client_ids")
    if not config.get("product", {}).get("name"):
        missing.append("product.name")
    if not config.get("icp", {}).get("target_roles"):
        missing.append("icp.target_roles")
    return missing


def get_neon_stats(dsn):
    """Query Neon for lead/company/score counts."""
    if not HAS_PSYCOPG2 or not dsn:
        return None
    try:
        conn = psycopg2.connect(dsn)
        cur = conn.cursor()
        stats = {}
        cur.execute("SELECT COUNT(*) FROM leads")
        stats["leads"] = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM leads_golden")
        stats["leads_golden"] = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM leads WHERE ai_score_value IS NOT NULL")
        stats["scored"] = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM companies")
        stats["companies"] = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM companies WHERE website_url IS NOT NULL AND website_url != ''")
        stats["companies_with_url"] = cur.fetchone()[0]
        cur.close()
        conn.close()
        return stats
    except Exception as e:
        return {"error": str(e)}


def show_client_status(slug):
    """Print status for a single client."""
    config = init_client(slug)
    product = config.get("product", {}).get("name", "—")
    email = config.get("leadgenius", {}).get("account_email", "—")
    client_ids = config.get("leadgenius", {}).get("client_ids", [])

    print(f"\n{'─' * 60}")
    print(f"  📋 Client: {slug}")
    print(f"  Product:  {product}")
    print(f"  LGP Account: {email}")
    print(f"  LGP Clients: {len(client_ids)}")
    print(f"{'─' * 60}")

    # Config completeness
    missing = check_config_completeness(config)
    if missing:
        print(f"  ⚠️  Missing config: {', '.join(missing)}")
    else:
        print(f"  ✅ Config complete")

    # Neon stats
    dsn = get_neon_dsn(config)
    if dsn:
        stats = get_neon_stats(dsn)
        if stats and "error" not in stats:
            score_pct = round(stats["scored"] / stats["leads"] * 100, 1) if stats["leads"] > 0 else 0
            url_pct = round(stats["companies_with_url"] / stats["companies"] * 100, 1) if stats["companies"] > 0 else 0
            print(f"  📊 Neon DB:")
            print(f"     Leads:     {stats['leads']:,} (golden: {stats['leads_golden']:,})")
            print(f"     Scored:    {stats['scored']:,} ({score_pct}%)")
            print(f"     Companies: {stats['companies']:,} (URLs: {stats['companies_with_url']:,} / {url_pct}%)")
        elif stats:
            print(f"  ❌ Neon error: {stats['error']}")
    else:
        print(f"  ⚠️  No Neon DSN configured")

    print()


def main():
    parser = argparse.ArgumentParser(description="GTM Engine — Client Status")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--client", "-c", help="Client slug")
    group.add_argument("--all", action="store_true", help="Show all clients")
    args = parser.parse_args()

    load_shared_env()

    print("=" * 60)
    print("  GTM Engine — Status Dashboard")
    print("=" * 60)

    if args.all:
        clients = list_clients()
        if not clients:
            print("\n  No clients configured. Run: ./scripts/bootstrap.sh <slug>")
        else:
            print(f"\n  {len(clients)} client(s) configured: {', '.join(clients)}")
            for slug in clients:
                show_client_status(slug)
    else:
        show_client_status(args.client)

    print("=" * 60)


if __name__ == "__main__":
    main()
