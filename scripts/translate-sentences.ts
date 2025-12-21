/**
 * 批量翻译句子脚本
 *
 * 功能：
 * 1. 查询所有没有中文翻译的句子（chineseText 为 null 或空字符串）
 * 2. 使用 DeepL 将英文翻译成中文
 * 3. 更新 Sentence 表的 chineseText 字段
 */

// ⚠️ 重要：必须在导入其他模块之前加载环境变量
import { config } from "dotenv";
import { resolve } from "path";

// 显式指定 .env 文件路径并加载
config({ path: resolve(__dirname, "../.env") });

// 验证环境变量
if (!process.env.DEEPL_AUTH_KEY) {
  console.error("❌ 错误：DEEPL_AUTH_KEY 环境变量未设置");
  console.error("\n请检查 .env 文件中是否配置了：");
  console.error("DEEPL_AUTH_KEY=your_deepl_api_key");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("❌ 错误：DATABASE_URL 环境变量未设置");
  console.error("\n请检查 .env 文件中是否配置了数据库连接");
  process.exit(1);
}

/**
 * 批量翻译句子的主函数
 */
async function translateSentences() {
  // 使用动态导入以确保环境变量已加载
  const { db } = await import("../lib/db/drizzle");
  const { sentences } = await import("../lib/db/schema");
  const { translateEnglishToChinese, checkUsage } = await import(
    "../lib/translator/deepl"
  );
  const { eq, or, isNull } = await import("drizzle-orm");

  console.log("🚀 批量翻译句子脚本\n");
  console.log("=".repeat(60));

  // 检查数据库连接
  if (!db) {
    console.error("\n❌ 错误：数据库连接失败");
    console.error("请确保 DATABASE_URL 环境变量已正确设置");
    process.exit(1);
  }

  try {
    // 1. 查询需要翻译的句子
    console.log("\n📊 正在查询需要翻译的句子...\n");

    const sentencesToTranslate = await db
      .select({
        id: sentences.id,
        englishText: sentences.englishText,
        chineseText: sentences.chineseText,
      })
      .from(sentences)
      .where(or(isNull(sentences.chineseText), eq(sentences.chineseText, "")));

    const totalCount = sentencesToTranslate.length;

    if (totalCount === 0) {
      console.log("✅ 所有句子都已有中文翻译，无需处理！\n");
      return;
    }

    console.log(`找到 ${totalCount} 条需要翻译的句子\n`);
    console.log("=".repeat(60));

    // 2. 检查 API 使用情况
    console.log("\n📊 检查 DeepL API 使用情况...\n");
    const usageBefore = await checkUsage();

    if (usageBefore.character) {
      const used = usageBefore.character.count;
      const limit = usageBefore.character.limit;
      const remaining = limit - used;
      const percentage = ((used / limit) * 100).toFixed(2);

      console.log(`当前使用情况:`);
      console.log(`  已使用: ${used.toLocaleString()}`);
      console.log(`  总限额: ${limit.toLocaleString()}`);
      console.log(`  使用率: ${percentage}%`);
      console.log(`  剩余额度: ${remaining.toLocaleString()}\n`);
    }

    console.log("=".repeat(60));

    // 3. 批量翻译并更新
    console.log("\n🔄 开始翻译...\n");

    let successCount = 0;
    let failCount = 0;
    const errors: Array<{ id: number; error: string }> = [];

    for (let i = 0; i < totalCount; i++) {
      const sentence = sentencesToTranslate[i];
      const progress = `[${i + 1}/${totalCount}]`;

      try {
        console.log(`${progress} 正在翻译 ID: ${sentence.id}`);
        console.log(
          `  英文: ${sentence.englishText.substring(0, 80)}${sentence.englishText.length > 80 ? "..." : ""}`,
        );

        // 翻译
        const chineseText = await translateEnglishToChinese(
          sentence.englishText,
        );
        console.log(
          `  中文: ${chineseText.substring(0, 80)}${chineseText.length > 80 ? "..." : ""}`,
        );

        // 更新数据库
        await db
          .update(sentences)
          .set({
            chineseText,
            updatedAt: new Date(),
          })
          .where(eq(sentences.id, sentence.id));

        successCount++;
        console.log(`  ✅ 翻译成功并已更新\n`);

        // 延迟一下，避免请求过快（DeepL 限制）
        if (i < totalCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        failCount++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({ id: sentence.id, error: errorMessage });
        console.log(`  ❌ 翻译失败: ${errorMessage}\n`);
      }
    }

    // 4. 显示最终统计
    console.log("=".repeat(60));
    console.log("\n📈 翻译完成统计\n");
    console.log(`总计: ${totalCount} 条`);
    console.log(`成功: ${successCount} 条`);
    console.log(`失败: ${failCount} 条`);
    console.log(`成功率: ${((successCount / totalCount) * 100).toFixed(2)}%`);

    // 5. 显示失败的句子（如果有）
    if (errors.length > 0) {
      console.log("\n❌ 失败的句子：\n");
      errors.forEach(({ id, error }) => {
        console.log(`  ID ${id}: ${error}`);
      });
    }

    // 6. 显示更新后的 API 使用情况
    console.log("\n" + "=".repeat(60));
    console.log("\n📊 更新后的 API 使用情况\n");

    const usageAfter = await checkUsage();

    if (usageAfter.character) {
      const used = usageAfter.character.count;
      const limit = usageAfter.character.limit;
      const remaining = limit - used;
      const percentage = ((used / limit) * 100).toFixed(2);
      const consumed = used - (usageBefore.character?.count || 0);

      console.log(`字符数使用情况:`);
      console.log(`  已使用: ${used.toLocaleString()}`);
      console.log(`  总限额: ${limit.toLocaleString()}`);
      console.log(`  使用率: ${percentage}%`);
      console.log(`  剩余额度: ${remaining.toLocaleString()}`);
      console.log(`  本次消耗: ${consumed.toLocaleString()} 字符`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("\n✅ 所有翻译任务已完成！\n");
  } catch (error) {
    console.error("\n❌ 脚本执行失败:", error);
    process.exit(1);
  }
}

// 执行脚本
translateSentences().catch((error) => {
  console.error("\n❌ 未预期的错误:", error);
  process.exit(1);
});
