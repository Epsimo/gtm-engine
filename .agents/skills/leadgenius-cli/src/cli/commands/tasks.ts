import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';

export function registerTasksCommands(program: Command) {
  const tasks = program.command('tasks').description('Background task commands');

  tasks
    .command('list')
    .description('List background jobs')
    .option('-s, --status <status>', 'Filter by status')
    .option('-t, --type <type>', 'Filter by type')
    .option('-l, --limit <n>', 'Maximum records')
    .action(async (options) => {
      const params = new URLSearchParams();
      if (options.status) params.append('status', options.status);
      if (options.type) params.append('type', options.type);
      if (options.limit) params.append('limit', options.limit);
      formatOutput(await getClient().get(`/tasks?${params}`));
    });

  tasks.command('status <jobId>').description('Get job status').action(async (id) => {
    formatOutput(await getClient().get(`/tasks/${id}`));
  });

  tasks
    .command('enrich')
    .description('Trigger lead enrichment')
    .requiredOption('--lead <id>', 'Lead ID')
    .option('--services <list>', 'Comma-separated services')
    .action(async (options) => {
      formatOutput(await getClient().post('/tasks/enrich', {
        leadId: options.lead,
        services: options.services?.split(',')
      }));
    });

  tasks
    .command('copyright')
    .description('Trigger AI content generation')
    .requiredOption('--lead <id>', 'Lead ID')
    .option('--processes <list>', 'Comma-separated processes')
    .action(async (options) => {
      formatOutput(await getClient().post('/tasks/copyright', {
        leadId: options.lead,
        processes: options.processes?.split(',')
      }));
    });

  tasks
    .command('score')
    .description('Trigger SDR AI scoring')
    .requiredOption('--lead <id>', 'Lead ID (or comma-separated for batch)')
    .option('--fields <list>', 'Comma-separated scoring fields')
    .action(async (options) => {
      const leadIds = options.lead.split(',');
      const body: any = leadIds.length === 1 ? { leadId: leadIds[0] } : { leadIds };
      if (options.fields) body.fields = options.fields.split(',');
      formatOutput(await getClient().post('/tasks/score', body));
    });
}
