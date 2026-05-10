#!/usr/bin/env python3
"""
GTM Engine — Client Config Loader

Shared utility for all scripts to load per-client configuration
and initialize connections (LGP, Neon) from the client JSON file.
"""

import os
import json
import argparse
import subprocess


ENGINE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_DIR = os.path.join(ENGINE_DIR, "config", "clients")
DATA_DIR = os.path.join(ENGINE_DIR, "data", "clients")


def load_shared_env():
    """Load shared .env file from engine root."""
    env_path = os.path.join(ENGINE_DIR, ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.strip() and not line.startswith("#") and "=" in line:
                    k, v = line.strip().split("=", 1)
                    os.environ[k.upper()] = v


def load_client_config(client_slug):
    """Load a client's JSON config file."""
    config_path = os.path.join(CONFIG_DIR, f"{client_slug}.json")
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Client config not found: {config_path}")
    with open(config_path) as f:
        return json.load(f)


def get_client_data_dir(client_slug):
    """Get (and create) the data directory for a client."""
    data_dir = os.path.join(DATA_DIR, client_slug)
    os.makedirs(data_dir, exist_ok=True)
    return data_dir


def list_clients():
    """List all configured client slugs."""
    clients = []
    if os.path.isdir(CONFIG_DIR):
        for f in sorted(os.listdir(CONFIG_DIR)):
            if f.endswith(".json") and f != "_template.json" and not f.startswith("._"):
                clients.append(f.replace(".json", ""))
    return clients


def setup_lgp_auth(config):
    """Configure lgp CLI with client-specific API key."""
    creds = config.get("credentials", {}).get("leadgenius", {})
    api_key = creds.get("api_key", "")
    admin_key = creds.get("admin_key", "")

    if api_key:
        os.environ["LGP_API_KEY"] = api_key
        subprocess.run(
            ["lgp", "config", "set", "api-key", api_key],
            capture_output=True, text=True
        )

    if admin_key:
        os.environ["LEADGENIUS_ADMIN_KEY"] = admin_key


def get_neon_dsn(config):
    """Get the Neon DSN from client config."""
    return config.get("credentials", {}).get("neon", {}).get("dsn", "")


def get_notion_key(config):
    """Get the Notion API key from client config (falls back to shared env)."""
    key = config.get("credentials", {}).get("notion", {}).get("api_key", "")
    if not key:
        key = os.environ.get("NOTION_API_KEY", "")
    return key


def add_client_arg(parser):
    """Add --client argument to any argparse parser."""
    parser.add_argument(
        "--client", "-c",
        required=True,
        help="Client slug (e.g., acme). Must match a config/clients/<slug>.json file."
    )
    return parser


def init_client(client_slug):
    """
    Full initialization for a client: load shared env, load config,
    set up LGP auth, return config dict.
    """
    load_shared_env()
    config = load_client_config(client_slug)
    setup_lgp_auth(config)
    return config


def print_header(title, config):
    """Print a standardized header for any script run."""
    slug = config.get("_meta", {}).get("client_slug", "?")
    product = config.get("product", {}).get("name", "?")
    admin = "LEADGENIUS_ADMIN_KEY" in os.environ

    print("=" * 70)
    print(f"  {title}")
    print(f"  Client: {slug} ({product})")
    if admin:
        print("  ⚡ Admin Key: Rate-limit bypass enabled")
    print("=" * 70)
    print()
