import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';

export function registerAuthCommands(program: Command) {
  const auth = program.command('auth').description('Authentication commands');

  auth
    .command('test')
    .description('Verify API key validity and connectivity')
    .action(async () => {
      const client = getClient();
      const response = await client.get('/auth/test');
      formatOutput(response);
    });
}
