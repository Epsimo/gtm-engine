import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';
import { resolveClient } from '../client-picker.js';

export function registerFsdCommands(program: Command) {
  const fsd = program.command('fsd').description('FSD Pipeline commands');

  fsd.command('campaigns').description('List FSD campaigns').action(async () => {
    formatOutput(await getClient().get('/fsd/campaigns'));
  });

  fsd.command('campaign <id>').description('Get campaign detail').action(async (id) => {
    formatOutput(await getClient().get(`/fsd/campaigns/${id}`));
  });

  fsd
    .command('create-campaign')
    .description('Create FSD campaign')
    .option('-c, --client <id>', 'Client ID (prompts if omitted)')
    .requiredOption('-n, --name <name>', 'Campaign name')
    .option('--icp <id>', 'ICP ID')
    .option('--frequency <f>', 'Frequency: once|daily|weekly|monthly', 'once')
    .option('--target <n>', 'Target lead count', '100')
    .action(async (options) => {
      const c = getClient();
      const clientId = await resolveClient(c, options.client);
      if (!clientId) return;
      formatOutput(await c.post('/fsd/campaigns', {
        client_id: clientId,
        name: options.name,
        icpId: options.icp,
        frequency: options.frequency,
        targetLeadCount: parseInt(options.target)
      }));
    });

  fsd
    .command('update-campaign <id>')
    .description('Update campaign settings')
    .option('-n, --name <name>')
    .option('--target <n>', 'Target lead count')
    .option('--frequency <f>')
    .action(async (id, options) => {
      const body: any = {};
      if (options.name) body.name = options.name;
      if (options.target) body.targetLeadCount = parseInt(options.target);
      if (options.frequency) body.frequency = options.frequency;
      formatOutput(await getClient().put(`/fsd/campaigns/${id}`, body));
    });

  fsd.command('deactivate-campaign <id>').description('Soft-delete campaign').action(async (id) => {
    formatOutput(await getClient().delete(`/fsd/campaigns/${id}`));
  });

  fsd
    .command('run')
    .description('Start pipeline run')
    .option('-c, --client <id>', 'Client ID (prompts if omitted)')
    .option('--icp <id>', 'ICP ID')
    .option('--actor <id>', 'Apify actor ID')
    .option('--input <json>', 'Apify input JSON')
    .option('--target <n>', 'Target lead count', '100')
    .option('--enrich', 'Auto-enrich', false)
    .option('--score', 'Auto-score', false)
    .action(async (options) => {
      const c = getClient();
      const clientId = await resolveClient(c, options.client);
      if (!clientId) return;
      const body: any = {
        client_id: clientId,
        targetLeadCount: parseInt(options.target),
        enrichAfterGeneration: options.enrich,
        scoreAfterEnrichment: options.score
      };
      if (options.icp) body.icpId = options.icp;
      if (options.actor) body.apifyActorId = options.actor;
      if (options.input) { try { body.apifyInput = JSON.parse(options.input); } catch { console.error('Error: Invalid JSON for --input.'); return; } }
      formatOutput(await c.post('/fsd/run', body));
    });

  fsd.command('status <pipelineId>').description('Get pipeline status').action(async (id) => {
    formatOutput(await getClient().get(`/fsd/run/${id}`));
  });
}
