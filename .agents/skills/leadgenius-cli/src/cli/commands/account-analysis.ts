import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';
import { resolveClient } from '../client-picker.js';

export function registerAccountAnalysisCommands(program: Command) {
  const aa = program.command('account-analysis').description('Account analysis commands');

  aa
    .command('list')
    .description('List company groups')
    .option('-c, --client <id>', 'Client ID (prompts if omitted)')
    .option('--sort <field>', 'Sort field')
    .option('--min-leads <n>', 'Minimum leads filter')
    .action(async (options) => {
      const c = getClient();
      const clientId = await resolveClient(c, options.client);
      if (!clientId) return;
      const params = new URLSearchParams({ client_id: clientId });
      if (options.sort) params.append('sort', options.sort);
      if (options.minLeads) params.append('minLeads', options.minLeads);
      formatOutput(await c.get(`/account-analysis?${params}`));
    });

  aa
    .command('analyze')
    .description('Detailed metrics')
    .option('-c, --client <id>', 'Client ID (prompts if omitted)')
    .option('--company <name>', 'Company name filter')
    .action(async (options) => {
      const c = getClient();
      const clientId = await resolveClient(c, options.client);
      if (!clientId) return;
      const params = new URLSearchParams({ client_id: clientId });
      if (options.company) params.append('company', options.company);
      formatOutput(await c.get(`/account-analysis/analyze?${params}`));
    });

  aa
    .command('export')
    .description('Export to CSV/JSON')
    .option('-c, --client <id>', 'Client ID (prompts if omitted)')
    .requiredOption('--format <fmt>', 'Format: csv|json')
    .option('--output <path>', 'Output file path')
    .action(async (options) => {
      const c = getClient();
      const clientId = await resolveClient(c, options.client);
      if (!clientId) return;
      const params = new URLSearchParams({ client_id: clientId, format: options.format });
      const response = await c.get(`/account-analysis/export?${params}`);
      if (options.output && response.success && response.data) {
        const { writeFileSync } = await import('fs');
        writeFileSync(options.output, typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2));
        console.log(`Exported to ${options.output}`);
      } else {
        formatOutput(response);
      }
    });

  aa
    .command('cache-clear')
    .description('Clear local cache')
    .option('-c, --client <id>', 'Client ID')
    .action(async (options) => {
      const body: any = {};
      if (options.client) body.client_id = options.client;
      formatOutput(await getClient().post('/account-analysis/cache-clear', body));
    });
}
