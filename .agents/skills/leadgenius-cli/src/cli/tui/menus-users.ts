import { getTuiClient, menuSelect, menuInput, menuPassword, menuConfirm, printJson, pause, BACK, backChoice, cognitoAuth, epsimoExchange } from './engine.js';
import { formatEpsimo as fmtEpsimo } from '../epsimo-fmt.js';
import { saveSession, getSessionValue } from '../session.js';

export async function usersMenu() {
  while (true) {
    const action = await menuSelect('Users', [
      { name: 'List users', value: 'list' },
      { name: 'Get user', value: 'get' },
      { name: 'Create user', value: 'create' },
      { name: 'Update user', value: 'update' },
      { name: 'Delete user', value: 'delete' },
      { name: 'Provision (full setup)', value: 'provision' },
      { name: 'Menu config', value: 'menu-config' },
      backChoice(),
    ]);
    if (action === BACK) return;
    const c = getTuiClient();
    try {
      if (action === 'list') { printJson(await c.get('/users')); }
      else if (action === 'get') { printJson(await c.get(`/users/${await menuInput('User ID:')}`)); }
      else if (action === 'create') {
        const email = await menuInput('Email:');
        const role = await menuInput('Role (owner/admin/member/viewer):', 'member');
        const group = await menuInput('Group (admin/manager/user/viewer):', 'user');
        printJson(await c.post('/users', { email, role, group }));
      } else if (action === 'update') {
        const id = await menuInput('User ID:');
        const role = await menuInput('Role (or blank):');
        const group = await menuInput('Group (or blank):');
        const status = await menuInput('Status (or blank):');
        const body: any = {};
        if (role) body.role = role;
        if (group) body.group = group;
        if (status) body.status = status;
        printJson(await c.put(`/users/${id}`, body));
      } else if (action === 'delete') {
        const id = await menuInput('User ID:');
        if (await menuConfirm(`Delete user ${id}?`)) printJson(await c.delete(`/users/${id}`));
      } else if (action === 'provision') {
        const email = await menuInput('Email:');
        const pwd = await menuPassword('Password:');
        const name = await menuInput('Display name (or blank):');
        const companyId = await menuInput('Company ID to join (or blank for new):');
        const companyName = companyId ? undefined : await menuInput('New company name (or blank):');
        const body: any = { email, password: pwd, createApiKey: await menuConfirm('Create API key?', true) };
        if (name) body.name = name;
        if (companyId) body.company_id = companyId; else if (companyName) body.companyName = companyName;
        printJson(await c.post('/users/provision', body));
      } else if (action === 'menu-config') { printJson(await c.get('/users/menu-config')); }
    } catch (e: any) { console.error('Error:', e.message); }
    await pause();
  }
}

export async function orgMenu() {
  while (true) {
    const action = await menuSelect('Organizations', [
      { name: 'List companies', value: 'list' },
      { name: 'Get company', value: 'get' },
      { name: 'Create company', value: 'create' },
      { name: 'Rename company', value: 'rename' },
      { name: 'Delete company', value: 'delete' },
      { name: 'List company users', value: 'users' },
      { name: 'Add user', value: 'add-user' },
      { name: 'Remove user', value: 'remove-user' },
      backChoice(),
    ]);
    if (action === BACK) return;
    const c = getTuiClient();
    try {
      if (action === 'list') { printJson(await c.get('/companies/manage')); }
      else if (action === 'get') { printJson(await c.get(`/companies/manage?id=${await menuInput('Company ID:')}`)); }
      else if (action === 'create') { printJson(await c.post('/companies/manage', { name: await menuInput('Company name:') })); }
      else if (action === 'rename') {
        const id = await menuInput('Company ID:');
        printJson(await c.put('/companies/manage', { id, action: 'rename', name: await menuInput('New name:') }));
      } else if (action === 'delete') {
        const id = await menuInput('Company ID:');
        if (await menuConfirm(`Delete company ${id}?`)) printJson(await c.delete(`/companies/manage?id=${id}`));
      } else if (action === 'users') { printJson(await c.get(`/companies/manage?id=${await menuInput('Company ID:')}&users=true`)); }
      else if (action === 'add-user') {
        const companyId = await menuInput('Company ID:');
        const email = await menuInput('User email:');
        const role = await menuInput('Role:', 'member');
        printJson(await c.put('/companies/manage', { id: companyId, action: 'add-user', email, role }));
      } else if (action === 'remove-user') {
        const userId = await menuInput('User ID:');
        if (await menuConfirm(`Remove user ${userId}?`)) printJson(await c.put('/companies/manage', { action: 'remove-user', userId }));
      }
    } catch (e: any) { console.error('Error:', e.message); }
    await pause();
  }
}

