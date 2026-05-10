import { getTuiClient, menuSelect, menuInput, menuConfirm, printJson, pause, BACK, backChoice } from './engine.js';
import { pickClient } from '../client-picker.js';

export async function adminMenu() {
  while (true) {
    const action = await menuSelect('Admin', [
      { name: 'Backup → List tables', value: 'tables' },
      { name: 'Backup → Create', value: 'backup-create' },
      { name: 'Backup → List backups', value: 'backup-list' },
      { name: 'Backup → Restore', value: 'backup-restore' },
      { name: 'PITR status', value: 'pitr-status' },
      { name: 'PITR enable', value: 'pitr-enable' },
      { name: 'Org tree', value: 'org-tree' },
      { name: 'List all companies', value: 'companies' },
      { name: 'List all users', value: 'users' },
      { name: 'List views', value: 'views' },
      { name: 'List clients', value: 'clients' },
      backChoice(),
    ]);
    if (action === BACK) return;
    const c = getTuiClient();
    try {
      if (action === 'tables') { printJson(await c.get('/admin/backup/tables')); }
      else if (action === 'backup-create') {
        const all = await menuConfirm('Backup all tables?');
        const body: any = { all };
        if (!all) body.tableName = await menuInput('Table name:');
        printJson(await c.post('/admin/backup/create', body));
      } else if (action === 'backup-list') { printJson(await c.get('/admin/backup/list')); }
      else if (action === 'backup-restore') {
        const arn = await menuInput('Backup ARN:');
        const target = await menuInput('Target table name:');
        printJson(await c.post('/admin/backup/restore', { arn, targetTableName: target }));
      } else if (action === 'pitr-status') {
        const table = await menuInput('Table name (or blank for all):');
        const params = new URLSearchParams();
        if (table) params.append('tableName', table);
        printJson(await c.get(`/admin/backup/pitr-status?${params}`));
      } else if (action === 'pitr-enable') { printJson(await c.post('/admin/backup/pitr-enable', { tableName: await menuInput('Table name:') })); }
      else if (action === 'org-tree') {
        const companyId = await menuInput('Company ID:');
        printJson(await c.get(`/admin/companies/${companyId}/org-tree?detailed=true`));
      } else if (action === 'companies') { printJson(await c.get('/admin/companies')); }
      else if (action === 'users') { printJson(await c.get('/admin/users')); }
      else if (action === 'views') { printJson(await c.get('/admin/views')); }
      else if (action === 'clients') { printJson(await c.get('/admin/clients')); }
    } catch (e: any) { console.error('Error:', e.message); }
    await pause();
  }
}

export async function generateMenu() {
  while (true) {
    const action = await menuSelect('Lead Generation', [
      { name: 'Generate from ICP', value: 'from-icp' },
      { name: 'Direct provider', value: 'direct' },
      { name: 'Run status', value: 'status' },
      { name: 'History', value: 'history' },
      { name: 'Schedule → Create', value: 'sched-create' },
      { name: 'Schedule → List', value: 'sched-list' },
      { name: 'Schedule → Pause', value: 'sched-pause' },
      { name: 'Schedule → Resume', value: 'sched-resume' },
      { name: 'Schedule → Delete', value: 'sched-delete' },
      backChoice(),
    ]);
    if (action === BACK) return;
    const c = getTuiClient();
    try {
      if (action === 'from-icp') {
        const icp = await menuInput('ICP ID:');
        const clientId = await pickClient(c); if (!clientId) continue;
        const max = await menuInput('Max leads:', '100');
        printJson(await c.post('/generate/from-icp', { icpId: icp, client_id: clientId, maxLeads: parseInt(max) }));
      } else if (action === 'direct') {
        const provider = await menuInput('Provider name:');
        const config = await menuInput('Config JSON:');
        const clientId = await pickClient(c); if (!clientId) continue;
        try { printJson(await c.post('/generate/direct', { provider, config: JSON.parse(config), client_id: clientId })); } catch { console.log('Invalid JSON.'); }
      } else if (action === 'status') { printJson(await c.get(`/generate/${await menuInput('Run ID:')}`)); }
      else if (action === 'history') { printJson(await c.get('/generate/history')); }
      else if (action === 'sched-create') {
        const icp = await menuInput('ICP ID:');
        const clientId = await pickClient(c); if (!clientId) continue;
        const freq = await menuInput('Frequency (daily/weekly/monthly):');
        printJson(await c.post('/generate/schedules', { icpId: icp, client_id: clientId, frequency: freq }));
      } else if (action === 'sched-list') { printJson(await c.get('/generate/schedules')); }
      else if (action === 'sched-pause') { printJson(await c.put(`/generate/schedules/${await menuInput('Schedule ID:')}`, { status: 'paused' })); }
      else if (action === 'sched-resume') { printJson(await c.put(`/generate/schedules/${await menuInput('Schedule ID:')}`, { status: 'active' })); }
      else if (action === 'sched-delete') {
        const id = await menuInput('Schedule ID:');
        if (await menuConfirm(`Delete schedule ${id}?`)) printJson(await c.delete(`/generate/schedules/${id}`));
      }
    } catch (e: any) { console.error('Error:', e.message); }
    await pause();
  }
}

export async function campaignsMenu() {
  while (true) {
    const action = await menuSelect('Campaigns', [
      { name: 'List campaigns', value: 'list' },
      { name: 'Create campaign', value: 'create' },
      backChoice(),
    ]);
    if (action === BACK) return;
    const c = getTuiClient();
    try {
      if (action === 'list') { printJson(await c.get('/campaigns')); }
      else if (action === 'create') {
        const name = await menuInput('Campaign name:');
        const type = await menuInput('Type:', 'abm');
        printJson(await c.post('/campaigns', { name, type }));
      }
    } catch (e: any) { console.error('Error:', e.message); }
    await pause();
  }
}

