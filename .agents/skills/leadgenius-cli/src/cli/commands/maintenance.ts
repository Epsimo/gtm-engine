import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';

export function registerMaintenanceCommands(program: Command) {
  const maintenance = program.command('maintenance').description('Maintenance commands');

  const bugs = maintenance.command('bugs').description('Bug reports');

  bugs.command('list').description('List bug reports').action(async () => {
    const c = getClient();
    const res = await c.get('/tables/Maintenance?limit=100');
    if (res.success && Array.isArray(res.data)) {
      res.data = res.data.filter((r: any) => r.type === 'bug');
    }
    formatOutput(res);
  });

  bugs
    .command('report')
    .description('Report a bug')
    .requiredOption('--desc <text>', 'Bug description')
    .option('--email <email>', 'Contact email')
    .action(async (options) => {
      formatOutput(await getClient().post('/tables/Maintenance', {
        type: 'bug',
        description: options.desc,
        userEmail: options.email,
        status: 'open',
      }));
    });

  const enhancements = maintenance.command('enhancements').description('Enhancement requests');

  enhancements.command('list').description('List enhancement requests').action(async () => {
    const c = getClient();
    const res = await c.get('/tables/Maintenance?limit=100');
    if (res.success && Array.isArray(res.data)) {
      res.data = res.data.filter((r: any) => r.type === 'enhancement');
    }
    formatOutput(res);
  });

  enhancements
    .command('request')
    .description('Request enhancement')
    .requiredOption('--desc <text>', 'Enhancement description')
    .option('--email <email>', 'Contact email')
    .action(async (options) => {
      formatOutput(await getClient().post('/tables/Maintenance', {
        type: 'enhancement',
        description: options.desc,
        userEmail: options.email,
        status: 'open',
      }));
    });
}
