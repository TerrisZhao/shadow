/**
 * 测试 DeepL 翻译功能
 */

// 加载环境变量
import { config } from "dotenv";
config();

// 验证环境变量
if (!process.env.DEEPL_AUTH_KEY) {
  console.error("❌ 错误：DEEPL_AUTH_KEY 环境变量未设置");
  console.error("\n请检查 .env 文件中是否配置了：");
  console.error("DEEPL_AUTH_KEY=your_deepl_api_key");
  console.error("\n获取 DeepL API 密钥：");
  console.error("1. 访问 https://www.deepl.com/pro-api");
  console.error("2. 注册免费账号");
  console.error("3. 获取 API 密钥");
  process.exit(1);
}

import {
  translateChineseToEnglish,
  translateEnglishToChinese,
  checkUsage,
} from "../lib/translator/deepl";

async function testTranslation() {
  console.log("🧪 测试 DeepL 翻译功能\n");
  console.log("=".repeat(60));

  try {
    // 测试1：中译英（IT 面试题）
    console.log("\n📝 测试1: 中文翻译成英文（IT 面试题）\n");
    
    const chineseQuestions = [
      "在项目中如何利用 Redis 实现分布式 Session？Redis 的主要优势是什么？",
      "在 Redis 中，使用 Hash 代替 String 存储用户信息的好处是什么？",
      "什么是 RESTful API？请解释其主要特点和设计原则。",
    ];

    for (let i = 0; i < chineseQuestions.length; i++) {
      const question = chineseQuestions[i];
      console.log(`测试 ${i + 1}/${chineseQuestions.length}`);
      console.log(`原文: ${question}`);
      console.log("正在翻译...");

      const result = await translateChineseToEnglish(question);
      console.log(`✅ 翻译结果: ${result}\n`);

      // 延迟一下，避免请求过快
      if (i < chineseQuestions.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // 测试2：英译中
    console.log("\n" + "=".repeat(60));
    console.log("\n📝 测试2: 英文翻译成中文\n");

    const englishSentences = [
      "How to implement distributed Session using Redis in projects?",
      "What are the main advantages of using Spring Boot?",
      "Explain the differences between REST and GraphQL.",
    ];

    for (let i = 0; i < englishSentences.length; i++) {
      const sentence = englishSentences[i];
      console.log(`测试 ${i + 1}/${englishSentences.length}`);
      console.log(`原文: ${sentence}`);
      console.log("正在翻译...");

      const result = await translateEnglishToChinese(sentence);
      console.log(`✅ 翻译结果: ${result}\n`);

      // 延迟一下，避免请求过快
      if (i < englishSentences.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // 测试3：检查 API 使用情况
    console.log("\n" + "=".repeat(60));
    console.log("\n📊 API 使用情况\n");

    const usage = await checkUsage();
    
    if (usage.character) {
      const used = usage.character.count;
      const limit = usage.character.limit;
      const percentage = ((used / limit) * 100).toFixed(2);
      
      console.log(`字符数使用情况:`);
      console.log(`  已使用: ${used.toLocaleString()}`);
      console.log(`  总限额: ${limit.toLocaleString()}`);
      console.log(`  使用率: ${percentage}%`);
      console.log(`  剩余额度: ${(limit - used).toLocaleString()}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("\n✅ 所有测试完成！\n");
  } catch (error) {
    console.error("\n❌ 测试失败:", error);
    process.exit(1);
  }
}

testTranslation();
