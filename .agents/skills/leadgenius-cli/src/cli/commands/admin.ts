import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';

export function registerAdminCommands(program: Command) {
  const admin = program.command('admin').description('Administration commands (requires LGP_ADMIN_KEY)');

  const backup = admin.command('backup').description('Backup management');

  backup
    .command('tables')
    .description('List DynamoDB tables')
    .option('--prefix <p>', 'Filter by prefix')
    .action(async (options) => {
      const params = new URLSearchParams();
      if (options.prefix) params.append('prefix', options.prefix);
      formatOutput(await getClient().get(`/admin/backup/tables?${params}`));
    });

  backup
    .command('create')
    .description('Create on-demand backup')
    .option('--table <name>', 'Table name')
    .option('--all', 'Backup all tables', false)
    .action(async (options) => {
      formatOutput(await getClient().post('/admin/backup/create', { tableName: options.table, all: options.all }));
    });

  backup
    .command('list')
    .description('List existing backups')
    .option('--table <name>', 'Filter by table')
    .option('-s, --status <status>', 'Filter by status')
    .action(async (options) => {
      const params = new URLSearchParams();
      if (options.table) params.append('tableName', options.table);
      if (options.status) params.append('status', options.status);
      formatOutput(await getClient().get(`/admin/backup/list?${params}`));
    });

  backup
    .command('describe')
    .description('Describe a backup')
    .requiredOption('--arn <arn>', 'Backup ARN')
    .action(async (options) => {
      formatOutput(await getClient().get(`/admin/backup/describe?arn=${encodeURIComponent(options.arn)}`));
    });

  backup
    .command('delete')
    .description('Delete a backup')
    .requiredOption('--arn <arn>', 'Backup ARN')
    .action(async (options) => {
      formatOutput(await getClient().delete(`/admin/backup/delete?arn=${encodeURIComponent(options.arn)}`));
    });

  backup
    .command('restore')
    .description('Restore from backup')
    .requiredOption('--arn <arn>', 'Backup ARN')
    .requiredOption('--target-table <name>', 'Target table name')
    .action(async (options) => {
      formatOutput(await getClient().post('/admin/backup/restore', { arn: options.arn, targetTableName: options.targetTable }));
    });

  const pitr = admin.command('pitr').description('Point-in-time recovery');

  pitr
    .command('status')
    .description('Check PITR status')
    .option('--table <name>', 'Table name')
    .action(async (options) => {
      const params = new URLSearchParams();
      if (options.table) params.append('tableName', options.table);
      formatOutput(await getClient().get(`/admin/backup/pitr-status?${params}`));
    });

  pitr
    .command('enable')
    .description('Enable PITR')
    .requiredOption('--table <name>', 'Table name')
    .action(async (options) => {
      formatOutput(await getClient().post('/admin/backup/pitr-enable', { tableName: options.table }));
    });

  pitr
    .command('disable')
    .description('Disable PITR')
    .requiredOption('--table <name>', 'Table name')
    .action(async (options) => {
      formatOutput(await getClient().post('/admin/backup/pitr-disable', { tableName: options.table }));
    });

  admin
    .command('org-tree')
    .description('Display organisation tree')
    .requiredOption('--company <id>', 'Company ID')
    .option('--detailed', 'Show details', false)
    .option('--json', 'JSON output', false)
    .action(async (options) => {
      const params = new URLSearchParams({ detailed: String(options.detailed) });
      if (options.json) params.append('format', 'json');
      formatOutput(await getClient().get(`/admin/companies/${options.company}/org-tree?${params}`));
    });

  const adminCompanies = admin.command('companies').description('Company administration');
  adminCompanies.command('list').description('List all companies').action(async () => {
    formatOutput(await getClient().get('/admin/companies'));
  });
  adminCompanies
    .command('show')
    .description('Show company detail')
    .requiredOption('--id <id>', 'Company ID')
    .action(async (options) => {
      formatOutput(await getClient().get(`/admin/companies/${options.id}`));
    });

  const adminUsers = admin.command('users').description('User administration');
  adminUsers
    .command('list')
    .description('List Cognito users')
    .option('--search <term>', 'Search term')
    .action(async (options) => {
      const params = new URLSearchParams();
      if (options.search) params.append('search', options.search);
      formatOutput(await getClient().get(`/admin/users?${params}`));
    });

  admin.command('views').description('List view configurations').action(async () => {
    formatOutput(await getClient().get('/admin/views'));
  });

  admin.command('clients').description('List all clients across companies').action(async () => {
    formatOutput(await getClient().get('/admin/clients'));
  });
}
