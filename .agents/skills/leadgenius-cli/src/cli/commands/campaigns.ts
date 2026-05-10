import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';

export function registerCampaignsCommands(program: Command) {
  const campaigns = program.command('campaigns').description('Campaign management');

  campaigns.command('list').description('List all campaigns').action(async () => {
    formatOutput(await getClient().get('/campaigns'));
  });

  campaigns
    .command('create')
    .description('Create campaign')
    .requiredOption('-n, --name <name>', 'Campaign name')
    .option('--type <type>', 'Campaign type', 'abm')
    .action(async (options) => {
      formatOutput(await getClient().post('/campaigns', { name: options.name, type: options.type }));
    });
}
