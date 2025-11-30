#!/usr/bin/env tsx

// 手动加载 .env 文件 - 必须在导入其他模块之前执行
import { readFileSync } from "fs";
import { join } from "path";

// 解析并加载环境变量
try {
  const envPath = join(process.cwd(), ".env");
  const envContent = readFileSync(envPath, "utf-8");
  let loadedCount = 0;
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...values] = trimmed.split("=");
      if (key && values.length > 0) {
        const value = values.join("=").trim();
        process.env[key.trim()] = value;
        if (key.trim().startsWith("AZURE_OPENAI")) {
          loadedCount++;
          console.log(`✓ 已加载: ${key.trim()} = ${value.substring(0, 20)}...`);
        }
      }
    }
  });
  console.log(`✅ 成功加载 ${loadedCount} 个 Azure OpenAI 环境变量\n`);
} catch (error) {
  console.warn("⚠️  无法加载 .env 文件，将使用系统环境变量");
  console.error(error);
}

// 在环境变量加载之后再导入配置和服务模块
import { getAzureOpenAIConfig } from "../lib/ai/config";
import {
  analyzeSentence,
  translateSentence,
  getLearningAdvice,
  sendMessage,
} from "../lib/ai/services";

// 测试用的英语句子
const testSentence = "The quick brown fox jumps over the lazy dog.";

async function testAzureOpenAI() {
  console.log("🚀 开始测试 Azure OpenAI 配置...\n");

  // 显示配置信息
  const config = getAzureOpenAIConfig();
  console.log("📋 配置信息:");
  console.log(`  端点: ${config.endpoint}`);
  console.log(`  部署: ${config.deployment}`);
  console.log(`  API版本: ${config.apiVersion}`);
  console.log(`  API密钥: ${config.apiKey ? "已配置 ✓" : "未配置 ✗"}`);
  console.log();

  try {
    // 测试 1: 简单消息测试
    console.log("📝 测试 1: 简单消息测试");
    console.log("发送测试消息...");
    const simpleTest = await sendMessage(
        "你是一个友好的助手。",
      "请用一句话介绍你自己。",
    );
    console.log("✅ 响应:", simpleTest);
    console.log();

    // 测试 2: 句子分析
    console.log("📝 测试 2: 句子分析");
    console.log(`测试句子: "${testSentence}"`);
    console.log("正在分析...");
    const analysis = await analyzeSentence(testSentence);
    console.log("✅ 分析结果:");
    console.log(analysis);
    console.log();

    // 测试 3: 句子翻译
    console.log("📝 测试 3: 句子翻译");
    console.log(`测试句子: "${testSentence}"`);
    console.log("正在翻译...");
    const translation = await translateSentence(testSentence);
    console.log("✅ 翻译结果:");
    console.log(translation);
    console.log();

    // 测试 4: 学习建议
    console.log("📝 测试 4: 学习建议");
    console.log(`测试句子: "${testSentence}"`);
    console.log("用户级别: intermediate");
    console.log("正在生成学习建议...");
    const advice = await getLearningAdvice(testSentence, "intermediate");
    console.log("✅ 学习建议:");
    console.log(advice);
    console.log();

    console.log("🎉 所有测试通过！Azure OpenAI 配置正常工作。");
  } catch (error) {
    console.error("❌ 测试失败:");
    if (error instanceof Error) {
      console.error(`  错误信息: ${error.message}`);
      console.error(`  错误堆栈: ${error.stack}`);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// 运行测试
testAzureOpenAI();
