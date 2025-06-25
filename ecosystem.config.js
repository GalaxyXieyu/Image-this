const path = require('path');
const fs = require('fs');

// 手动读取 .env 文件
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  const envVars = {};
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        envVars[key] = value;
      }
    });
  }
  
  return envVars;
}

const envVars = loadEnvFile();

module.exports = {
  apps: [
    {
      name: 'imagine-this-nextjs',
      script: '.next/standalone/server.js',
      cwd: './',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 34000,
        ...envVars
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 34000,
        ...envVars
      },
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      max_memory_restart: '1G',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
} 