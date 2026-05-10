const STATUSES: Record<string, string> = {
  active: '\x1b[32m● active\x1b[0m', pending: '\x1b[33m● pending\x1b[0m',
  inactive: '\x1b[90m● inactive\x1b[0m', disabled: '\x1b[31m● disabled\x1b[0m',
  completed: '\x1b[32m● completed\x1b[0m', failed: '\x1b[31m● failed\x1b[0m',
  running: '\x1b[36m● running\x1b[0m', CONFIRMED: '\x1b[32m● confirmed\x1b[0m',
  duplicate: '\x1b[33m● duplicate\x1b[0m',
};

function fmtDate(v: string): string {
  try { const d = new Date(v); return d.toLocaleDateString('en-CA') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); } catch { return v; }
}

function fmtVal(key: string, val: any): string {
  if (val === null || val === undefined || val === '') return '\x1b[90m—\x1b[0m';
  if (key === 'status') return STATUSES[val] || val;
  if (typeof val === 'boolean') return val ? '\x1b[32m✓\x1b[0m' : '\x1b[90m✗\x1b[0m';
  if ((key.endsWith('At') || key === 'created' || key === 'modified' || key === 'lastUpdated') && typeof val === 'string' && val.includes('T'))
    return fmtDate(val);
  if (Array.isArray(val)) return val.length === 0 ? '\x1b[90m—\x1b[0m' : typeof val[0] === 'object' ? `(${val.length} items)` : val.join(', ');
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function label(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^\w/, c => c.toUpperCase()).trim();
}

function shortId(id: string): string {
  if (id.length <= 12) return id;
  // Show last 8 chars for UUIDs
  return '…' + id.slice(-8);
}

