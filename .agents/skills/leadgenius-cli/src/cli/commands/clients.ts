import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';

export function registerClientsCommands(program: Command) {
  const clients = program.command('clients').description('Client management');

  clients.command('list').description('List all clients').action(async () => {
    formatOutput(await getClient().get('/clients'));
  });

  clients
    .command('create')
    .description('Create a new client')
    .requiredOption('-n, --name <name>', 'Client name')
    .option('--url <url>', 'Client URL')
    .action(async (options) => {
      formatOutput(await getClient().post('/clients', { name: options.name, url: options.url }));
    });
}
