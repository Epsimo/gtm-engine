#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import { ApiClient } from '../core/api.js';
import { loadSession, saveSession, clearSession, sessionSummary, sessionPath } from './session.js';

dotenv.config();

const session = loadSession();
const program = new Command();

program
  .name('lgp')
  .description('LeadGenius Pro Automation CLI')
  .version('2.0.7');

program
  .option('-k, --api-key <key>', 'API key with lgp_ prefix', process.env.LGP_API_KEY || session.apiKey)
  .option('-u, --url <url>', 'Base URL of the LeadGenius API', process.env.LGP_URL || session.baseUrl || 'https://api.leadgenius.app')
  .option('-a, --admin-key <key>', 'Admin key for admin commands', process.env.LGP_ADMIN_KEY || session.adminKey)
  .option('-f, --format <format>', 'Output format: json or table', 'json');

export function getClient(): ApiClient {
  const opts = program.opts();
  if (!opts.apiKey) {
    console.error('Error: API key is required. Use --api-key, LGP_API_KEY, or `lgp config set api-key <key>`.');
    process.exit(1);
  }
  // Save successful connection info to session
  saveSession({ apiKey: opts.apiKey, baseUrl: opts.url, adminKey: opts.adminKey });
  return new ApiClient({
    apiKey: opts.apiKey,
    baseUrl: opts.url,
    adminKey: opts.adminKey
  });
}

import { smartFormat } from './smart-fmt.js';

export function formatOutput(data: any) {
  if (process.argv.includes('--format') && program.opts().format === 'json') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    smartFormat(data);
  }
}

import { registerAuthCommands } from './commands/auth.js';
import { registerLeadsCommands } from './commands/leads.js';
import { registerFsdCommands } from './commands/fsd.js';
import { registerTasksCommands } from './commands/tasks.js';
import { registerTablesCommands } from './commands/tables.js';
import { registerUsersCommands } from './commands/users.js';
import { registerOrgCommands } from './commands/org.js';
import { registerWebhooksCommands } from './commands/webhooks.js';
import { registerCompaniesCommands } from './commands/companies.js';
import { registerEpsimoCommands } from './commands/epsimo.js';
import { registerAdminCommands } from './commands/admin.js';
import { registerMaintenanceCommands } from './commands/maintenance.js';
import { registerPipelineCommands } from './commands/pipeline.js';
import { registerCampaignsCommands } from './commands/campaigns.js';
import { registerClientsCommands } from './commands/clients.js';
import { registerGenerateCommands } from './commands/generate.js';
import { registerSharesCommands } from './commands/shares.js';
import { registerAccountAnalysisCommands } from './commands/account-analysis.js';
import { registerCognitoCommands } from './commands/cognito.js';
import { registerConfigCommands } from './commands/config.js';
import { startTui } from './tui/index.js';

registerAuthCommands(program);
registerLeadsCommands(program);
registerFsdCommands(program);
registerTasksCommands(program);
registerTablesCommands(program);
registerUsersCommands(program);
registerOrgCommands(program);
registerWebhooksCommands(program);
registerCompaniesCommands(program);
registerEpsimoCommands(program);
registerAdminCommands(program);
registerMaintenanceCommands(program);
registerPipelineCommands(program);
registerCampaignsCommands(program);
registerClientsCommands(program);
registerGenerateCommands(program);
registerSharesCommands(program);
registerAccountAnalysisCommands(program);
registerCognitoCommands(program);
registerConfigCommands(program);

program
  .command('tui')
  .description('Launch interactive TUI mode')
  .action(() => startTui());

// Default to TUI when no args
if (process.argv.length <= 2) {
  startTui();
} else {
  program.parse(process.argv);
}
