const { spawn } = require('child_process');
const path = require('path');

const SERVICES = [
  ['gateway', 3100],
  ['auth-service', 3101],
  ['user-service', 3102],
  ['student-service', 3103],
  ['teacher-service', 3104],
  ['course-service', 3105],
  ['group-service', 3106],
  ['schedule-service', 3107],
  ['attendance-service', 3108],
  ['payment-service', 3109],
  ['notification-service', 3110],
  ['report-service', 3111],
  ['file-service', 3112],
];

const only = process.argv.slice(2);
const selected = only.length ? SERVICES.filter(([name]) => only.includes(name)) : SERVICES;
const children = [];

for (const [name, healthPort] of selected) {
  const entry = path.join('apps', name, 'src', 'main.ts');
  const child = spawn(process.execPath, ['./node_modules/ts-node/dist/bin.js', '-r', 'tsconfig-paths/register', entry], {
    cwd: __dirname + '/..',
    env: { ...process.env, HEALTH_PORT: String(healthPort), SERVICE_NAME: name },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const prefix = `[${name}]`.padEnd(24);
  child.stdout.on('data', (chunk) => process.stdout.write(`${prefix} ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`${prefix} ${chunk}`));
  child.on('exit', (code) => process.stdout.write(`${prefix} exited with code ${code}\n`));
  children.push(child);
}

const shutdown = () => {
  for (const child of children) {
    child.kill('SIGTERM');
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
