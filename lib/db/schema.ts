import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

// 用户角色枚举
export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "user"]);

// 用户表
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  passwordHash: text("password_hash"),
  provider: varchar("provider", { length: 50 }), // 'google', 'github', 'credentials'
  providerId: varchar("provider_id", { length: 255 }),
  role: userRoleEnum("role").notNull().default("user"),
  emailVerified: boolean("email_verified").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"), // 软删除
});

// 账户表 (NextAuth.js 需要)
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: serial("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // 'oauth', 'email', 'credentials'
  provider: varchar("provider", { length: 50 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: timestamp("expires_at"),
  tokenType: varchar("token_type", { length: 50 }),
  scope: varchar("scope", { length: 255 }),
  idToken: text("id_token"),
  sessionState: varchar("session_state", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 会话表 (NextAuth.js 需要)
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  userId: serial("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 验证令牌表 (NextAuth.js 需要)
export const verificationTokens = pgTable("verification_tokens", {
  identifier: varchar("identifier", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  expires: timestamp("expires").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 句子分类表
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  color: varchar("color", { length: 20 }).default("#3b82f6"), // 分类颜色
  isPreset: boolean("is_preset").notNull().default(false), // 是否为预设分类
  userId: serial("user_id").references(() => users.id, { onDelete: "cascade" }), // 自定义分类关联用户
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 句子表
export const sentences = pgTable("sentences", {
  id: serial("id").primaryKey(),
  englishText: text("english_text").notNull(), // 英文句子
  chineseText: text("chinese_text").notNull(), // 中文翻译
  categoryId: serial("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  userId: serial("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  difficulty: varchar("difficulty", { length: 20 }).default("medium"), // 难度等级: easy, medium, hard
  notes: text("notes"), // 备注
  isFavorite: boolean("is_favorite").notNull().default(false), // 是否收藏
  isShared: boolean("is_shared").notNull().default(false), // 是否为共享句子（管理员可设置）
  audioUrl: text("audio_url"), // 音频文件 URL
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 导出所有表
export const schema = {
  users,
  accounts,
  sessions,
  verificationTokens,
  categories,
  sentences,
};
