import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { postJson } from '@/lib/image-processor/utils/api-client';
import { convertToGeminiInlineData } from '@/lib/image-processor/utils';
import type { QualityReviewResult, QualityReviewResponse } from '@/types/quality-review';

// Gemini 响应类型
interface GeminiTextResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

// 审核 Prompt
const QUALITY_REVIEW_PROMPT = `你是一位专业的产品摄影质量审核专家。请仔细对比以下三张图片：

1. 第一张图：产品原图（需要保持的产品主体）
2. 第二张图：背景参考图（期望的背景风格）
3. 第三张图：AI 生成的结果图

请从以下维度进行评估，每项评分 1-10 分：

## 评估维度

### 1. 产品细节保持 (productDetailScore)
- 产品形状是否完整保持
- 产品比例是否正确
- 产品材质纹理是否清晰
- 产品颜色是否准确
- 产品边缘是否清晰自然

### 2. 纹理一致性 (textureConsistencyScore)
- 产品表面纹理是否与原图一致
- 是否有模糊或失真
- 细节是否丢失

### 3. 背景融合度 (backgroundBlendScore)
- 产品与新背景的融合是否自然
- 光影是否协调
- 透视是否正确
- 是否有明显的边缘瑕疵

## 输出格式

请严格以 JSON 格式输出评估结果，不要有任何其他文字：

{
  "overallScore": 8,
  "productDetailScore": 9,
  "textureConsistencyScore": 7,
  "backgroundBlendScore": 8,
  "issues": [
    "产品边缘有轻微模糊",
    "背景光影与产品不太协调"
  ],
  "strengths": [
    "产品形状保持完整",
    "颜色还原准确"
  ],
  "promptSuggestions": [
    "建议在提示词中强调'保持产品边缘清晰'",
    "可以添加'光影一致'的要求"
  ],
  "recommendSaveAsTemplate": true
}

注意：
- 只输出 JSON，不要有其他文字
- 评分要客观公正
- 建议要具体可操作
- 如果总体评分 >= 8 且没有严重问题，recommendSaveAsTemplate 设为 true`;

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: '请先登录' } as QualityReviewResponse,
        { status: 401 }
      );
    }

    // 获取用户配置
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        geminiApiKey: true,
        geminiBaseUrl: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' } as QualityReviewResponse,
        { status: 404 }
      );
    }

    if (!user.geminiApiKey) {
      return NextResponse.json(
        { success: false, error: '请先在设置页面配置 Gemini API Key' } as QualityReviewResponse,
        { status: 400 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { productImageBase64, referenceImageBase64, resultImageBase64, prompt, processedImageId } = body;

    if (!productImageBase64 || !referenceImageBase64 || !resultImageBase64) {
      return NextResponse.json(
        { success: false, error: '缺少必要的图片数据' } as QualityReviewResponse,
        { status: 400 }
      );
    }

    // 构建 Gemini 请求
    const baseUrl = user.geminiBaseUrl || 'https://yunwu.ai';
    const modelName = 'gemini-2.0-flash';

    const requestBody = {
      contents: [{
        parts: [
          { text: QUALITY_REVIEW_PROMPT },
          { text: `\n\n用户使用的提示词：${prompt || '未提供'}` },
          convertToGeminiInlineData(productImageBase64),
          convertToGeminiInlineData(referenceImageBase64),
          convertToGeminiInlineData(resultImageBase64),
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      }
    };

    const apiUrl = `${baseUrl}/v1beta/models/${modelName}:generateContent`;

    // 调用 Gemini API
    const data: GeminiTextResponse = await postJson(
      apiUrl,
      requestBody,
      { 'x-goog-api-key': user.geminiApiKey },
      { timeout: 60000 }
    );

    // 提取文本响应
    const textContent = data.candidates?.[0]?.content?.parts?.find(
      part => part.text
    )?.text;

    if (!textContent) {
      return NextResponse.json(
        { success: false, error: '未能从 Gemini 获取审核结果' } as QualityReviewResponse,
        { status: 500 }
      );
    }

    // 解析 JSON 响应
    const reviewResult = parseReviewResult(textContent);

    if (!reviewResult) {
      return NextResponse.json(
        { success: false, error: '审核结果解析失败' } as QualityReviewResponse,
        { status: 500 }
      );
    }

    // 添加元数据
    const finalResult: QualityReviewResult = {
      ...reviewResult,
      reviewedAt: new Date().toISOString(),
      reviewModel: modelName,
    };

    // 保存评分到数据库
    if (processedImageId) {
      console.log('[QualityReview API] Saving score to database:', { processedImageId, score: finalResult.overallScore });
      await prisma.processedImage.update({
        where: { id: processedImageId },
        data: {
          qualityScore: finalResult.overallScore,
          qualityReview: JSON.stringify(finalResult),
        },
      });
      console.log('[QualityReview API] Score saved successfully');
    } else {
      console.log('[QualityReview API] No processedImageId provided, skipping database save');
    }

    return NextResponse.json({
      success: true,
      data: finalResult,
    } as QualityReviewResponse);

  } catch (error) {
    console.error('Quality review error:', error);
    const errorMessage = error instanceof Error ? error.message : '审核失败';
    return NextResponse.json(
      { success: false, error: errorMessage } as QualityReviewResponse,
      { status: 500 }
    );
  }
}

/**
 * 解析审核结果 JSON
 */
function parseReviewResult(text: string): Omit<QualityReviewResult, 'reviewedAt' | 'reviewModel'> | null {
  try {
    // 尝试直接解析
    const parsed = JSON.parse(text);
    return validateReviewResult(parsed);
  } catch {
    // 尝试从文本中提取 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return validateReviewResult(parsed);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * 验证并规范化审核结果
 */
function validateReviewResult(data: Record<string, unknown>): Omit<QualityReviewResult, 'reviewedAt' | 'reviewModel'> | null {
  // 确保必要字段存在
  const overallScore = Number(data.overallScore) || 5;
  const productDetailScore = Number(data.productDetailScore) || 5;
  const textureConsistencyScore = Number(data.textureConsistencyScore) || 5;
  const backgroundBlendScore = Number(data.backgroundBlendScore) || 5;

  return {
    overallScore: Math.min(10, Math.max(1, overallScore)),
    productDetailScore: Math.min(10, Math.max(1, productDetailScore)),
    textureConsistencyScore: Math.min(10, Math.max(1, textureConsistencyScore)),
    backgroundBlendScore: Math.min(10, Math.max(1, backgroundBlendScore)),
    issues: Array.isArray(data.issues) ? data.issues.map(String) : [],
    strengths: Array.isArray(data.strengths) ? data.strengths.map(String) : [],
    promptSuggestions: Array.isArray(data.promptSuggestions) ? data.promptSuggestions.map(String) : [],
    recommendSaveAsTemplate: Boolean(data.recommendSaveAsTemplate),
  };
}
