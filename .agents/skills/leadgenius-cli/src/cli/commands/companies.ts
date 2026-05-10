import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';
import { resolveClient } from '../client-picker.js';

export function registerCompaniesCommands(program: Command) {
  const companies = program.command('companies').description('Territory company commands');

  companies
    .command('list')
    .description('List territory companies')
    .option('-c, --client <id>', 'Client ID (prompts if omitted)')
    .option('--sort <field>', 'Sort field')
    .option('-l, --limit <n>', 'Maximum records')
    .action(async (options) => {
      const c = getClient();
      const clientId = await resolveClient(c, options.client);
      if (!clientId) return;
      const params = new URLSearchParams({ client_id: clientId });
      if (options.sort) params.append('sort', options.sort);
      if (options.limit) params.append('limit', options.limit);
      formatOutput(await c.get(`/companies?${params}`));
    });

  companies.command('get <id>').description('Get company detail').action(async (id) => {
    formatOutput(await getClient().get(`/companies/${id}`));
  });

  companies.command('leads <id>').description('List company leads').action(async (id) => {
    formatOutput(await getClient().get(`/companies/${id}/leads`));
  });

  companies.command('content-analysis <id>').description('Re-run content analysis').action(async (id) => {
    formatOutput(await getClient().post(`/companies/${id}/content-analysis`));
  });

  companies
    .command('aggregate')
    .description('Aggregate leads into TerritoryCompany records')
    .option('-c, --client <id>', 'Client ID (prompts if omitted)')
    .action(async (options) => {
      const c = getClient();
      const clientId = await resolveClient(c, options.client);
      if (!clientId) return;
      formatOutput(await c.post('/companies/aggregate', { client_id: clientId }));
    });

  const events = companies.command('events').description('Company events');

  events
    .command('list')
    .description('List company events')
    .option('-c, --client <id>', 'Client ID')
    .action(async (options) => {
      const params = new URLSearchParams();
      if (options.client) params.append('client_id', options.client);
      formatOutput(await getClient().get(`/companies/events?${params}`));
    });

  events
    .command('create')
    .description('Create manual event')
    .requiredOption('--company-id <id>', 'Company ID')
    .requiredOption('--type <type>', 'Event type')
    .option('--description <text>')
    .action(async (options) => {
      formatOutput(await getClient().post('/companies/events', {
        companyId: options.companyId, type: options.type, description: options.description
      }));
    });

  events
    .command('generate')
    .description('Auto-generate events from lead activity')
    .option('-c, --client <id>', 'Client ID (prompts if omitted)')
    .action(async (options) => {
      formatOutput(await getClient().post('/companies/events/generate', { client_id: await resolveClient(getClient(), options.client) || '' }));
    });

  events.command('radar').description('Radar dashboard summary').action(async () => {
    formatOutput(await getClient().get('/companies/events/radar'));
  });
}
