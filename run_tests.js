const { spawnSync } = require('node:child_process');

const result = spawnSync(process.execPath, ['--test', 'tests/*.test.js'], {
  stdio: 'inherit',
  shell: true,
});

process.exitCode = result.status ?? 1;
