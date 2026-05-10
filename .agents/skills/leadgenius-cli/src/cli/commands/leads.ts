import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';
import { resolveClient } from '../client-picker.js';
import { smartSearch } from '../smart-search.js';
import { readFileSync } from 'fs';

export function registerLeadsCommands(program: Command) {
  const leads = program.command('leads').description('Lead management commands');

  leads
    .command('list')
    .description('List leads for a specific client')
    .option('-c, --client <id>', 'Client ID (prompts if omitted)')
    .option('-l, --limit <n>', 'Maximum records', '50')
    .option('-t, --next-token <token>', 'Pagination token')
    .option('-f, --fields <fields>', 'Comma-separated fields')
    .action(async (options) => {
      const client = getClient();
      const clientId = await resolveClient(client, options.client);
      if (!clientId) return;
      const params = new URLSearchParams({ client_id: clientId, limit: options.limit });
      if (options.nextToken) params.append('nextToken', options.nextToken);
      if (options.fields) params.append('fields', options.fields);
      formatOutput(await client.get(`/leads?${params}`));
    });

  leads.command('get <id>').description('Retrieve lead detail').action(async (id) => {
    formatOutput(await getClient().get(`/leads/${id}`));
  });

  leads
    .command('import')
    .description('Import leads from CSV, JSON file, or inline JSON')
    .option('--file <path>', 'CSV or JSON file path')
    .option('--data <json>', 'Inline JSON data')
    .option('-c, --client <id>', 'Client ID (prompts if omitted, required for CSV)')
    .option('--strict', 'Reject on duplicates', false)
    .action(async (options) => {
      const c = getClient();
      let body: any;
      if (options.file) {
        const content = readFileSync(options.file, 'utf-8');
        if (options.file.endsWith('.csv')) {
          const { parseCsv } = await import('../csv-parser.js');
          const leads = parseCsv(content);
          if (leads.length === 0) { console.error('Error: No leads found in CSV.'); return; }
          const clientId = await resolveClient(c, options.client);
          if (!clientId) return;
          leads.forEach(l => l.client_id = clientId);
          console.log(`  Importing ${leads.length} leads from CSV...`);
          body = { leads, strictMode: options.strict };
        } else {
          try { body = JSON.parse(content); } catch (e: any) { console.error('Error: Invalid JSON. ' + e.message); return; }
        }
      } else if (options.data) {
        try { body = JSON.parse(options.data); } catch (e: any) { console.error('Error: Invalid JSON. ' + e.message); return; }
      } else { console.error('Error: --file or --data required.'); return; }
      formatOutput(await c.post('/leads/import', body));
    });

  leads
    .command('search')
    .description('Search leads (smart: auto-detects email, name, or URL)')
    .option('-q, --query <text>', 'Smart search: email, "First Last", or URL')
    .option('--email <email>')
    .option('--first-name <name>')
    .option('--last-name <name>')
    .option('--company-url <url>')
    .option('--linkedin-url <url>')
    .option('--client <id>')
    .action(async (options) => {
      const c = getClient();
      const extra: Record<string, string> = {};
      if (options.client) extra.client_id = options.client;

      if (options.query) {
        formatOutput(await smartSearch(c, options.query, extra));
      } else {
        // Explicit flags
        const params = new URLSearchParams(extra);
        if (options.email) params.append('email', options.email);
        if (options.firstName) params.append('firstName', options.firstName);
        if (options.lastName && options.firstName) params.append('lastName', options.lastName);
        else if (options.lastName) params.append('firstName', options.lastName);
        if (options.companyUrl) params.append('companyUrl', options.companyUrl);
        if (options.linkedinUrl) params.append('linkedinUrl', options.linkedinUrl);
        formatOutput(await c.get(`/leads/search?${params}`));
      }
    });

  leads
    .command('dedup')
    .description('Find duplicate groups')
    .option('-c, --client <id>', 'Client ID (prompts if omitted)')
    .requiredOption('-m, --match <fields>', 'Match fields (comma-separated)')
    .action(async (options) => {
      const client = getClient();
      const clientId = await resolveClient(client, options.client);
      if (!clientId) return;
      formatOutput(await client.post('/leads/deduplicate', { client_id: clientId, matchFields: options.match.split(',') }));
    });

  leads
    .command('dedup-resolve')
    .description('Merge duplicates into keep lead')
    .requiredOption('--keep <id>', 'Lead ID to keep')
    .requiredOption('--merge <ids>', 'Comma-separated lead IDs to merge')
    .action(async (options) => {
      formatOutput(await getClient().post('/leads/deduplicate/resolve', { keepLeadId: options.keep, mergeLeadIds: options.merge.split(',') }));
    });

  leads
    .command('transfer')
    .description('Transfer leads between clients')
    .requiredOption('--from <id>', 'Source client ID')
    .requiredOption('--to <id>', 'Target client ID')
    .option('--all', 'Transfer all leads', false)
    .option('--dry-run', 'Preview only', false)
    .action(async (options) => {
      formatOutput(await getClient().post('/leads/transfer', { fromClientId: options.from, toClientId: options.to, all: options.all, dryRun: options.dryRun }));
    });

  leads
    .command('activity <leadId>')
    .description('Log engagement activity')
    .requiredOption('-t, --type <type>', 'Activity type')
    .option('--notes <text>', 'Activity notes')
    .option('--metadata <json>', 'JSON metadata')
    .action(async (leadId, options) => {
      const body: any = { type: options.type };
      if (options.notes) body.notes = options.notes;
      if (options.metadata) { try { body.metadata = JSON.parse(options.metadata); } catch { console.error('Error: Invalid JSON metadata.'); return; } }
      formatOutput(await getClient().post(`/leads/${leadId}/activities`, body));
    });

  leads.command('activities <leadId>').description('Get engagement history').action(async (leadId) => {
    formatOutput(await getClient().get(`/leads/${leadId}/activities`));
  });

  leads.command('validate-ownership').description('Scan for ownership issues').action(async () => {
    formatOutput(await getClient().post('/leads/validate-ownership'));
  });

  leads
    .command('update-batch')
    .description('Batch update leads from CSV')
    .option('--client-id <id>', 'Client ID (prompts if omitted)')
    .requiredOption('--field <f>', 'Field to update')
    .requiredOption('--csv <path>', 'CSV file path')
    .action(async (options) => {
      const client = getClient();
      const clientId = await resolveClient(client, options.clientId);
      if (!clientId) return;
      let csvData: string;
      try { csvData = readFileSync(options.csv, 'utf-8'); } catch (e: any) { console.error('Error reading CSV: ' + e.message); return; }
      formatOutput(await client.post('/leads/update-batch', { client_id: clientId, field: options.field, csvData }));
    });

  leads
    .command('prune-blanks')
    .description('Remove blank leads')
    .option('--client-id <id>', 'Client ID (prompts if omitted)')
    .option('--dry-run', 'Preview only', false)
    .action(async (options) => {
      const client = getClient();
      const clientId = await resolveClient(client, options.clientId);
      if (!clientId) return;
      formatOutput(await client.post('/leads/prune-blanks', { client_id: clientId, dryRun: options.dryRun }));
    });
}
