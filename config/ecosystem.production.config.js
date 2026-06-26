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

// 该文件位于 <release>/config/，运行时 cwd 指向 release 根。
const releaseRoot = path.resolve(__dirname, '..');
const envVars = {
  ...readEnvFile(path.join(releaseRoot, '.env.production')),
  ...readEnvFile(path.join(releaseRoot, '.env')),
};
if (!envVars.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET) {
  envVars.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
}
if (!envVars.NEXTAUTH_URL && process.env.NEXTAUTH_URL) {
  envVars.NEXTAUTH_URL = process.env.NEXTAUTH_URL;
}

const appName = process.env.PM_APP_NAME || 'imagine-this-web';
const port = process.env.PORT || envVars.PORT || '34123';

module.exports = {
  apps: [
    {
      name: appName,
      cwd: releaseRoot,
      script: 'node_modules/next/dist/bin/next',
      args: ['start', '-p', String(port)],
      instances: 1,
      exec_mode: 'fork',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: String(port),
        // SQLite path is resolved relative to prisma/schema.prisma, so use
        // ../data/app.db so prisma resolves it to <release>/data/app.db
        // which is symlinked to shared/data/app.db (persistent across deploys).
        DATABASE_URL: 'file:../data/app.db',
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
