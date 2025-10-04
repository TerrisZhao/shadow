import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// 创建数据库连接
const connectionString = process.env.DATABASE_URL;

let db: any;

type Database = any;

if (!connectionString) {
  console.warn(
    "DATABASE_URL environment variable is not set. Database features will be disabled.",
  );
  // 创建一个虚拟的数据库连接，避免应用崩溃
  db = null;
} else {
  // 创建 postgres 客户端
  const client = postgres(connectionString, {
    prepare: false, // 禁用 prepared statements 以提高性能
  });

  // 创建 drizzle 实例
  db = drizzle(client, { schema });
}

export { db };
export type { Database };
