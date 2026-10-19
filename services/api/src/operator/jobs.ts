import { runJobsCommand } from './jobs/run';

void runJobsCommand(process.argv.slice(2), process.env, {
  out: (text) => console.log(text),
  error: (text) => console.error(text),
}).then((code) => {
  process.exitCode = code;
});
