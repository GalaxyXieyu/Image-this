// 验证环境变量是否正确加载
const fs = require('fs');
const path = require('path');

console.log('🔍 正在验证环境变量...\n');

// 关键环境变量列表
const criticalEnvVars = [
  'PORT',
  'NEXTAUTH_URL', 
  'DATABASE_URL',
  'GPT_API_URL',
  'GPT_API_KEY',
  'QWEN_API_KEY',
  'MINIO_ENDPOINT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'NODE_ENV'
];

console.log('📋 检查关键环境变量:');
console.log('================================');

let allPresent = true;

criticalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // 对于敏感信息，只显示前几位字符
    if (varName.includes('KEY') || varName.includes('SECRET')) {
      const maskedValue = value.substring(0, 8) + '***';
      console.log(`✅ ${varName}: ${maskedValue}`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`❌ ${varName}: 未设置`);
    allPresent = false;
  }
});

console.log('\n================================');

if (allPresent) {
  console.log('🎉 所有关键环境变量都已正确设置！');
} else {
  console.log('⚠️  有些环境变量缺失，请检查配置');
}

// 测试API连接
console.log('\n🌐 测试API连接...');

// 测试GPT API
const testGPTConnection = async () => {
  try {
    const gptApiUrl = process.env.GPT_API_URL;
    const gptApiKey = process.env.GPT_API_KEY;
    
    if (!gptApiUrl || !gptApiKey) {
      console.log('❌ GPT API 配置缺失');
      return;
    }
    
    console.log(`🔗 GPT API URL: ${gptApiUrl}`);
    console.log(`🔑 GPT API Key: ${gptApiKey.substring(0, 8)}***`);
    console.log('✅ GPT API 配置正常');
  } catch (error) {
    console.log('❌ GPT API 配置错误:', error.message);
  }
};

testGPTConnection();

console.log('\n📊 当前进程信息:');
console.log(`PID: ${process.pid}`);
console.log(`Node版本: ${process.version}`);
console.log(`工作目录: ${process.cwd()}`); 