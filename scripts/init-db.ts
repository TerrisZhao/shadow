#!/usr/bin/env tsx

import { db } from '../lib/db/drizzle';
import { users } from '../lib/db/schema';
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';

/**
 * 数据库初始化脚本
 * 创建默认管理员用户
 */
async function initDatabase() {
  try {
    console.log('🚀 开始初始化数据库...');

    // 检查是否已存在管理员用户
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@example.com'))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('✅ 管理员用户已存在，跳过创建');
      return;
    }

    // 创建默认管理员用户
    const hashedPassword = await hash('admin123456', 12);
    
    const [adminUser] = await db
      .insert(users)
      .values({
        email: 'admin@example.com',
        name: '系统管理员',
        passwordHash: hashedPassword,
        provider: 'credentials',
        role: 'admin',
        emailVerified: true,
        isActive: true,
      })
      .returning();

    console.log('✅ 默认管理员用户创建成功:');
    console.log(`   邮箱: admin@example.com`);
    console.log(`   密码: admin123456`);
    console.log(`   用户ID: ${adminUser.id}`);
    console.log('');
    console.log('⚠️  请在生产环境中立即修改默认密码！');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  }
}

// 运行初始化
initDatabase()
  .then(() => {
    console.log('🎉 数据库初始化完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 初始化过程中发生错误:', error);
    process.exit(1);
  });