export async function clientsMenu() {
  while (true) {
    const action = await menuSelect('Clients', [
      { name: 'List clients', value: 'list' },
      { name: 'Create client', value: 'create' },
      backChoice(),
    ]);
    if (action === BACK) return;
    const c = getTuiClient();
    try {
      if (action === 'list') { printJson(await c.get('/clients')); }
      else if (action === 'create') {
        const name = await menuInput('Client name:');
        const url = await menuInput('Client URL (or blank):');
        const body: any = { name };
        if (url) body.url = url;
        printJson(await c.post('/clients', body));
      }
    } catch (e: any) { console.error('Error:', e.message); }
    await pause();
  }
}

export async function sharesMenu() {
  while (true) {
    const action = await menuSelect('Shared Links', [
      { name: 'List shares', value: 'list' },
      { name: 'Get share', value: 'get' },
      { name: 'Create share', value: 'create' },
      { name: 'Extend', value: 'extend' },
      { name: 'Revoke', value: 'revoke' },
      { name: 'Reactivate', value: 'reactivate' },
      backChoice(),
    ]);
    if (action === BACK) return;
    const c = getTuiClient();
    try {
      if (action === 'list') { printJson(await c.get('/shares')); }
      else if (action === 'get') { printJson(await c.get(`/shares/${await menuInput('Share ID:')}`)); }
      else if (action === 'create') {
        const days = await menuInput('Expiration days:', '30');
        const edit = await menuConfirm('Allow editing?');
        printJson(await c.post('/shares', { expirationDays: parseInt(days), allowEdit: edit }));
      } else if (action === 'extend') {
        const id = await menuInput('Share ID:');
        const days = await menuInput('Additional days:');
        printJson(await c.put(`/shares/${id}`, { action: 'extend', days: parseInt(days) }));
      } else if (action === 'revoke') { printJson(await c.put(`/shares/${await menuInput('Share ID:')}`, { action: 'revoke' })); }
      else if (action === 'reactivate') {
        const id = await menuInput('Share ID:');
        const days = await menuInput('New expiration days:', '30');
        printJson(await c.put(`/shares/${id}`, { action: 'reactivate', days: parseInt(days) }));
      }
    } catch (e: any) { console.error('Error:', e.message); }
    await pause();
  }
}

export async function maintenanceMenu() {
  while (true) {
    const action = await menuSelect('Maintenance', [
      { name: 'List bugs', value: 'bugs-list' },
      { name: 'Report bug', value: 'bugs-report' },
      { name: 'List enhancements', value: 'enh-list' },
      { name: 'Request enhancement', value: 'enh-request' },
      backChoice(),
    ]);
    if (action === BACK) return;
    const c = getTuiClient();
    try {
      if (action === 'bugs-list') {
        const res = await c.get('/tables/Maintenance?limit=100');
        if (res.success && Array.isArray(res.data)) res.data = res.data.filter((r: any) => r.type === 'bug');
        printJson(res);
      } else if (action === 'bugs-report') {
        const desc = await menuInput('Description:');
        const email = await menuInput('Contact email (or blank):');
        printJson(await c.post('/tables/Maintenance', { type: 'bug', description: desc, userEmail: email || undefined, status: 'open' }));
      } else if (action === 'enh-list') {
        const res = await c.get('/tables/Maintenance?limit=100');
        if (res.success && Array.isArray(res.data)) res.data = res.data.filter((r: any) => r.type === 'enhancement');
        printJson(res);
      } else if (action === 'enh-request') {
        const desc = await menuInput('Description:');
        const email = await menuInput('Contact email (or blank):');
        printJson(await c.post('/tables/Maintenance', { type: 'enhancement', description: desc, userEmail: email || undefined, status: 'open' }));
      }
    } catch (e: any) { console.error('Error:', e.message); }
    await pause();
  }
}

export async function pipelineMenu() {
  const start = await menuInput('Start date (ISO, or blank for last 30d):');
  const end = await menuInput('End date (ISO, or blank for now):');
  const params = new URLSearchParams();
  if (start) params.append('start', start);
  if (end) params.append('end', end);
  printJson(await getTuiClient().get(`/pipeline?${params}`));
  await pause();
}

export async function accountAnalysisMenu() {
  while (true) {
    const action = await menuSelect('Account Analysis', [
      { name: 'List company groups', value: 'list' },
      { name: 'Analyze', value: 'analyze' },
      { name: 'Export', value: 'export' },
      { name: 'Clear cache', value: 'cache-clear' },
      backChoice(),
    ]);
    if (action === BACK) return;
    const c = getTuiClient();
    try {
      if (action === 'list') {
        const clientId = await pickClient(c); if (!clientId) continue;
        printJson(await c.get(`/account-analysis?client_id=${clientId}`));
      } else if (action === 'analyze') {
        const clientId = await pickClient(c); if (!clientId) continue;
        const company = await menuInput('Company filter (or blank):');
        const params = new URLSearchParams({ client_id: clientId });
        if (company) params.append('company', company);
        printJson(await c.get(`/account-analysis/analyze?${params}`));
      } else if (action === 'export') {
        const clientId = await pickClient(c); if (!clientId) continue;
        const fmt = await menuInput('Format (csv/json):', 'json');
        printJson(await c.get(`/account-analysis/export?client_id=${clientId}&format=${fmt}`));
      } else if (action === 'cache-clear') {
        printJson(await c.post('/account-analysis/cache-clear'));
      }
    } catch (e: any) { console.error('Error:', e.message); }
    await pause();
  }
}
