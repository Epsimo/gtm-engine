import { getTuiClient, menuSelect, menuInput, menuConfirm, printJson, pause, BACK, backChoice } from './engine.js';
import { pickClient } from '../client-picker.js';
import { smartSearch } from '../smart-search.js';

export async function authMenu() {
  printJson(await getTuiClient().get('/auth/test'));
  await pause();
}

export async function leadsMenu() {
  while (true) {
    const action = await menuSelect('Leads', [
      { name: 'List leads', value: 'list' },
      { name: 'Get lead by ID', value: 'get' },
      { name: 'Search leads', value: 'search' },
      { name: 'Import leads', value: 'import' },
      { name: 'Deduplicate', value: 'dedup' },
      { name: 'Resolve duplicates', value: 'dedup-resolve' },
      { name: 'Transfer leads', value: 'transfer' },
      { name: 'Log activity', value: 'activity' },
      { name: 'Get activities', value: 'activities' },
      { name: 'Validate ownership', value: 'validate' },
      { name: 'Prune blanks', value: 'prune' },
      backChoice(),
    ]);
    if (action === BACK) return;
    const c = getTuiClient();
    try {
      if (action === 'list') {
        const clientId = await pickClient(c);
        if (!clientId) continue;
        const limit = await menuInput('Limit:', '50');
        printJson(await c.get(`/leads?client_id=${clientId}&limit=${limit}`));
      } else if (action === 'get') {
        const id = await menuInput('Lead ID:');
        printJson(await c.get(`/leads/${id}`));
      } else if (action === 'search') {
        const query = await menuInput('Search (email, name, URL):');
        if (!query) continue;
        printJson(await smartSearch(c, query));
      } else if (action === 'import') {
        const file = await menuInput('File path (CSV or JSON):');
        if (!file) continue;
        const { readFileSync } = await import('fs');
        let body: any;
        try {
          const content = readFileSync(file, 'utf-8');
          if (file.endsWith('.csv')) {
            const { parseCsv } = await import('../csv-parser.js');
            const leads = parseCsv(content);
            if (leads.length === 0) { console.log('No leads found in CSV.'); await pause(); continue; }
            const clientId = await pickClient(c);
            if (!clientId) continue;
            leads.forEach((l: any) => l.client_id = clientId);
            console.log(`  Importing ${leads.length} leads from CSV...`);
            body = { leads };
          } else {
            body = JSON.parse(content);
          }
        } catch (e: any) { console.log('Error reading file: ' + e.message); await pause(); continue; }
        printJson(await c.post('/leads/import', body));
      } else if (action === 'dedup') {
        const clientId = await pickClient(c);
        if (!clientId) continue;
        const match = await menuInput('Match fields (comma-sep):', 'email');
        printJson(await c.post('/leads/deduplicate', { client_id: clientId, matchFields: match.split(',') }));
      } else if (action === 'dedup-resolve') {
        const keep = await menuInput('Keep lead ID:');
        const merge = await menuInput('Merge lead IDs (comma-sep):');
        printJson(await c.post('/leads/deduplicate/resolve', { keepLeadId: keep, mergeLeadIds: merge.split(',') }));
      } else if (action === 'transfer') {
        const from = await pickClient(c, 'From client');
        if (!from) continue;
        const to = await pickClient(c, 'To client');
        if (!to) continue;
        const dry = await menuConfirm('Dry run?', true);
        printJson(await c.post('/leads/transfer', { fromClientId: from, toClientId: to, all: true, dryRun: dry }));
      } else if (action === 'activity') {
        const leadId = await menuInput('Lead ID:');
        const type = await menuInput('Activity type:');
        const notes = await menuInput('Notes (or blank):');
        const body: any = { type };
        if (notes) body.notes = notes;
        printJson(await c.post(`/leads/${leadId}/activities`, body));
      } else if (action === 'activities') {
        const leadId = await menuInput('Lead ID:');
        printJson(await c.get(`/leads/${leadId}/activities`));
      } else if (action === 'validate') {
        printJson(await c.post('/leads/validate-ownership'));
      } else if (action === 'prune') {
        const clientId = await pickClient(c);
        if (!clientId) continue;
        const dry = await menuConfirm('Dry run?', true);
        printJson(await c.post('/leads/prune-blanks', { client_id: clientId, dryRun: dry }));
      }
    } catch (e: any) { console.error('Error:', e.message); }
    await pause();
  }
}

export async function tasksMenu() {
  while (true) {
    const action = await menuSelect('Tasks', [
      { name: 'List jobs', value: 'list' },
      { name: 'Get job status', value: 'status' },
      { name: 'Trigger enrichment', value: 'enrich' },
      { name: 'Trigger AI content', value: 'copyright' },
      { name: 'Trigger scoring', value: 'score' },
      backChoice(),
    ]);
    if (action === BACK) return;
    const c = getTuiClient();
    try {
      if (action === 'list') {
        const status = await menuInput('Status filter (or blank):');
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        printJson(await c.get(`/tasks?${params}`));
      } else if (action === 'status') {
        printJson(await c.get(`/tasks/${await menuInput('Job ID:')}`));
      } else if (action === 'enrich') {
        const leadId = await menuInput('Lead ID:');
        const services = await menuInput('Services (comma-sep, or blank):');
        printJson(await c.post('/tasks/enrich', { leadId, services: services ? services.split(',') : undefined }));
      } else if (action === 'copyright') {
        const leadId = await menuInput('Lead ID:');
        const processes = await menuInput('Processes (comma-sep, or blank):');
        printJson(await c.post('/tasks/copyright', { leadId, processes: processes ? processes.split(',') : undefined }));
      } else if (action === 'score') {
        const leadId = await menuInput('Lead ID(s) (comma-sep):');
        const ids = leadId.split(',');
        const body: any = ids.length === 1 ? { leadId: ids[0] } : { leadIds: ids };
        printJson(await c.post('/tasks/score', body));
      }
    } catch (e: any) { console.error('Error:', e.message); }
    await pause();
  }
}
