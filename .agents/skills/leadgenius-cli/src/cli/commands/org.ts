import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';

export function registerOrgCommands(program: Command) {
  const org = program.command('org').description('Organization management commands');

  org.command('list').description('List companies').action(async () => {
    formatOutput(await getClient().get('/companies/manage'));
  });

  org.command('get <id>').description('Get company detail').action(async (id) => {
    formatOutput(await getClient().get(`/companies/manage?id=${id}`));
  });

  org
    .command('create')
    .description('Create company')
    .requiredOption('-n, --name <name>', 'Company name')
    .action(async (options) => {
      formatOutput(await getClient().post('/companies/manage', { name: options.name }));
    });

  org
    .command('rename <id>')
    .description('Rename company')
    .requiredOption('-n, --name <name>', 'New name')
    .action(async (id, options) => {
      formatOutput(await getClient().put('/companies/manage', { id, action: 'rename', name: options.name }));
    });

  org.command('delete <id>').description('Delete company').action(async (id) => {
    formatOutput(await getClient().delete(`/companies/manage?id=${id}`));
  });

  org.command('users <companyId>').description('List company users').action(async (companyId) => {
    formatOutput(await getClient().get(`/companies/manage?id=${companyId}&users=true`));
  });

  org
    .command('add-user <companyId>')
    .description('Add user to company')
    .requiredOption('-e, --email <email>', 'User email')
    .option('--role <role>', 'Role')
    .option('--group <group>', 'Group')
    .action(async (companyId, options) => {
      formatOutput(await getClient().put('/companies/manage', {
        id: companyId, action: 'add-user',
        email: options.email, role: options.role, group: options.group
      }));
    });

  org
    .command('update-user <userId>')
    .description('Update company user')
    .option('--role <role>')
    .option('--group <group>')
    .option('--status <status>')
    .action(async (userId, options) => {
      formatOutput(await getClient().put('/companies/manage', {
        action: 'update-user', userId,
        role: options.role, group: options.group, status: options.status
      }));
    });

  org.command('remove-user <userId>').description('Remove user from company').action(async (userId) => {
    formatOutput(await getClient().put('/companies/manage', { action: 'remove-user', userId }));
  });
}
