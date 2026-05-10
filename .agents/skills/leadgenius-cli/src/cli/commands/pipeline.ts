import { Command } from 'commander';
import { getClient, formatOutput } from '../index.js';

export function registerPipelineCommands(program: Command) {
  program
    .command('pipeline')
    .description('Show pipeline analytics')
    .option('--start <date>', 'Start date (ISO)')
    .option('--end <date>', 'End date (ISO)')
    .action(async (options) => {
      const params = new URLSearchParams();
      if (options.start) params.append('start', options.start);
      if (options.end) params.append('end', options.end);
      formatOutput(await getClient().get(`/pipeline?${params}`));
    });
}
