/**
 * 导入IT面试题数据脚本
 * 
 * 功能：
 * 1. 读取所有 backup_page_*.json 文件
 * 2. 调用AI翻译服务将中文题目翻译成英文
 * 3. 将数据插入到 sentences 表
 * 4. 创建或复用 tags，并建立关联关系
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
  console.error("3. .env 文件格式是否正确（没有空格、引号等）");
  console.error("\n示例配置：");
  console.error("DATABASE_URL=postgresql://username:password@localhost:5432/dbname");
  process.exit(1);
}

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";
import { sentences, tags, sentenceTags, categories } from "../lib/db/schema";
import { translateITQuestion } from "../lib/ai/services";
import { eq, and, sql } from "drizzle-orm";

// 直接创建数据库连接（避免使用可能为 null 的 db）
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

/**
 * 备份文件中的问题数据结构
 */
interface BackupQuestion {
  id: string;
  question_num: string;
  title: string; // 中文标题
  content: string;
  difficulty: number; // 1-5，对应 easy, medium, hard
  tag_list: string[]; // 标签列表
  create_time: string;
  update_time: string;
  [key: string]: unknown;
}

/**
 * 难度映射
 */
function mapDifficulty(difficulty: number): "easy" | "medium" | "hard" {
  if (difficulty <= 2) return "easy";
  if (difficulty <= 3) return "medium";
  return "hard";
}

/**
 * 获取或创建分类
 */
async function getOrCreateCategory(userId: number): Promise<number> {
  const categoryName = "IT面试题";
  
  // 先查找是否已存在该分类
  const existingCategory = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.name, categoryName),
        eq(categories.userId, userId)
      )
    )
    .limit(1);

  if (existingCategory.length > 0) {
    return existingCategory[0].id;
  }

  // 创建新分类
  const newCategory = await db
    .insert(categories)
    .values({
      name: categoryName,
      description: "IT技术面试题库",
      color: "#10b981", // 绿色
      isPreset: false,
      userId,
    })
    .returning({ id: categories.id });

  return newCategory[0].id;
}

/**
 * 获取或创建标签
 */
async function getOrCreateTag(
  tagName: string,
  userId: number
): Promise<number> {
  try {
    // 尝试插入新标签，如果冲突则忽略
    const newTag = await db
      .insert(tags)
      .values({
        name: tagName,
        color: "#3b82f6", // 蓝色
        isPreset: false,
        userId,
      })
      .onConflictDoNothing({
        target: [tags.userId, tags.name],
        where: sql`${tags.isPreset} = false`,
      })
      .returning({ id: tags.id });

    // 如果插入成功，返回新标签ID
    if (newTag.length > 0) {
      return newTag[0].id;
    }

    // 如果冲突（标签已存在），查询已存在的标签
    const existingTag = await db
      .select()
      .from(tags)
      .where(
        and(
          eq(tags.name, tagName),
          eq(tags.userId, userId),
          eq(tags.isPreset, false)
        )
      )
      .limit(1);

    return existingTag[0].id;
  } catch (error) {
    // 如果发生错误（可能是并发冲突），查询已存在的标签
    console.error(`  ⚠️  标签插入冲突，尝试查询: ${tagName}`);
    const existingTag = await db
      .select()
      .from(tags)
      .where(
        and(
          eq(tags.name, tagName),
          eq(tags.userId, userId),
          eq(tags.isPreset, false)
        )
      )
      .limit(1);

    if (existingTag.length > 0) {
      return existingTag[0].id;
    }

    // 如果还是找不到，重新抛出错误
    throw error;
  }
}

/**
 * 导入单个问题
 */
async function importQuestion(
  question: BackupQuestion,
  userId: number,
  categoryId: number
): Promise<void> {
  console.log(`\n正在处理: ${question.title}`);

  try {
    // 1. 调用AI翻译服务
    console.log("  → 正在翻译...");
    const translation = await translateITQuestion(question.title);
    console.log(`  ✓ 翻译完成: ${translation.english}`);

    // 2. 插入句子
    const insertedSentence = await db
      .insert(sentences)
      .values({
        englishText: translation.english,
        chineseText: question.title,
        categoryId,
        userId,
        difficulty: mapDifficulty(question.difficulty),
        notes: translation.note || "",
        isShared: false,
      })
      .returning({ id: sentences.id });

    const sentenceId = insertedSentence[0].id;
    console.log(`  ✓ 句子已插入，ID: ${sentenceId}`);

    // 3. 处理标签
    if (question.tag_list && question.tag_list.length > 0) {
      console.log(`  → 正在处理 ${question.tag_list.length} 个标签...`);
      
      for (const tagName of question.tag_list) {
        const tagId = await getOrCreateTag(tagName, userId);
        
        // 创建句子-标签关联
        await db.insert(sentenceTags).values({
          sentenceId,
          tagId,
        });
        
        console.log(`    ✓ 标签已关联: ${tagName}`);
      }
    }

    console.log(`  ✅ 问题导入成功`);
  } catch (error) {
    console.error(`  ❌ 导入失败:`, error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log("🚀 开始导入IT面试题数据...\n");

  // 配置参数
  const userId = 1; // 默认用户ID，请根据实际情况修改
  const batchSize = 10; // 每批处理的问题数量（避免API限流）
  const delayBetweenBatches = 2000; // 批次之间的延迟（毫秒）

  try {
    // 1. 获取或创建分类
    console.log("📁 正在获取/创建分类...");
    const categoryId = await getOrCreateCategory(userId);
    console.log(`✓ 分类ID: ${categoryId}\n`);

    // 2. 读取所有backup文件
    const workspaceRoot = process.cwd();
    const backupFiles = fs
      .readdirSync(workspaceRoot)
      .filter((file) => file.startsWith("backup_page_") && file.endsWith(".json"))
      .sort();

    console.log(`📂 找到 ${backupFiles.length} 个备份文件\n`);

    // 3. 统计信息
    let totalQuestions = 0;
    let successCount = 0;
    let errorCount = 0;

    // 4. 逐个文件处理
    for (const filename of backupFiles) {
      console.log(`\n📄 正在处理文件: ${filename}`);
      const filePath = path.join(workspaceRoot, filename);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const questions: BackupQuestion[] = JSON.parse(fileContent);

      console.log(`   包含 ${questions.length} 个问题`);
      totalQuestions += questions.length;

      // 分批处理
      for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(questions.length / batchSize);

        console.log(
          `\n   📦 批次 ${batchNum}/${totalBatches} (${batch.length} 个问题)`
        );

        for (const question of batch) {
          try {
            await importQuestion(question, userId, categoryId);
            successCount++;
          } catch (error) {
            errorCount++;
            console.error(`     ❌ 跳过问题: ${question.title}`);
          }
        }

        // 批次之间延迟，避免API限流
        if (i + batchSize < questions.length) {
          console.log(
            `\n   ⏳ 等待 ${delayBetweenBatches / 1000} 秒后处理下一批...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
        }
      }
    }

    // 5. 输出统计信息
    console.log("\n" + "=".repeat(60));
    console.log("✅ 导入完成！");
    console.log("=".repeat(60));
    console.log(`📊 统计信息:`);
    console.log(`   总问题数: ${totalQuestions}`);
    console.log(`   成功导入: ${successCount}`);
    console.log(`   失败数量: ${errorCount}`);
    console.log(`   成功率: ${((successCount / totalQuestions) * 100).toFixed(2)}%`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ 导入过程出错:", error);
    process.exit(1);
  }
}

// 执行主函数
main();
