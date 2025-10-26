import { analyzeSentence, translateSentence, getLearningAdvice } from "../lib/ai/config";

async function testAI() {
  console.log("🤖 开始测试 AI 功能...\n");

  const testSentence = "The quick brown fox jumps over the lazy dog.";

  try {
    // 测试句子分析
    console.log("📝 测试句子分析...");
    const analysis = await analyzeSentence(testSentence);
    console.log("分析结果:", analysis);
    console.log("\n" + "=".repeat(50) + "\n");

    // 测试翻译
    console.log("🌐 测试翻译功能...");
    const translation = await translateSentence(testSentence);
    console.log("翻译结果:", translation);
    console.log("\n" + "=".repeat(50) + "\n");

    // 测试学习建议
    console.log("💡 测试学习建议...");
    const advice = await getLearningAdvice(testSentence, "intermediate");
    console.log("学习建议:", advice);
    console.log("\n" + "=".repeat(50) + "\n");

    console.log("✅ 所有 AI 功能测试完成！");
  } catch (error) {
    console.error("❌ AI 测试失败:", error);
  }
}

// 检查环境变量
function checkEnv() {
  console.log("🔍 检查环境变量...");
  
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'OPENAI_BASE_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error("❌ 缺少必要的环境变量:");
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.log("\n请确保在 .env 文件中设置了这些变量。");
    return false;
  }

  console.log("✅ 环境变量检查通过");
  return true;
}

// 主函数
async function main() {
  if (!checkEnv()) {
    process.exit(1);
  }

  await testAI();
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

export { testAI, checkEnv };
