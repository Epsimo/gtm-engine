import { Command } from 'commander';
import { loadSession, saveSession, clearSession, sessionSummary, sessionPath } from '../session.js';
import { smartFormat } from '../smart-fmt.js';

export function registerConfigCommands(program: Command) {
  const config = program.command('config').description('Manage saved credentials and session');

  config
    .command('show')
    .description('Show saved session (tokens masked)')
    .action(() => {
      const summary = sessionSummary();
      if (Object.keys(summary).length === 0) {
        console.log('\n  \x1b[90mNo saved session. Run any command to auto-save, or use `lgp config set`.\x1b[0m\n');
        return;
      }
      console.log(`\n  \x1b[1mSaved Session\x1b[0m  \x1b[90m${sessionPath()}\x1b[0m\n`);
      const maxK = Math.max(...Object.keys(summary).map(k => k.length));
      for (const [k, v] of Object.entries(summary)) {
        console.log(`  ${k.padEnd(maxK)}  ${v}`);
      }
      console.log();
    });

  config
    .command('set <key> <value>')
    .description('Save a value (api-key, url, admin-key, epsimo-token, ...)')
    .action((key, value) => {
      const keyMap: Record<string, string> = {
        'api-key': 'apiKey', 'url': 'baseUrl', 'admin-key': 'adminKey',
        'epsimo-token': 'epsimoToken', 'company-id': 'companyId',
      };
      const mapped = keyMap[key] || key;
      saveSession({ [mapped]: value });
      console.log(`\n  \x1b[32m✓\x1b[0m Saved ${key}\n`);
    });

  config
    .command('get <key>')
    .description('Get a saved value')
    .action((key) => {
      const keyMap: Record<string, string> = {
        'api-key': 'apiKey', 'url': 'baseUrl', 'admin-key': 'adminKey',
        'epsimo-token': 'epsimoToken', 'company-id': 'companyId',
      };
      const mapped = keyMap[key] || key;
      const val = loadSession()[mapped];
      if (val) console.log(val);
      else console.log(`\n  \x1b[90mNot set\x1b[0m\n`);
    });

  config
    .command('reset')
    .description('Clear all saved credentials and session data')
    .action(() => {
      clearSession();
      console.log('\n  \x1b[32m✓\x1b[0m Session cleared\n');
    });
}
