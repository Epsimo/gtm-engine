import type { ApiResponse } from '../core/api.js';

const PLANS: Record<string, string> = { free: '🆓 Free', pro: '⭐ Pro', premium: '💎 Premium', enterprise: '🏢 Enterprise' };

function bar(used: number, max: number, width = 20): string {
  const pct = max > 0 ? used / max : 0;
  const filled = Math.round(pct * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled) + ` ${Math.round(pct * 100)}%`;
}

export function formatEpsimo(action: string, res: ApiResponse): boolean {
  if (!res.success) { console.error(`\n  ✗ ${res.error}\n`); return false; }
  const d = res.data;
  if (!d) { console.log(JSON.stringify(res, null, 2)); return true; }

  if (action === 'info') {
    console.log(`
  👤 EpsimoAI Profile
  ───────────────────────────────
  Email:      ${d.email || '—'}
  User ID:    ${d.userId || '—'}
  Project:    ${d.projectId || '—'}
  Plan:       ${PLANS[d.plan] || d.plan}
  Credits:    ${d.threadMax - d.threadCounter} / ${d.threadMax}
  Usage:      ${bar(d.threadCounter, d.threadMax)}
  Stripe:     ${d.stripeClientId || 'none'}
`);
  } else if (action === 'credits') {
    console.log(`
  💰 Credit Balance
  ───────────────────────────────
  Available:  ${d.credits} credits
  Used:       ${d.threadCounter} / ${d.threadMax}
  Remaining:  ${bar(d.threadMax - d.threadCounter, d.threadMax)}
  Updated:    ${d.lastUpdated ? new Date(d.lastUpdated).toLocaleString() : '—'}
`);
  } else if (action === 'threads') {
    console.log(`
  📊 Thread Usage
  ───────────────────────────────
  Used:       ${d.threadCounter} / ${d.threadMax}
  Remaining:  ${d.remainingThreads}
  Usage:      ${bar(d.threadCounter, d.threadMax)}
  Plan:       ${PLANS[d.plan] || d.plan}
`);
  } else if (action === 'activate') {
    console.log(`
  🔑 Activated
  ───────────────────────────────
  Token:      ${d.epsimoToken ? d.epsimoToken.slice(0, 20) + '...' : d.token ? d.token.slice(0, 20) + '...' : '—'}
  User:       ${d.email || '—'}
  User ID:    ${d.userId || '—'}
`);
  } else if (action === 'purchase') {
    console.log(`
  🛒 Purchase Complete
  ───────────────────────────────
  New Balance: ${d.credits ?? d.threadMax ?? '—'} credits
`);
  } else {
    console.log(JSON.stringify(res, null, 2));
  }
  return true;
}
