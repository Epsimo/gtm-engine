import { getTuiClient, menuSelect, menuInput, menuConfirm, printJson, pause, BACK, backChoice } from './engine.js';
import { pickClient } from '../client-picker.js';

export async function fsdMenu() {
  while (true) {
    const action = await menuSelect('FSD Pipeline', [
      { name: 'List campaigns', value: 'campaigns' },
      { name: 'Get campaign', value: 'campaign' },
      { name: 'Create campaign', value: 'create' },
      { name: 'Update campaign', value: 'update' },
      { name: 'Deactivate campaign', value: 'deactivate' },
      { name: 'Run pipeline', value: 'run' },
      { name: 'Pipeline status', value: 'status' },
      backChoice(),
    ]);
    if (action === BACK) return;
    const c = getTuiClient();
    try {
      if (action === 'campaigns') { printJson(await c.get('/fsd/campaigns')); }
      else if (action === 'campaign') { printJson(await c.get(`/fsd/campaigns/${await menuInput('Campaign ID:')}`)); }
      else if (action === 'create') {
        const clientId = await pickClient(c);
        if (!clientId) continue;
        const name = await menuInput('Campaign name:');
        const icp = await menuInput('ICP ID (or blank):');
        const body: any = { client_id: clientId, name };
        if (icp) body.icpId = icp;
        printJson(await c.post('/fsd/campaigns', body));
      } else if (action === 'update') {
        const id = await menuInput('Campaign ID:');
        const name = await menuInput('New name (or blank):');
        const target = await menuInput('Target lead count (or blank):');
        const body: any = {};
        if (name) body.name = name;
        if (target) body.targetLeadCount = parseInt(target);
        printJson(await c.put(`/fsd/campaigns/${id}`, body));
      } else if (action === 'deactivate') { printJson(await c.delete(`/fsd/campaigns/${await menuInput('Campaign ID:')}`)); }
      else if (action === 'run') {
        const clientId = await pickClient(c);
        if (!clientId) continue;
        const icp = await menuInput('ICP ID (or blank):');
        const target = await menuInput('Target leads:', '100');
        const enrich = await menuConfirm('Auto-enrich?');
        const score = await menuConfirm('Auto-score?');
        const body: any = { client_id: clientId, targetLeadCount: parseInt(target), enrichAfterGeneration: enrich, scoreAfterEnrichment: score };
        if (icp) body.icpId = icp;
        printJson(await c.post('/fsd/run', body));
      } else if (action === 'status') { printJson(await c.get(`/fsd/run/${await menuInput('Pipeline ID:')}`)); }
    } catch (e: any) { console.error('Error:', e.message); }
    await pause();
  }
}

export async function companiesMenu() {
  while (true) {
    const action = await menuSelect('Territory Companies', [
      { name: 'List companies', value: 'list' },
      { name: 'Get company', value: 'get' },
      { name: 'Company leads', value: 'leads' },
      { name: 'Content analysis', value: 'content' },
      { name: 'Aggregate', value: 'aggregate' },
      { name: 'Events → List', value: 'events-list' },
      { name: 'Events → Create', value: 'events-create' },
      { name: 'Events → Generate', value: 'events-gen' },
      { name: 'Events → Radar', value: 'radar' },
      backChoice(),
    ]);
    if (action === BACK) return;
    const c = getTuiClient();
    try {
      if (action === 'list') {
        const cid = await pickClient(c); if (!cid) continue;
        printJson(await c.get(`/companies?client_id=${cid}`)); }
      else if (action === 'get') { printJson(await c.get(`/companies/${await menuInput('Company ID:')}`)); }
      else if (action === 'leads') { printJson(await c.get(`/companies/${await menuInput('Company ID:')}/leads`)); }
      else if (action === 'content') { printJson(await c.post(`/companies/${await menuInput('Company ID:')}/content-analysis`)); }
      else if (action === 'aggregate') {
        const cid = await pickClient(c); if (!cid) continue;
        printJson(await c.post('/companies/aggregate', { client_id: cid })); }
      else if (action === 'events-list') { printJson(await c.get('/companies/events')); }
      else if (action === 'events-create') {
        const companyId = await menuInput('Company ID:');
        const type = await menuInput('Event type:');
        printJson(await c.post('/companies/events', { companyId, type }));
      } else if (action === 'events-gen') {
        const cid = await pickClient(c); if (!cid) continue;
        printJson(await c.post('/companies/events/generate', { client_id: cid })); }
      else if (action === 'radar') { printJson(await c.get('/companies/events/radar')); }
    } catch (e: any) { console.error('Error:', e.message); }
    await pause();
  }
}

export async function webhooksMenu() {
  while (true) {
    const action = await menuSelect('Webhooks', [
      { name: 'List events', value: 'list' },
      { name: 'Get event', value: 'get' },
      { name: 'Reprocess event', value: 'reprocess' },
      backChoice(),
    ]);
    if (action === BACK) return;
    const c = getTuiClient();
    try {
      if (action === 'list') {
        const platform = await menuInput('Platform filter (or blank):');
        const params = new URLSearchParams();
        if (platform) params.append('platform', platform);
        printJson(await c.get(`/webhook-events?${params}`));
      } else if (action === 'get') { printJson(await c.get(`/webhook-events/${await menuInput('Event ID:')}`)); }
      else if (action === 'reprocess') { printJson(await c.post(`/webhook-events/${await menuInput('Event ID:')}/reprocess`)); }
    } catch (e: any) { console.error('Error:', e.message); }
    await pause();
  }
}

export async function tablesMenu() {
  while (true) {
    const action = await menuSelect('Tables (Generic CRUD)', [
      { name: 'List records', value: 'list' },
      { name: 'Get record', value: 'get' },
      { name: 'Create record', value: 'create' },
      { name: 'Update record', value: 'update' },
      { name: 'Delete record', value: 'delete' },
      backChoice(),
    ]);
    if (action === BACK) return;
    const c = getTuiClient();
    try {
      if (action === 'list') {
        const table = await menuInput('Table name:');
        const limit = await menuInput('Limit:', '50');
        printJson(await c.get(`/tables/${table}?limit=${limit}`));
      } else if (action === 'get') {
        printJson(await c.get(`/tables/${await menuInput('Table name:')}/${await menuInput('Record ID:')}`));
      } else if (action === 'create') {
        const table = await menuInput('Table name:');
        const data = await menuInput('JSON data:');
        try { printJson(await c.post(`/tables/${table}`, JSON.parse(data))); } catch { console.log('Invalid JSON.'); }
      } else if (action === 'update') {
        const table = await menuInput('Table name:');
        const id = await menuInput('Record ID:');
        const data = await menuInput('JSON fields to update:');
        try { printJson(await c.put(`/tables/${table}/${id}`, JSON.parse(data))); } catch { console.log('Invalid JSON.'); }
      } else if (action === 'delete') {
        const table = await menuInput('Table name:');
        const id = await menuInput('Record ID:');
        if (await menuConfirm(`Delete ${id} from ${table}?`)) printJson(await c.delete(`/tables/${table}/${id}`));
      }
    } catch (e: any) { console.error('Error:', e.message); }
    await pause();
  }
}
