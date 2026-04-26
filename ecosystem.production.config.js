const path = require('path');
const fs = require('fs');

function readEnvFile(filePath) {
  const envVars = {};

  if (!fs.existsSync(filePath)) {
    return envVars;
  }

  const envContent = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of envContent.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [key, ...valueParts] = line.split('=');
    envVars[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
  }

  return envVars;
}

const cwd = __dirname;
const envVars = {
  ...readEnvFile(path.join(cwd, '.env')),
  ...readEnvFile(path.join(cwd, '.env.production')),
};

module.exports = {
  apps: [
    {
      name: 'imagine-this-web',
      cwd,
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 34123,
        DATABASE_URL: 'file:./data/app.db',
        ...envVars,
      },
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      max_memory_restart: '1G',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