function stripAnsi(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function pad(s: string, w: number): string {
  const visible = stripAnsi(s);
  return visible >= w ? s : s + ' '.repeat(w - visible);
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/\x1b\[[0-9;]*m/g, '');
  if (clean.length <= max) return s;
  // If has ANSI codes, truncate the clean version
  if (s !== clean) return clean.slice(0, max - 1) + '…';
  return s.slice(0, max - 1) + '…';
}

// Column config: max widths per known field
const COL_MAX: Record<string, number> = {
  id: 9, email: 28, companyName: 22, firstName: 12, lastName: 12, fullName: 16,
  title: 30, status: 12, role: 8, group: 8, name: 24, clientName: 28,
  plan: 10, type: 12, platform: 12, description: 30, createdAt: 16, updatedAt: 16,
  created: 16, username: 20, enabled: 3, matchField: 12, confidence: 10,
  matchValue: 30, leadIds: 40,
};

// Preferred display columns per context
const PREFERRED = ['name', 'clientName', 'email', 'firstName', 'lastName', 'companyName', 'title', 'status', 'role', 'group', 'plan', 'type', 'platform', 'createdAt'];

function pickCols(items: any[]): string[] {
  const allKeys = Object.keys(items[0]);
  const cols: string[] = [];
  // Always start with a name/identifier column (not raw id)
  for (const k of PREFERRED) { if (allKeys.includes(k) && !cols.includes(k)) cols.push(k); }
  // Add id at the start if nothing better
  if (allKeys.includes('id') && !cols.includes('id')) cols.unshift('id');
  // Fill remaining non-object fields up to ~8 cols
  for (const k of allKeys) {
    if (cols.length >= 8) break;
    if (!cols.includes(k) && typeof items[0][k] !== 'object' && !k.endsWith('Id') && k !== 'owner' && k !== 'company_id' && k !== 'requestId') cols.push(k);
  }
  return cols;
}

function printTable(items: any[]) {
  if (items.length === 0) { console.log('  \x1b[90m(no results)\x1b[0m'); return; }
  const cols = pickCols(items);

  // Compute column widths: min of (max content, configured max, 30)
  const widths = cols.map(c => {
    const maxConf = COL_MAX[c] || 30;
    const headerW = label(c).length;
    const contentW = Math.max(...items.slice(0, 50).map(i => {
      let v = i[c];
      if (c === 'id') v = shortId(String(v ?? ''));
      else if (typeof v === 'string' && v.includes('T') && (c.endsWith('At') || c === 'created')) v = fmtDate(v);
      else v = String(v ?? '—');
      return v.replace(/\x1b\[[0-9;]*m/g, '').length;
    }));
    return Math.min(Math.max(headerW, contentW), maxConf);
  });

  // Header
  const header = cols.map((c, i) => pad(label(c), widths[i])).join('  ');
  console.log(`  \x1b[1;90m${header}\x1b[0m`);
  console.log(`  \x1b[90m${widths.map(w => '─'.repeat(w)).join('──')}\x1b[0m`);

  // Rows
  for (const item of items.slice(0, 50)) {
    const row = cols.map((c, i) => {
      let v = item[c];
      if (c === 'id') return pad(truncate(shortId(String(v ?? '—')), widths[i]), widths[i]);
      const formatted = fmtVal(c, v);
      return pad(truncate(formatted, widths[i]), widths[i]);
    }).join('  ');
    console.log(`  ${row}`);
  }
  if (items.length > 50) console.log(`  \x1b[90m… and ${items.length - 50} more\x1b[0m`);
}

function printRecord(obj: Record<string, any>) {
  const keys = Object.keys(obj).filter(k => k !== 'requestId');
  // Separate scalar fields from array/object fields
  const scalars = keys.filter(k => !Array.isArray(obj[k]) || (Array.isArray(obj[k]) && obj[k].length > 0 && typeof obj[k][0] !== 'object'));
  const nested = keys.filter(k => Array.isArray(obj[k]) && obj[k].length > 0 && typeof obj[k][0] === 'object');

  if (scalars.length > 0) {
    const maxLabel = Math.min(Math.max(...scalars.map(k => label(k).length), 8), 22);
    for (const key of scalars) {
      const lbl = label(key).padEnd(maxLabel);
      console.log(`  ${lbl}  ${fmtVal(key, obj[key])}`);
    }
  }

  // Render nested arrays of objects as sub-tables
  for (const key of nested) {
    const items = obj[key];
    console.log(`\n  \x1b[1m${label(key)}\x1b[0m (${items.length})\n`);
    printTable(items);
  }
}

export function smartFormat(res: any) {
  if (!res || typeof res !== 'object') { console.log(res); return; }

  if (res.success === false) {
    console.log(`\n  \x1b[31m✗ ${res.error || 'Request failed'}\x1b[0m`);
    if (res.details) console.log(`  \x1b[90m${res.details}\x1b[0m`);
    if (res.code) console.log(`  \x1b[90mCode: ${res.code}\x1b[0m`);
    console.log();
    return;
  }

  const data = res.data;
  if (data === undefined || data === null) {
    console.log(`\n  \x1b[32m✓\x1b[0m ${res.message || 'Success'}\n`);
    return;
  }

  console.log();

  const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : null;
  if (items) {
    const more = res.nextToken || (data.nextToken) ? ' \x1b[90m(more available)\x1b[0m' : '';
    console.log(`  \x1b[1m${items.length} result${items.length !== 1 ? 's' : ''}\x1b[0m${more}`);
    console.log();
    if (items.length > 0 && typeof items[0] === 'object') printTable(items);
    else for (const item of items) console.log(`  • ${item}`);
    if (data.count !== undefined && data.count !== items.length) console.log(`\n  \x1b[90mTotal: ${data.count}\x1b[0m`);
    if (items.length === 0 && res.details) console.log(`  \x1b[33m💡 ${res.details}\x1b[0m`);
  } else if (typeof data === 'object') {
    printRecord(data);
  } else {
    console.log(`  ${data}`);
  }

  if (res.message && !items) console.log(`\n  \x1b[90m${res.message}\x1b[0m`);
  console.log();
}
