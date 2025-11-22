#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 测试 Gemini API
 */
async function testGeminiAPI() {
  console.log('========== Gemini API 测试 ==========\n');

  // 读取图片文件
  const targetImagePath = path.join(__dirname, 'target.JPG');
  const referenceImagePath = path.join(__dirname, 'reference.jpg');

  if (!fs.existsSync(targetImagePath)) {
    console.error(`❌ 错误: 找不到目标图片 ${targetImagePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(referenceImagePath)) {
    console.error(`❌ 错误: 找不到参考图片 ${referenceImagePath}`);
    process.exit(1);
  }

  console.log(`✓ 找到目标图片: ${targetImagePath}`);
  console.log(`✓ 找到参考图片: ${referenceImagePath}\n`);

  // 读取图片并转换为 base64
  const targetImageBuffer = fs.readFileSync(targetImagePath);
  const targetImageBase64 = targetImageBuffer.toString('base64');
  const targetImageDataUrl = `data:image/jpeg;base64,${targetImageBase64}`;

  const referenceImageBuffer = fs.readFileSync(referenceImagePath);
  const referenceImageBase64 = referenceImageBuffer.toString('base64');
  const referenceImageDataUrl = `data:image/jpeg;base64,${referenceImageBase64}`;

  console.log(`✓ 目标图片大小: ${(targetImageBuffer.length / 1024).toFixed(2)} KB`);
  console.log(`✓ 参考图片大小: ${(referenceImageBuffer.length / 1024).toFixed(2)} KB\n`);

  // 准备请求
  const prompt = `请分析这两张图片：
1. 第一张图片是目标产品图
2. 第二张图片是参考背景图

请根据第一张图片的产品，对第二张图片进行相应的修改和优化。要求：
- 保持产品的形状、材质、特征比例完全一致
- 确保画面清晰呈现所有产品
- 产品的比例要保持一致`;

  const requestBody = {
    originalImageUrl: targetImageDataUrl,
    referenceImageUrl: referenceImageDataUrl,
    prompt: prompt,
    userId: 'test-user-123',
    serverCall: true
  };

  console.log('📤 发送请求到 API...\n');
  console.log('请求参数:');
  console.log(`- 提示词: ${prompt.substring(0, 50)}...`);
  console.log(`- 目标图片大小: ${(targetImageBase64.length / 1024).toFixed(2)} KB`);
  console.log(`- 参考图片大小: ${(referenceImageBase64.length / 1024).toFixed(2)} KB\n`);

  try {
    const response = await fetch('http://localhost:23000/api/gemini/background-replace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`❌ API 返回错误 (${response.status}):`);
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    console.log('✓ API 响应成功\n');

    if (result.success && result.data.imageData) {
      console.log('✅ 测试成功！');
      
      // 保存图片到本地
      const imageData = result.data.imageData;
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const outputPath = './gemini-generated-result.png';
      fs.writeFileSync(outputPath, buffer);
      
      console.log(`\n✓ 图片已保存到: ${outputPath}`);
      console.log(`✓ 图片大小: ${(buffer.length / 1024).toFixed(2)} KB`);
      console.log(`✓ 数据库ID: ${result.data.id}`);
    } else {
      console.log('\n❌ 处理失败');
      console.log('响应内容:');
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('❌ 请求失败:');
    console.error(error.message);
    console.error('\n提示: 确保 Next.js 开发服务器正在运行 (npm run dev)');
    process.exit(1);
  }
}

// 运行测试
testGeminiAPI().catch(error => {
  console.error('❌ 测试出错:', error);
  process.exit(1);
});
