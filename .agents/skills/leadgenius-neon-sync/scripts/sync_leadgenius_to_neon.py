#!/usr/bin/env python3
"""
LeadGenius → Neon Sync: Single-pass pipeline.
Imports leads, enriches AI scores, and discovers company URLs.

Usage:
  # Full sync
  python3 sync_leadgenius_to_neon.py --neon-dsn "postgresql://..." --clients "id1,id2"

  # Incremental (new leads only)
  python3 sync_leadgenius_to_neon.py --neon-dsn "postgresql://..." --clients "id1" --incremental

  # Re-enrich AI scores only
  python3 sync_leadgenius_to_neon.py --neon-dsn "postgresql://..." --enrich-only
"""

import subprocess, json, sys, os, re, time, argparse, threading
import concurrent.futures
import psycopg2
import requests

# ---------------------------------------------------------------------------
# .env loader
# ---------------------------------------------------------------------------
def load_env():
    for envpath in [".env", os.path.join(os.path.dirname(__file__), "..", ".env")]:
        if os.path.exists(envpath):
            with open(envpath) as f:
                for line in f:
                    if line.strip() and not line.startswith("#") and "=" in line:
                        k, v = line.strip().split("=", 1)
                        os.environ[k.upper()] = v

# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------
class NeonDB:
    def __init__(self, dsn):
        self.dsn = dsn
        self.conn = psycopg2.connect(dsn)
        self.conn.autocommit = True
        self.cur = self.conn.cursor()
        self.lock = threading.Lock()

    def execute(self, sql, params=None):
        with self.lock:
            try:
                self.cur.execute(sql, params)
                return self.cur
            except (psycopg2.InterfaceError, psycopg2.OperationalError) as e:
                print(f"   [!] Reconnecting... ({e})")
                try: self.conn.close()
                except: pass
                self.conn = psycopg2.connect(self.dsn)
                self.conn.autocommit = True
                self.cur = self.conn.cursor()
                self.cur.execute(sql, params)
                return self.cur

    def fetchall(self, sql, params=None):
        self.execute(sql, params)
        return self.cur.fetchall()

    def close(self):
        try: self.cur.close()
        except: pass
        try: self.conn.close()
        except: pass

# ---------------------------------------------------------------------------
# Schema setup
# ---------------------------------------------------------------------------
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY,
    first_name TEXT, last_name TEXT, full_name TEXT,
    email TEXT, linkedin_url TEXT,
    company_name TEXT, company_url TEXT, title TEXT, status TEXT,
    client_id TEXT, company_id TEXT,
    engagement_history JSONB, last_engagement_at TIMESTAMP,
    engagement_score INTEGER,
    created_at TIMESTAMP, updated_at TIMESTAMP,
    ai_score_value INTEGER, ai_score_justification TEXT,
    ai_score_recommendation TEXT, ai_score_checked BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS leads_golden (
    id UUID PRIMARY KEY,
    first_name TEXT, last_name TEXT, full_name TEXT,
    email TEXT, linkedin_url TEXT,
    company_name TEXT, company_url TEXT, title TEXT, status TEXT,
    client_id TEXT, company_id TEXT,
    engagement_history JSONB, last_engagement_at TIMESTAMP,
    engagement_score INTEGER,
    created_at TIMESTAMP, updated_at TIMESTAMP,
    ai_score_value INTEGER, ai_score_justification TEXT,
    ai_score_recommendation TEXT
);

