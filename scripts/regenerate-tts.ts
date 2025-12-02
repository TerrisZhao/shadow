/**
 * 重新生成所有句子语音脚本
 *
 * 功能：
 * 1. 从数据库读取所有句子
 * 2. 调用 TTS 服务生成语音
 * 3. 将生成的音频 URL 更新到数据库
 *
 * 使用方法：
 *   npx tsx scripts/regenerate-tts.ts [options]
 *
 * 选项：
 *   --all           重新生成所有句子（包括已有语音的）
 *   --missing       只生成缺少语音的句子（默认）
 *   --batch=N       每批处理的句子数量，默认 10
 *   --delay=N       批次之间的延迟（毫秒），默认 1000
 *   --start=N       从第 N 条句子开始（用于断点续传）
 *   --limit=N       最多处理 N 条句子
 */

// 加载环境变量（必须在最前面，在任何其他导入之前）
import { config } from "dotenv";
config();

// 验证环境变量加载
if (!process.env.DATABASE_URL) {
  console.error("❌ 错误：DATABASE_URL 环境变量未设置");
  console.error("\n请检查：");
  console.error("1. 项目根目录是否存在 .env 文件");
  console.error("2. .env 文件中是否配置了 DATABASE_URL");
  process.exit(1);
}

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, isNull, sql, asc } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { sentences } from "../lib/db/schema";
import { generateTTS } from "../lib/tts/generator";

// 创建数据库连接
const connectionString = process.env.DATABASE_URL;
console.log(
  `🔗 数据库连接: ${connectionString?.replace(/:[^:@]+@/, ":****@")}`,
);
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

/**
 * 解析命令行参数
 */
function parseArgs(): {
  regenerateAll: boolean;
  batchSize: number;
  delayMs: number;
  startFrom: number;
  limit: number | null;
} {
  const args = process.argv.slice(2);
  let regenerateAll = false;
  let batchSize = 10;
  let delayMs = 1000;
  let startFrom = 0;
  let limit: number | null = null;

  for (const arg of args) {
    if (arg === "--all") {
      regenerateAll = true;
    } else if (arg === "--missing") {
      regenerateAll = false;
    } else if (arg.startsWith("--batch=")) {
      batchSize = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--delay=")) {
      delayMs = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--start=")) {
      startFrom = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--limit=")) {
      limit = parseInt(arg.split("=")[1], 10);
    }
  }

  return { regenerateAll, batchSize, delayMs, startFrom, limit };
}

/**
 * 格式化时间
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}小时${minutes % 60}分${seconds % 60}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
}

/**
 * 生成单个句子的语音
 */
