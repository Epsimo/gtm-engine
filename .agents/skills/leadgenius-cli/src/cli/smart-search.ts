import { ApiClient, ApiResponse } from '../core/api.js';

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export async function smartSearch(client: ApiClient, query: string, extraParams?: Record<string, string>): Promise<ApiResponse> {
  const q = query.trim();
  if (!q) return { success: false, error: 'Search query is empty' };

  const base = new URLSearchParams(extraParams || {});

  // Email
  if (q.includes('@')) {
    base.append('email', q.toLowerCase());
    return client.get(`/leads/search?${base}`);
  }

  // URL
  if (q.startsWith('http') || /\.\w{2,}\//.test(q) || q.includes('.com') || q.includes('.io') || q.includes('.fr')) {
    base.append(q.includes('linkedin') ? 'linkedinUrl' : 'companyUrl', q);
    return client.get(`/leads/search?${base}`);
  }

  // Name search — try multiple case variants and firstName/lastName combos
  const parts = q.split(/\s+/);

  if (parts.length >= 2) {
    // "First Last" — title-case both
    const p = new URLSearchParams(base);
    p.append('firstName', titleCase(parts[0]));
    p.append('lastName', titleCase(parts.slice(1).join(' ')));
    const res = await client.get(`/leads/search?${p}`);
    if (res.success && getCount(res) > 0) return res;

    // Try original case
    const p2 = new URLSearchParams(base);
    p2.append('firstName', parts[0]);
    p2.append('lastName', parts.slice(1).join(' '));
    return client.get(`/leads/search?${p2}`);
  }

  // Single word — try as firstName (title-case), then as lastName via listing
  const word = parts[0];
  const variants = [titleCase(word), word, word.toUpperCase(), word.toLowerCase()];
  // Deduplicate
  const unique = [...new Set(variants)];

  for (const v of unique) {
    const p = new URLSearchParams(base);
    p.append('firstName', v);
    const res = await client.get(`/leads/search?${p}`);
    if (res.success && getCount(res) > 0) return res;
  }

  // No results as firstName — return empty with hint
  return { success: true, data: [], error: undefined, details: `No results for "${q}". The API searches by firstName (exact match). Try "FirstName LastName" for full name search.` };
}

function getCount(res: ApiResponse): number {
  if (!res.data) return 0;
  if (Array.isArray(res.data)) return res.data.length;
  if (Array.isArray(res.data.items)) return res.data.items.length;
  return 0;
}