CREATE TABLE IF NOT EXISTS companies (
    company_name TEXT PRIMARY KEY,
    lead_count BIGINT, website_url TEXT,
    avg_engagement_score NUMERIC, last_activity_at TIMESTAMP
);
"""

# ---------------------------------------------------------------------------
# LeadGenius API helpers
# ---------------------------------------------------------------------------
def lgp_leads_list(client_id, limit=1000):
    leads, token = [], None
    while True:
        cmd = ["lgp", "leads", "list", "-c", client_id, "--limit", str(limit),
               "--fields", "id,firstName,lastName,fullName,email,linkedinUrl,companyName,title,status,company_id,createdAt,updatedAt",
               "--format", "json"]
        if token: cmd.extend(["-t", token])
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0: break
        try:
            data = json.loads(res.stdout)
            leads.extend(data.get("data", []))
            token = data.get("nextToken")
            if not token: break
        except json.JSONDecodeError: break
    return leads

def lgp_lead_get(lead_id):
    res = subprocess.run(["lgp", "leads", "get", lead_id, "--format", "json"],
                         capture_output=True, text=True)
    if res.returncode == 0:
        try: return json.loads(res.stdout).get("data", {})
        except json.JSONDecodeError: pass
    return {}

# ---------------------------------------------------------------------------
# AI Score parsing — handles all known inconsistencies
# ---------------------------------------------------------------------------
def parse_ai_score(detail):
    score_val, score_just, score_rec = None, None, None
    raw = detail.get("aiLeadScore")
    if raw:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                sv = parsed.get("score")
                if sv is not None:
                    try: score_val = int(sv)
                    except ValueError:
                        m = re.search(r"\d+", str(sv))
                        if m: score_val = int(m.group())
                score_just = parsed.get("justification")
                score_rec = parsed.get("recommendation") or parsed.get("recommandation")
            elif isinstance(parsed, int):
                score_val = parsed
        except json.JSONDecodeError:
            m = re.search(r"\d+", str(raw))
            if m: score_val = int(m.group())

    if score_val is None:
        sv = detail.get("aiScoreValue")
        if sv is not None:
            m = re.search(r"\d+", str(sv))
            if m: score_val = int(m.group())
    if not score_just:
        score_just = detail.get("aiScoreJustification")
    if not score_rec:
        score_rec = detail.get("aiNextAction")
    return score_val, score_just, score_rec

# ---------------------------------------------------------------------------
# Clearbit URL lookup
# ---------------------------------------------------------------------------
def clearbit_lookup(company_name):
    try:
        r = requests.get(f"https://autocomplete.clearbit.com/v1/companies/suggest?query={requests.utils.quote(company_name)}", timeout=5)
        if r.status_code == 200:
            data = r.json()
            if isinstance(data, list) and data:
                domain = data[0].get("domain")
                if domain: return f"https://www.{domain}"
    except: pass
    return None

# ---------------------------------------------------------------------------
# Phase 2: Import leads + enrich AI scores
# ---------------------------------------------------------------------------
def process_lead(lead, client_id):
    lid = lead["id"]
    detail = lgp_lead_get(lid)
    score_val, score_just, score_rec = parse_ai_score(detail)
    company_url = detail.get("companyUrl") or detail.get("companyDomain")
    return {
        "id": lid,
        "first_name": lead.get("firstName"), "last_name": lead.get("lastName"),
        "full_name": lead.get("fullName"), "email": lead.get("email"),
        "linkedin_url": lead.get("linkedinUrl"),
        "company_name": lead.get("companyName") or detail.get("companyName"),
        "company_url": company_url, "title": lead.get("title"),
        "status": lead.get("status"), "client_id": client_id,
        "company_id": lead.get("company_id"),
        "created_at": lead.get("createdAt"), "updated_at": lead.get("updatedAt"),
        "ai_score_value": score_val, "ai_score_justification": score_just,
        "ai_score_recommendation": score_rec,
    }

UPSERT_LEAD = """
INSERT INTO leads (id, first_name, last_name, full_name, email, linkedin_url,
    company_name, company_url, title, status, client_id, company_id,
    created_at, updated_at, ai_score_value, ai_score_justification,
    ai_score_recommendation, ai_score_checked)
VALUES (%(id)s, %(first_name)s, %(last_name)s, %(full_name)s, %(email)s,
    %(linkedin_url)s, %(company_name)s, %(company_url)s, %(title)s,
    %(status)s, %(client_id)s, %(company_id)s, %(created_at)s, %(updated_at)s,
    %(ai_score_value)s, %(ai_score_justification)s, %(ai_score_recommendation)s, TRUE)
ON CONFLICT (id) DO UPDATE SET
    full_name=EXCLUDED.full_name, email=EXCLUDED.email, linkedin_url=EXCLUDED.linkedin_url,
    company_name=EXCLUDED.company_name, company_url=COALESCE(EXCLUDED.company_url, leads.company_url),
    title=EXCLUDED.title, status=EXCLUDED.status, updated_at=EXCLUDED.updated_at,
    ai_score_value=COALESCE(EXCLUDED.ai_score_value, leads.ai_score_value),
    ai_score_justification=COALESCE(EXCLUDED.ai_score_justification, leads.ai_score_justification),
    ai_score_recommendation=COALESCE(EXCLUDED.ai_score_recommendation, leads.ai_score_recommendation),
    ai_score_checked=TRUE;
