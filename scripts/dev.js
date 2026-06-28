const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

function run(name, cwd, args) {
  const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    cwd,
    stdio: 'inherit',
    env: process.env
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = code ?? 0;
    if (code && code !== 0) {
      process.exit(code);
    }
  });

  return child;
}

const server = run('server', path.join(root, 'server'), ['run', 'dev']);
const client = run('client', path.join(root, 'client'), ['run', 'dev']);

function shutdown() {
  server.kill('SIGINT');
  client.kill('SIGINT');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
