/**
 * 测试数据库更新脚本
 * 用于验证脚本能否正确更新数据库
 */

import { config } from "dotenv";
config();

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL 未设置");
  process.exit(1);
}

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { sentences } from "../lib/db/schema";

const connectionString = process.env.DATABASE_URL;
console.log(`🔗 数据库连接: ${connectionString?.replace(/:[^:@]+@/, ":****@")}`);

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function main() {
  try {
    // 1. 查询第一条句子
    console.log("\n📖 查询第一条句子...");
    const firstSentence = await db
      .select({
        id: sentences.id,
        englishText: sentences.englishText,
        audioUrl: sentences.audioUrl,
      })
      .from(sentences)
      .limit(1);

    if (firstSentence.length === 0) {
      console.log("❌ 没有找到句子");
      return;
    }

    const sentence = firstSentence[0];
    console.log(`   ID: ${sentence.id}`);
    console.log(`   英文: ${sentence.englishText.substring(0, 50)}...`);
    console.log(`   当前 audioUrl: ${sentence.audioUrl || "(空)"}`);

    // 2. 更新 audioUrl 为测试值
    const testUrl = `https://test-url-${Date.now()}.mp3`;
    console.log(`\n📝 更新 audioUrl 为: ${testUrl}`);

    const updateResult = await db
      .update(sentences)
      .set({ audioUrl: testUrl })
      .where(eq(sentences.id, sentence.id))
      .returning({ id: sentences.id, audioUrl: sentences.audioUrl });

    console.log(`   更新返回: ${JSON.stringify(updateResult)}`);

    // 3. 再次查询验证
    console.log("\n🔍 验证更新结果...");
    const verify = await db
      .select({ audioUrl: sentences.audioUrl })
      .from(sentences)
      .where(eq(sentences.id, sentence.id))
      .limit(1);

    console.log(`   查询结果: ${JSON.stringify(verify)}`);

    if (verify[0]?.audioUrl === testUrl) {
      console.log("\n✅ 数据库更新成功！");

      // 4. 恢复原值
      console.log("\n🔄 恢复原始值...");
      await db
        .update(sentences)
        .set({ audioUrl: sentence.audioUrl })
        .where(eq(sentences.id, sentence.id));
      console.log("   已恢复");
    } else {
      console.log("\n❌ 数据库更新失败！");
      console.log(`   期望: ${testUrl}`);
      console.log(`   实际: ${verify[0]?.audioUrl}`);
    }
  } catch (error) {
    console.error("❌ 错误:", error);
  } finally {
    await client.end();
  }
}

main();
