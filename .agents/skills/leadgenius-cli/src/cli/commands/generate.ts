import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';
import { resolveClient } from '../client-picker.js';

export function registerGenerateCommands(program: Command) {
  const generate = program.command('generate').description('Lead generation commands');

  generate
    .command('from-icp')
    .description('Generate leads from ICP')
    .requiredOption('--icp <id>', 'ICP ID')
    .option('-c, --client <id>', 'Client ID (prompts if omitted)')
    .option('--max-leads <n>', 'Maximum leads', '100')
    .option('--provider <name>', 'Provider name')
    .action(async (options) => {
      const c = getClient();
      const clientId = await resolveClient(c, options.client);
      if (!clientId) return;
      formatOutput(await c.post('/generate/from-icp', {
        icpId: options.icp, client_id: clientId, maxLeads: parseInt(options.maxLeads), provider: options.provider
      }));
    });

  generate
    .command('direct')
    .description('Direct provider generation')
    .requiredOption('--provider <name>', 'Provider name')
    .requiredOption('--config <json>', 'Provider config JSON')
    .option('-c, --client <id>', 'Client ID (prompts if omitted)')
    .action(async (options) => {
      const c = getClient();
      const clientId = await resolveClient(c, options.client);
      if (!clientId) return;
      let config: any;
      try { config = JSON.parse(options.config); } catch { console.error('Error: Invalid JSON config.'); return; }
      formatOutput(await c.post('/generate/direct', { provider: options.provider, config, client_id: clientId }));
    });

  generate.command('status <runId>').description('Check generation run status').action(async (runId) => {
    formatOutput(await getClient().get(`/generate/${runId}`));
  });

  generate
    .command('history')
    .description('List past runs')
    .option('-c, --client <id>', 'Client ID')
    .option('--icp <id>', 'ICP ID')
    .option('-s, --status <status>')
    .option('-l, --limit <n>', 'Maximum records')
    .action(async (options) => {
      const params = new URLSearchParams();
      if (options.client) params.append('client_id', options.client);
      if (options.icp) params.append('icpId', options.icp);
      if (options.status) params.append('status', options.status);
      if (options.limit) params.append('limit', options.limit);
      formatOutput(await getClient().get(`/generate/history?${params}`));
    });

  const schedule = generate.command('schedule').description('Generation schedules');

  schedule
    .command('create')
    .description('Create schedule')
    .requiredOption('--icp <id>', 'ICP ID')
    .option('-c, --client <id>', 'Client ID (prompts if omitted)')
    .requiredOption('--frequency <f>', 'Frequency: daily|weekly|monthly')
    .option('--max-leads <n>', 'Maximum leads per run', '100')
    .action(async (options) => {
      const c = getClient();
      const clientId = await resolveClient(c, options.client);
      if (!clientId) return;
      formatOutput(await c.post('/generate/schedules', {
        icpId: options.icp, client_id: clientId, frequency: options.frequency, maxLeads: parseInt(options.maxLeads)
      }));
    });

  schedule.command('list').description('List all schedules').action(async () => {
    formatOutput(await getClient().get('/generate/schedules'));
  });

  schedule.command('pause <scheduleId>').description('Pause a schedule').action(async (id) => {
    formatOutput(await getClient().put(`/generate/schedules/${id}`, { status: 'paused' }));
  });

  schedule.command('resume <scheduleId>').description('Resume a schedule').action(async (id) => {
    formatOutput(await getClient().put(`/generate/schedules/${id}`, { status: 'active' }));
  });

  schedule.command('delete <scheduleId>').description('Delete a schedule').action(async (id) => {
    formatOutput(await getClient().delete(`/generate/schedules/${id}`));
  });
}
