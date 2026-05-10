import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';

export function registerSharesCommands(program: Command) {
  const shares = program.command('shares').description('Shared link management');

  shares
    .command('list')
    .description('List shared links')
    .option('-s, --status <status>')
    .option('-c, --client <id>')
    .action(async (options) => {
      const params = new URLSearchParams();
      if (options.status) params.append('status', options.status);
      if (options.client) params.append('client_id', options.client);
      formatOutput(await getClient().get(`/shares?${params}`));
    });

  shares.command('get <id>').description('Get shared link detail').action(async (id) => {
    formatOutput(await getClient().get(`/shares/${id}`));
  });

  shares
    .command('create')
    .description('Create shared link')
    .option('--view-type <type>', 'View type')
    .option('--days <n>', 'Expiration days')
    .option('--allow-edit', 'Allow editing', false)
    .action(async (options) => {
      const body: any = { allowEdit: options.allowEdit };
      if (options.viewType) body.viewType = options.viewType;
      if (options.days) body.expirationDays = parseInt(options.days);
      formatOutput(await getClient().post('/shares', body));
    });

  shares
    .command('extend <id>')
    .description('Extend expiration')
    .requiredOption('--days <n>', 'Additional days')
    .action(async (id, options) => {
      formatOutput(await getClient().put(`/shares/${id}`, { action: 'extend', days: parseInt(options.days) }));
    });

  shares
    .command('set-expiry <id>')
    .description('Set explicit expiration')
    .requiredOption('--date <iso>', 'ISO date')
    .action(async (id, options) => {
      formatOutput(await getClient().put(`/shares/${id}`, { action: 'set-expiry', expiresAt: options.date }));
    });

  shares.command('revoke <id>').description('Revoke shared link').action(async (id) => {
    formatOutput(await getClient().put(`/shares/${id}`, { action: 'revoke' }));
  });

  shares
    .command('reactivate <id>')
    .description('Re-enable revoked link')
    .option('--days <n>', 'New expiration days')
    .action(async (id, options) => {
      const body: any = { action: 'reactivate' };
      if (options.days) body.days = parseInt(options.days);
      formatOutput(await getClient().put(`/shares/${id}`, body));
    });
}
