import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      
      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const accessKey = process.env.AccessKey;
const secretKey = process.env.SecretKey;

console.log('=== 火山引擎密钥测试 ===');
console.log('AccessKey:', accessKey);
console.log('SecretKey:', secretKey);
console.log('');
console.log('请确认：');
console.log('1. AccessKey 是否正确（应该以 AKLT 开头）');
console.log('2. SecretKey 是否正确（应该是 Base64 编码的字符串）');
console.log('');
console.log('如果密钥正确，但仍然 Access Denied，可能原因：');
console.log('- 该 Access Key 没有开通智能扩图服务权限');
console.log('- 需要在火山引擎控制台的"访问控制"中为该 Key 添加权限');
console.log('- 或者需要使用主账号的 Access Key');
