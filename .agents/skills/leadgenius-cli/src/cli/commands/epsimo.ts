import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';
import { formatEpsimo } from '../epsimo-fmt.js';

function out(action: string, program: Command) {
  return (res: any) => {
    if (program.opts().format === 'json' && process.argv.includes('--format')) { formatOutput(res); return; }
    formatEpsimo(action, res);
  };
}

export function registerEpsimoCommands(program: Command) {
  const epsimo = program.command('epsimo').description('EpsimoAI commands');

  epsimo
    .command('activate')
    .description('Activate EpsimoAI user')
    .option('-e, --email <email>')
    .option('-p, --password <pwd>')
    .option('--cognito-token <token>', 'Cognito ID token')
    .action(async (options) => {
      const body: any = {};
      if (options.cognitoToken) body.cognitoIdToken = options.cognitoToken;
      else if (options.email && options.password) { body.email = options.email; body.password = options.password; }
      else { console.error('Error: --cognito-token or --email and --password required.'); return; }
      out('activate', program)(await getClient().post('/epsimo/users/activate', body));
    });

  epsimo
    .command('info')
    .description('Get user profile and plan')
    .requiredOption('-t, --token <token>', 'EpsimoAI token')
    .action(async (options) => {
      out('info', program)(await getClient().get('/epsimo/users/info', { extraHeaders: { 'X-Epsimo-Token': options.token } }));
    });

  epsimo
    .command('credits')
    .description('Check credit balance')
    .requiredOption('-t, --token <token>', 'EpsimoAI token')
    .action(async (options) => {
      out('credits', program)(await getClient().get('/epsimo/credits/balance', { extraHeaders: { 'X-Epsimo-Token': options.token } }));
    });

  epsimo
    .command('purchase')
    .description('Purchase credits')
    .requiredOption('-t, --token <token>', 'EpsimoAI token')
    .requiredOption('-a, --amount <n>', 'Credit amount (integer)')
    .action(async (options) => {
      out('purchase', program)(await getClient().post('/epsimo/credits/purchase', { amount: parseInt(options.amount) }, { extraHeaders: { 'X-Epsimo-Token': options.token } }));
    });

  epsimo
    .command('threads')
    .description('Thread usage and percentage')
    .requiredOption('-t, --token <token>', 'EpsimoAI token')
    .action(async (options) => {
      out('threads', program)(await getClient().get('/epsimo/threads', { extraHeaders: { 'X-Epsimo-Token': options.token } }));
    });
}
