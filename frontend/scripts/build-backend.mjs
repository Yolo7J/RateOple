import { cp, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDir, '..');
const distDir = resolve(frontendRoot, 'dist');
const backendWwwroot = resolve(frontendRoot, '..', 'backend', 'RateOple', 'wwwroot');

function run(command, args, options) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

await run('npx', ['vite', 'build'], { cwd: frontendRoot });
await rm(backendWwwroot, { recursive: true, force: true });
await cp(distDir, backendWwwroot, { recursive: true });

console.log(`Copied Vite build output to ${backendWwwroot}`);