async function generateSentenceAudio(
  sentenceId: number,
  englishText: string,
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const result = await generateTTS(englishText, "af_alloy");

    if (result.success && result.url) {
      // 更新数据库 - 使用 returning() 确保更新被执行并返回结果
      const updated = await db
        .update(sentences)
        .set({ audioUrl: result.url })
        .where(eq(sentences.id, sentenceId))
        .returning({ id: sentences.id, audioUrl: sentences.audioUrl });

      // 调试：打印更新结果
      console.log(`\n   📝 DB更新结果: ${JSON.stringify(updated)}`);

      if (updated.length === 0) {
        return { success: false, error: "数据库更新失败：未找到匹配的记录" };
      }

      // 验证：立即查询确认更新
      const verify = await db
        .select({ audioUrl: sentences.audioUrl })
        .from(sentences)
        .where(eq(sentences.id, sentenceId))
        .limit(1);
      console.log(`   🔍 验证查询: ${JSON.stringify(verify)}`);

      return { success: true, url: result.url };
    } else {
      return { success: false, error: result.error || "TTS 生成失败" };
    }
  } catch (error) {
    console.error(`   ⚠️ 更新异常:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 主函数
 */
async function main() {
  console.log("🎙️  句子语音重新生成脚本");
  console.log("=".repeat(60));

  const { regenerateAll, batchSize, delayMs, startFrom, limit } = parseArgs();

  console.log("\n📋 运行配置：");
  console.log(`   模式: ${regenerateAll ? "重新生成所有" : "只生成缺失的"}`);
  console.log(`   批次大小: ${batchSize}`);
  console.log(`   批次延迟: ${delayMs}ms`);
  if (startFrom > 0) {
    console.log(`   起始位置: ${startFrom}`);
  }
  if (limit) {
    console.log(`   最大处理数: ${limit}`);
  }

  const startTime = Date.now();

  try {
    // 1. 获取需要处理的句子
    console.log("\n📊 正在查询数据库...");

    let query = db
      .select({
        id: sentences.id,
        englishText: sentences.englishText,
        audioUrl: sentences.audioUrl,
      })
      .from(sentences)
      .orderBy(asc(sentences.id));

    // 如果只处理缺失语音的句子
    if (!regenerateAll) {
      query = query.where(isNull(sentences.audioUrl)) as typeof query;
    }

    const allSentences = await query;

    // 应用起始位置和限制
    let targetSentences = allSentences.slice(startFrom);
    if (limit) {
      targetSentences = targetSentences.slice(0, limit);
    }

    const totalCount = targetSentences.length;

    console.log(`   数据库中共有 ${allSentences.length} 条句子`);
    console.log(`   本次需要处理 ${totalCount} 条句子`);

    if (totalCount === 0) {
      console.log("\n✅ 没有需要处理的句子，退出脚本");
      process.exit(0);
    }

    // 2. 统计信息
    let successCount = 0;
    let errorCount = 0;
    const errors: { id: number; text: string; error: string }[] = [];

    // 3. 分批处理
    const totalBatches = Math.ceil(totalCount / batchSize);

    console.log(`\n🚀 开始处理，共 ${totalBatches} 个批次...\n`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * batchSize;
      const batch = targetSentences.slice(batchStart, batchStart + batchSize);
      const batchNum = batchIndex + 1;

      console.log(
        `📦 批次 ${batchNum}/${totalBatches} (句子 ${batchStart + 1}-${batchStart + batch.length})`,
      );

      for (let i = 0; i < batch.length; i++) {
        const sentence = batch[i];
        const globalIndex = batchStart + i + 1 + startFrom;

        // 显示进度
        const progress = (
          ((batchStart + i + 1) / totalCount) *
          100
        ).toFixed(1);
        process.stdout.write(
          `   [${progress}%] ID:${sentence.id} - ${sentence.englishText.substring(0, 40)}...`,
        );

        const result = await generateSentenceAudio(
          sentence.id,
          sentence.englishText,
        );

        if (result.success) {
          successCount++;
          console.log(" ✅");
        } else {
          errorCount++;
          console.log(` ❌ ${result.error}`);
          errors.push({
            id: sentence.id,
            text: sentence.englishText.substring(0, 50),
            error: result.error || "未知错误",
          });
        }
      }

      // 批次之间延迟
      if (batchIndex < totalBatches - 1) {
        console.log(`   ⏳ 等待 ${delayMs}ms...\n`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // 4. 输出统计信息
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log("\n" + "=".repeat(60));
    console.log("✅ 处理完成！");
    console.log("=".repeat(60));
    console.log("📊 统计信息：");
    console.log(`   总处理数: ${totalCount}`);
    console.log(`   成功数量: ${successCount}`);
    console.log(`   失败数量: ${errorCount}`);
    console.log(
      `   成功率: ${((successCount / totalCount) * 100).toFixed(2)}%`,
    );
    console.log(`   耗时: ${formatDuration(duration)}`);
    console.log(
      `   平均速度: ${((totalCount / duration) * 1000).toFixed(2)} 条/秒`,
    );

    // 5. 输出错误详情
    if (errors.length > 0) {
      console.log("\n❌ 失败详情：");
      for (const err of errors) {
        console.log(`   ID:${err.id} - ${err.text}... : ${err.error}`);
      }

      // 输出断点续传提示
      if (errors.length > 0) {
        console.log("\n💡 提示：可以使用以下命令重试失败的句子：");
        const failedIds = errors.map((e) => e.id).join(",");
        console.log(`   手动重试特定 ID 的句子（需要修改脚本或单独处理）`);
      }
    }

    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ 脚本执行出错:", error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await client.end();
  }
}

// 执行主函数
main();