"""

UPSERT_GOLDEN = """
INSERT INTO leads_golden (id, first_name, last_name, full_name, email, linkedin_url,
    company_name, company_url, title, status, client_id, company_id,
    created_at, updated_at, ai_score_value, ai_score_justification, ai_score_recommendation)
VALUES (%(id)s, %(first_name)s, %(last_name)s, %(full_name)s, %(email)s,
    %(linkedin_url)s, %(company_name)s, %(company_url)s, %(title)s,
    %(status)s, %(client_id)s, %(company_id)s, %(created_at)s, %(updated_at)s,
    %(ai_score_value)s, %(ai_score_justification)s, %(ai_score_recommendation)s)
ON CONFLICT (id) DO UPDATE SET
    full_name=EXCLUDED.full_name, email=EXCLUDED.email, linkedin_url=EXCLUDED.linkedin_url,
    company_name=EXCLUDED.company_name, company_url=COALESCE(EXCLUDED.company_url, leads_golden.company_url),
    title=EXCLUDED.title, status=EXCLUDED.status, updated_at=EXCLUDED.updated_at,
    ai_score_value=COALESCE(EXCLUDED.ai_score_value, leads_golden.ai_score_value),
    ai_score_justification=COALESCE(EXCLUDED.ai_score_justification, leads_golden.ai_score_justification),
    ai_score_recommendation=COALESCE(EXCLUDED.ai_score_recommendation, leads_golden.ai_score_recommendation);
"""

UPSERT_COMPANY = """
INSERT INTO companies (company_name, lead_count, website_url)
VALUES (%s, 1, %s)
ON CONFLICT (company_name) DO UPDATE SET
    lead_count = companies.lead_count + 1,
    website_url = COALESCE(EXCLUDED.website_url, companies.website_url);