export async function cognitoMenu() {
  while (true) {
    const action = await menuSelect('Cognito', [
      { name: 'List users', value: 'list' },
      { name: 'Get user by email', value: 'get' },
      { name: 'Create user', value: 'create' },
      { name: 'Enable user', value: 'enable' },
      { name: 'Disable user', value: 'disable' },
      { name: 'Set password', value: 'set-password' },
      { name: 'Set attributes', value: 'set-attributes' },
      backChoice(),
    ]);
    if (action === BACK) return;
    const c = getTuiClient();
    try {
      if (action === 'list') { printJson(await c.get(`/users/cognito?limit=${await menuInput('Limit:', '20')}`)); }
      else if (action === 'get') { printJson(await c.get(`/users/cognito?email=${encodeURIComponent(await menuInput('Email:'))}`)); }
      else if (action === 'create') {
        const email = await menuInput('Email:');
        const pwd = await menuPassword('Password (min 8 chars):');
        const name = await menuInput('Display name (or blank):');
        const body: any = { email, password: pwd };
        if (name) body.name = name;
        printJson(await c.post('/users/cognito', body));
      } else if (action === 'enable') { printJson(await c.put('/users/cognito', { email: await menuInput('Email:'), action: 'enable' })); }
      else if (action === 'disable') { printJson(await c.put('/users/cognito', { email: await menuInput('Email:'), action: 'disable' })); }
      else if (action === 'set-password') {
        const email = await menuInput('Email:');
        const pwd = await menuPassword('New password:');
        printJson(await c.put('/users/cognito', { email, action: 'set-password', password: pwd }));
      } else if (action === 'set-attributes') {
        const email = await menuInput('Email:');
        const attrs = await menuInput('Attributes JSON:');
        try { printJson(await c.put('/users/cognito', { email, action: 'set-attributes', attributes: JSON.parse(attrs) })); } catch { console.log('Invalid JSON.'); }
      }
    } catch (e: any) { console.error('Error:', e.message); }
    await pause();
  }
}

export async function epsimoMenu() {
  const c = getTuiClient();
  let epsimoToken: string | null = getSessionValue('epsimoToken') || null;

  // Auto-authenticate on first entry
  async function ensureToken(): Promise<string | null> {
    if (epsimoToken) return epsimoToken;
    console.log('\n🔐 EpsimoAI requires authentication. Sign in with your LeadGenius credentials.\n');
    try {
      const email = await menuInput('LeadGenius email:');
      const pwd = await menuPassword('Password:');

      // Step 1: Authenticate with Cognito to get JWT
      console.log('Authenticating with Cognito...');
      const cognito = await cognitoAuth(email, pwd);
      if (!cognito) return null;
      console.log('✓ Cognito authenticated');

      // Step 2: Exchange Cognito token for EpsimoAI token directly
      console.log('Exchanging for EpsimoAI token...');
      const token = await epsimoExchange(cognito.idToken);
      if (token) {
        epsimoToken = token;
        saveSession({ epsimoToken: token, cognitoEmail: email });
        console.log('✓ EpsimoAI token obtained\n');
        return epsimoToken;
      }
      console.error('✗ Token exchange failed');
      return null;
    } catch (e: any) {
      if (e.name === 'ExitPromptError') throw e;
      console.error('Error:', e.message); return null;
    }
  }

  while (true) {
    const action = await menuSelect('EpsimoAI' + (epsimoToken ? ' ✓' : ''), [
      { name: epsimoToken ? '🔑 Re-authenticate' : '🔑 Authenticate', value: 'activate' },
      { name: '👤 User info & plan', value: 'info' },
      { name: '💰 Credit balance', value: 'credits' },
      { name: '🛒 Purchase credits', value: 'purchase' },
      { name: '📊 Thread usage', value: 'threads' },
      backChoice(),
    ]);
    if (action === BACK) return;
    try {
      if (action === 'activate') { epsimoToken = null; await ensureToken(); continue; }
      const token = await ensureToken();
      if (!token) continue;
      const h = { extraHeaders: { 'X-Epsimo-Token': token } };
      if (action === 'info') fmtEpsimo('info', await c.get('/epsimo/users/info', h));
      else if (action === 'credits') fmtEpsimo('credits', await c.get('/epsimo/credits/balance', h));
      else if (action === 'purchase') {
        const amount = await menuInput('Amount (integer):');
        fmtEpsimo('purchase', await c.post('/epsimo/credits/purchase', { amount: parseInt(amount) }, h));
      } else if (action === 'threads') fmtEpsimo('threads', await c.get('/epsimo/threads', h));
    } catch (e: any) { console.error('Error:', e.message); }
    await pause();
  }
}
