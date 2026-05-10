import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';

export function registerTablesCommands(program: Command) {
  const tables = program.command('tables').description('Generic table CRUD commands');

  tables
    .command('list <tableName>')
    .description('List records from a table')
    .option('-l, --limit <n>', 'Maximum records', '50')
    .action(async (tableName, options) => {
      const client = getClient();
      const response = await client.get(`/tables/${tableName}?limit=${options.limit}`);
      formatOutput(response);
    });

  tables
    .command('get <tableName> <id>')
    .description('Get record by ID')
    .action(async (tableName, id) => {
      const client = getClient();
      const response = await client.get(`/tables/${tableName}/${id}`);
      formatOutput(response);
    });

  tables
    .command('create <tableName>')
    .description('Create a new record')
    .requiredOption('-d, --data <json>', 'JSON data for the record')
    .action(async (tableName, options) => {
      const client = getClient();
      try {
        const body = JSON.parse(options.data);
        const response = await client.post(`/tables/${tableName}`, body);
        formatOutput(response);
      } catch (e: any) {
        console.error('Error: Invalid JSON data. ' + e.message);
      }
    });

  tables
    .command('update <tableName> <id>')
    .description('Update an existing record')
    .requiredOption('-d, --data <json>', 'JSON fields to update')
    .action(async (tableName, id, options) => {
      const client = getClient();
      try {
        const body = JSON.parse(options.data);
        const response = await client.put(`/tables/${tableName}/${id}`, body);
        formatOutput(response);
      } catch (e: any) {
        console.error('Error: Invalid JSON data. ' + e.message);
      }
    });

  tables
    .command('delete <tableName> <id>')
    .description('Delete a record')
    .action(async (tableName, id) => {
      const client = getClient();
      const response = await client.delete(`/tables/${tableName}/${id}`);
      formatOutput(response);
    });
}
