import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const DIR = join(homedir(), '.leadgenius-cli');
const FILE = join(DIR, 'session.json');

export interface Session {
  apiKey?: string;
  baseUrl?: string;
  adminKey?: string;
  epsimoToken?: string;
  cognitoIdToken?: string;
  cognitoAccessToken?: string;
  cognitoEmail?: string;
  companyId?: string;
  owner?: string;
  lastClientId?: string;
  lastClientName?: string;
  [key: string]: any;
}

let cached: Session | null = null;

export function loadSession(): Session {
  if (cached) return cached;
  try {
    if (existsSync(FILE)) {
      cached = JSON.parse(readFileSync(FILE, 'utf-8'));
      return cached!;
    }
  } catch { /* corrupt file, start fresh */ }
  cached = {};
  return cached;
}

export function saveSession(updates: Partial<Session>) {
  const session = loadSession();
  Object.assign(session, updates);
  // Remove null/undefined values
  for (const k of Object.keys(session)) { if (session[k] === null || session[k] === undefined) delete session[k]; }
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(session, null, 2), { mode: 0o600 });
  cached = session;
}

export function getSessionValue(key: keyof Session): string | undefined {
  return loadSession()[key];
}

export function clearSession() {
  try { if (existsSync(FILE)) unlinkSync(FILE); } catch { /* ignore */ }
  cached = {};
}

export function sessionPath(): string { return FILE; }

export function sessionSummary(): Record<string, string> {
  const s = loadSession();
  const summary: Record<string, string> = {};
  for (const [k, v] of Object.entries(s)) {
    if (!v) continue;
    if (k.toLowerCase().includes('key') || k.toLowerCase().includes('token')) {
      summary[k] = String(v).slice(0, 10) + '…' + String(v).slice(-4);
    } else {
      summary[k] = String(v);
    }
  }
  return summary;
}
