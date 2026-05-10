import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';

export function registerCognitoCommands(program: Command) {
  const cognito = program.command('cognito').description('Cognito user pool commands');

  cognito
    .command('list')
    .description('List Cognito users (requires admin key)')
    .option('-l, --limit <n>', 'Maximum users (max 60)', '20')
    .action(async (options) => {
      formatOutput(await getClient().get(`/users/cognito?limit=${options.limit}`));
    });

  cognito
    .command('get')
    .description('Get Cognito user by email')
    .requiredOption('-e, --email <email>', 'User email')
    .action(async (options) => {
      formatOutput(await getClient().get(`/users/cognito?email=${encodeURIComponent(options.email)}`));
    });

  cognito
    .command('create')
    .description('Create Cognito user with permanent password')
    .requiredOption('-e, --email <email>', 'User email')
    .requiredOption('-p, --password <pwd>', 'Password (min 8 chars)')
    .option('-n, --name <name>', 'Display name')
    .action(async (options) => {
      const body: any = { email: options.email, password: options.password };
      if (options.name) body.name = options.name;
      formatOutput(await getClient().post('/users/cognito', body));
    });

  cognito
    .command('enable')
    .description('Enable a Cognito user')
    .requiredOption('-e, --email <email>', 'User email')
    .action(async (options) => {
      formatOutput(await getClient().put('/users/cognito', { email: options.email, action: 'enable' }));
    });

  cognito
    .command('disable')
    .description('Disable a Cognito user')
    .requiredOption('-e, --email <email>', 'User email')
    .action(async (options) => {
      formatOutput(await getClient().put('/users/cognito', { email: options.email, action: 'disable' }));
    });

  cognito
    .command('set-password')
    .description('Set a new password for a Cognito user')
    .requiredOption('-e, --email <email>', 'User email')
    .requiredOption('-p, --password <pwd>', 'New password')
    .action(async (options) => {
      formatOutput(await getClient().put('/users/cognito', { email: options.email, action: 'set-password', password: options.password }));
    });

  cognito
    .command('set-attributes')
    .description('Set custom attributes on a Cognito user')
    .requiredOption('-e, --email <email>', 'User email')
    .requiredOption('--attributes <json>', 'JSON object of attributes')
    .action(async (options) => {
      let attributes: any;
      try { attributes = JSON.parse(options.attributes); } catch { console.error('Error: Invalid JSON for --attributes.'); return; }
      formatOutput(await getClient().put('/users/cognito', { email: options.email, action: 'set-attributes', attributes }));
    });
}
