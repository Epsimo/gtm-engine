import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';

export function registerWebhooksCommands(program: Command) {
  const webhooks = program.command('webhooks').description('Webhook event commands');

  webhooks
    .command('list')
    .description('List webhook events')
    .option('-p, --platform <name>', 'Filter by platform')
    .option('--event-type <type>', 'Filter by event type')
    .option('-l, --limit <n>', 'Maximum records')
    .action(async (options) => {
      const params = new URLSearchParams();
      if (options.platform) params.append('platform', options.platform);
      if (options.eventType) params.append('eventType', options.eventType);
      if (options.limit) params.append('limit', options.limit);
      formatOutput(await getClient().get(`/webhook-events?${params}`));
    });

  webhooks.command('get <id>').description('Get event detail').action(async (id) => {
    formatOutput(await getClient().get(`/webhook-events/${id}`));
  });

  webhooks.command('reprocess <id>').description('Reprocess a webhook event').action(async (id) => {
    formatOutput(await getClient().post(`/webhook-events/${id}/reprocess`));
  });
}