"""

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    load_env()
    parser = argparse.ArgumentParser(description="LeadGenius → Neon Sync")
    parser.add_argument("--neon-dsn", required=True, help="Neon Postgres connection string")
    parser.add_argument("--clients", help="Comma-separated client IDs")
    parser.add_argument("--incremental", action="store_true", help="Only sync leads not yet in DB")
    parser.add_argument("--enrich-only", action="store_true", help="Re-enrich AI scores, skip import")
    parser.add_argument("--workers", type=int, default=20, help="Thread pool size (default: 20)")
    args = parser.parse_args()

    admin = "LEADGENIUS_ADMIN_KEY" in os.environ
    workers = args.workers if admin else min(args.workers, 3)

    print("=" * 70)
    print("  LeadGenius → Neon: Full Sync Pipeline")
    if admin: print("  ⚡ Admin Key: Rate-limit bypass enabled")
    print(f"  🧵 Workers: {workers}")
    print("=" * 70)

    db = NeonDB(args.neon_dsn)

    # Phase 1: Schema
    print("\n📋 Phase 1: Schema setup...")
    for stmt in SCHEMA_SQL.strip().split(";"):
        stmt = stmt.strip()
        if stmt: db.execute(stmt + ";")
    print("   ✅ Tables ready.\n")

    # Phase 2: Lead import + AI enrichment
    if not args.enrich_only:
        client_ids = [c.strip() for c in args.clients.split(",")] if args.clients else []
        if not client_ids:
            print("   ⚠️  No --clients specified. Use --enrich-only for score-only refresh.")
            db.close(); return

        existing_ids = set()
        if args.incremental:
            rows = db.fetchall("SELECT id FROM leads")
            existing_ids = {str(r[0]) for r in rows}
            print(f"   📦 Incremental mode: {len(existing_ids)} existing leads will be skipped.\n")

        total_imported, total_scores = 0, 0

        for cid in client_ids:
            print(f"📦 Client: {cid}")
            leads = lgp_leads_list(cid)
            if args.incremental:
                leads = [l for l in leads if l["id"] not in existing_ids]
            print(f"   Leads to process: {len(leads)}")
            sys.stdout.flush()

            completed = 0
            with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
                futures = {ex.submit(process_lead, l, cid): l for l in leads}
                for fut in concurrent.futures.as_completed(futures):
                    row = fut.result()
                    completed += 1
                    total_imported += 1
                    db.execute(UPSERT_LEAD, row)
                    db.execute(UPSERT_GOLDEN, row)
                    if row["company_name"]:
                        db.execute(UPSERT_COMPANY, (row["company_name"], row["company_url"]))
                    if row["ai_score_value"] is not None:
                        total_scores += 1
                        print(f"   ⚡ 💾 [{completed}/{len(leads)}] {row['full_name']} ({row['company_name']}) → Score: {row['ai_score_value']}")
                    elif completed % 50 == 0:
                        print(f"   ⏳ [{completed}/{len(leads)}] processed...")
                    sys.stdout.flush()
            print()

        print(f"   📊 Imported: {total_imported} | Scores found: {total_scores}\n")
    else:
        # Enrich-only: re-process unchecked leads
        print("📋 Phase 2: AI Score re-enrichment...")
        rows = db.fetchall("SELECT id, full_name, company_name FROM leads WHERE ai_score_checked = FALSE OR ai_score_checked IS NULL")
        total = len(rows)
        print(f"   {total} leads to re-check.\n")
        completed, found = 0, 0
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
            def _enrich(r):
                detail = lgp_lead_get(str(r[0]))
                sv, sj, sr = parse_ai_score(detail)
                return r[0], r[1], r[2], sv, sj, sr
            futures = {ex.submit(_enrich, r): r for r in rows}
            for fut in concurrent.futures.as_completed(futures):
                lid, fn, cn, sv, sj, sr = fut.result()
                completed += 1
                db.execute("UPDATE leads SET ai_score_value=%s, ai_score_justification=%s, ai_score_recommendation=%s, ai_score_checked=TRUE WHERE id=%s", (sv, sj, sr, lid))
                db.execute("UPDATE leads_golden SET ai_score_value=%s, ai_score_justification=%s, ai_score_recommendation=%s WHERE id=%s", (sv, sj, sr, lid))
                if sv is not None:
                    found += 1
                    print(f"   ⚡ [{completed}/{total}] {fn} ({cn}) → {sv}")
                elif completed % 100 == 0:
                    print(f"   ⏳ [{completed}/{total}]...")
                sys.stdout.flush()
        print(f"\n   📊 Checked: {total} | Scores found: {found}\n")

    # Phase 3: Company URL enrichment via Clearbit
    print("🌐 Phase 3: Company URL enrichment (Clearbit)...")
    missing = db.fetchall("SELECT company_name FROM companies WHERE website_url IS NULL OR website_url = ''")
    print(f"   {len(missing)} companies missing URLs.")
    updated = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        futs = {ex.submit(clearbit_lookup, r[0]): r[0] for r in missing}
        for fut in concurrent.futures.as_completed(futs):
            name = futs[fut]
            url = fut.result()
            if url:
                db.execute("UPDATE companies SET website_url=%s WHERE company_name=%s AND (website_url IS NULL OR website_url='')", (url, name))
                updated += 1
                print(f"   ✅ {name} → {url}")
            sys.stdout.flush()
    print(f"   📊 URLs discovered: {updated}\n")

    # Summary
    leads_total = db.fetchall("SELECT COUNT(*) FROM leads")[0][0]
    scores_total = db.fetchall("SELECT COUNT(*) FROM leads WHERE ai_score_value IS NOT NULL")[0][0]
    companies_total = db.fetchall("SELECT COUNT(*) FROM companies")[0][0]
    urls_total = db.fetchall("SELECT COUNT(*) FROM companies WHERE website_url IS NOT NULL AND website_url != ''")[0][0]

    print("=" * 70)
    print("  ✅ SYNC COMPLETE")
    print(f"     Leads:      {leads_total}")
    print(f"     AI Scores:  {scores_total}")
    print(f"     Companies:  {companies_total}")
    print(f"     With URLs:  {urls_total}")
    print("=" * 70)
    db.close()

if __name__ == "__main__":
    main()
