import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { categories } from '../lib/db/schema';

// 数据库连接
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

// 预设分类数据
const presetCategories = [
  {
    name: '日常对话',
    description: '日常生活中的常用对话',
    color: '#3b82f6',
    isPreset: true,
  },
  {
    name: '商务英语',
    description: '商务场合使用的英语表达',
    color: '#10b981',
    isPreset: true,
  },
  {
    name: '学术英语',
    description: '学术写作和讨论中使用的英语',
    color: '#f59e0b',
    isPreset: true,
  },
  {
    name: '旅游英语',
    description: '旅行中常用的英语表达',
    color: '#ef4444',
    isPreset: true,
  },
  {
    name: '情感表达',
    description: '表达情感和感受的英语',
    color: '#8b5cf6',
    isPreset: true,
  },
  {
    name: '科技英语',
    description: '科技领域的专业英语',
    color: '#06b6d4',
    isPreset: true,
  },
];

async function initCategories() {
  try {
    console.log('开始初始化预设分类...');
    
    for (const category of presetCategories) {
      try {
        await db.insert(categories).values(category);
        console.log(`✓ 已添加分类: ${category.name}`);
      } catch (error) {
        console.log(`⚠ 分类 ${category.name} 可能已存在，跳过...`);
      }
    }
    
    console.log('预设分类初始化完成！');
  } catch (error) {
    console.error('初始化分类时出错:', error);
  } finally {
    await client.end();
  }
}

initCategories();
