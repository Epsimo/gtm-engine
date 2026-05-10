import { select } from '@inquirer/prompts';
import { ApiClient } from '../core/api.js';

interface ClientRecord { id: string; client_id: string; clientName: string; companyURL?: string; description?: string }

let cachedClients: ClientRecord[] | null = null;

export async function fetchClients(apiClient: ApiClient): Promise<ClientRecord[]> {
  if (cachedClients) return cachedClients;
  const res = await apiClient.get('/tables/Client?limit=100');
  if (res.success && Array.isArray(res.data)) {
    cachedClients = res.data;
    return cachedClients;
  }
  return [];
}

export function clearClientCache() { cachedClients = null; }

export async function pickClient(apiClient: ApiClient, message = 'Select client'): Promise<string | null> {
  const clients = await fetchClients(apiClient);
  if (clients.length === 0) { console.log('  No clients found. Create one first.'); return null; }
  const choices = clients.map(c => ({
    name: `${c.clientName || c.client_id}${c.description ? ` — ${c.description}` : ''}`,
    value: c.client_id,
  }));
  choices.push({ name: '✏️  Enter ID manually', value: '__manual__' });
  const val = await select({ message, choices });
  if (val === '__manual__') {
    const { input } = await import('@inquirer/prompts');
    return input({ message: 'Client ID:' });
  }
  return val;
}

/** For CLI commands: use --client flag if provided, otherwise prompt with picker */
export async function resolveClient(apiClient: ApiClient, flagValue?: string): Promise<string | null> {
  if (flagValue) return flagValue;
  return pickClient(apiClient);
}
