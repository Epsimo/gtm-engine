import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';

export function registerUsersCommands(program: Command) {
  const users = program.command('users').description('User management commands');

  users
    .command('list')
    .description('List company users')
    .option('-g, --group <group>', 'Filter by group')
    .option('-l, --limit <n>', 'Maximum records')
    .action(async (options) => {
      const params = new URLSearchParams();
      if (options.group) params.append('group', options.group);
      if (options.limit) params.append('limit', options.limit);
      formatOutput(await getClient().get(`/users?${params}`));
    });

  users.command('get <id>').description('Get user detail').action(async (id) => {
    formatOutput(await getClient().get(`/users/${id}`));
  });

  users
    .command('create')
    .description('Create/invite user')
    .requiredOption('-e, --email <email>', 'User email')
    .option('--role <role>', 'Role: owner|admin|member|viewer')
    .option('--group <group>', 'Group: admin|manager|user|viewer')
    .option('--user-id <id>', 'Cognito sub (if known)')
    .option('--menu-access <keys>', 'Comma-separated menu keys')
    .option('--permissions <json>', 'JSON permissions object')
    .option('--client-access-mode <mode>', 'all|own|specific')
    .option('--allowed-client-ids <ids>', 'Comma-separated client IDs')
    .action(async (options) => {
      const body: any = { email: options.email };
      if (options.role) body.role = options.role;
      if (options.group) body.group = options.group;
      if (options.userId) body.user_id = options.userId;
      if (options.menuAccess) body.menuAccess = options.menuAccess.split(',');
      if (options.permissions) { try { body.permissions = JSON.parse(options.permissions); } catch { console.error('Error: Invalid JSON for --permissions.'); return; } }
      if (options.clientAccessMode) body.clientAccessMode = options.clientAccessMode;
      if (options.allowedClientIds) body.allowedClientIds = options.allowedClientIds.split(',');
      formatOutput(await getClient().post('/users', body));
    });

  users
    .command('update <id>')
    .description('Update user')
    .option('--role <role>')
    .option('--group <group>')
    .option('--status <status>')
    .option('--menu-access <keys>', 'Comma-separated menu keys')
    .option('--permissions <json>', 'JSON permissions object')
    .option('--client-access-mode <mode>', 'all|own|specific')
    .option('--allowed-client-ids <ids>', 'Comma-separated client IDs')
    .action(async (id, options) => {
      const body: any = {};
      if (options.role) body.role = options.role;
      if (options.group) body.group = options.group;
      if (options.status) body.status = options.status;
      if (options.menuAccess) body.menuAccess = options.menuAccess.split(',');
      if (options.permissions) { try { body.permissions = JSON.parse(options.permissions); } catch { console.error('Error: Invalid JSON for --permissions.'); return; } }
      if (options.clientAccessMode) body.clientAccessMode = options.clientAccessMode;
      if (options.allowedClientIds) body.allowedClientIds = options.allowedClientIds.split(',');
      formatOutput(await getClient().put(`/users/${id}`, body));
    });

  users.command('delete <id>').description('Remove user').action(async (id) => {
    formatOutput(await getClient().delete(`/users/${id}`));
  });

  users
    .command('provision')
    .description('Full provisioning: Cognito + Company + CompanyUser + API key')
    .requiredOption('-e, --email <email>', 'User email')
    .requiredOption('-p, --password <pwd>', 'Password (min 8 chars)')
    .option('-n, --name <name>', 'Display name')
    .option('--company-name <name>', 'New company name')
    .option('--company-id <id>', 'Existing company ID to join')
    .option('--role <role>', 'Role: owner|admin|member|viewer')
    .option('--group <group>', 'Group: admin|manager|user|viewer')
    .option('--menu-access <keys>', 'Comma-separated menu keys')
    .option('--permissions <json>', 'JSON permissions object')
    .option('--client-access-mode <mode>', 'all|own|specific')
    .option('--allowed-client-ids <ids>', 'Comma-separated client IDs')
    .option('--create-api-key', 'Generate API key', true)
    .option('--no-create-api-key', 'Skip API key generation')
    .option('--api-key-name <name>', 'API key display name')
    .action(async (options) => {
      const body: any = { email: options.email, password: options.password, createApiKey: options.createApiKey };
      if (options.name) body.name = options.name;
      if (options.companyName) body.companyName = options.companyName;
      if (options.companyId) body.company_id = options.companyId;
      if (options.role) body.role = options.role;
      if (options.group) body.group = options.group;
      if (options.menuAccess) body.menuAccess = options.menuAccess.split(',');
      if (options.permissions) { try { body.permissions = JSON.parse(options.permissions); } catch { console.error('Error: Invalid JSON for --permissions.'); return; } }
      if (options.clientAccessMode) body.clientAccessMode = options.clientAccessMode;
      if (options.allowedClientIds) body.allowedClientIds = options.allowedClientIds.split(',');
      if (options.apiKeyName) body.apiKeyName = options.apiKeyName;
      formatOutput(await getClient().post('/users/provision', body));
    });

  users.command('menu-config').description('Get menu keys and group defaults').action(async () => {
    formatOutput(await getClient().get('/users/menu-config'));
  });
}
