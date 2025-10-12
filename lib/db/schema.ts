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

// 主题模式枚举
export const themeModeEnum = pgEnum("theme_mode", ["light", "dark", "system"]);

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
  themeMode: themeModeEnum("theme_mode").notNull().default("system"),
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

// 录音记录表
export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  sentenceId: serial("sentence_id")
    .notNull()
    .references(() => sentences.id, { onDelete: "cascade" }),
  userId: serial("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  audioUrl: text("audio_url").notNull(), // 录音文件 URL
  duration: varchar("duration", { length: 20 }), // 录音时长（秒）
  fileSize: varchar("file_size", { length: 20 }), // 文件大小（字节）
  mimeType: varchar("mime_type", { length: 50 }).default("audio/webm"), // MIME类型
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 场景表
export const scenes = pgTable("scenes", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(), // 场景标题
  description: text("description"), // 场景描述
  userId: serial("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isShared: boolean("is_shared").notNull().default(false), // 是否为共享场景（管理员可设置）
  isFavorite: boolean("is_favorite").notNull().default(false), // 是否收藏
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 场景句子关联表
export const sceneSentences = pgTable("scene_sentences", {
  id: serial("id").primaryKey(),
  sceneId: serial("scene_id")
    .notNull()
    .references(() => scenes.id, { onDelete: "cascade" }),
  sentenceId: serial("sentence_id")
    .notNull()
    .references(() => sentences.id, { onDelete: "cascade" }),
  order: serial("order").notNull(), // 句子在场景中的顺序
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 登录历史表
export const loginHistory = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: serial("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4 或 IPv6 地址
  userAgent: text("user_agent"), // 用户代理字符串
  deviceType: varchar("device_type", { length: 50 }), // 设备类型：desktop, mobile, tablet
  browser: varchar("browser", { length: 100 }), // 浏览器名称
  os: varchar("os", { length: 100 }), // 操作系统
  location: varchar("location", { length: 255 }), // 地理位置（可选）
  isSuccessful: boolean("is_successful").notNull().default(true), // 是否登录成功
  failureReason: varchar("failure_reason", { length: 255 }), // 失败原因（如果登录失败）
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 导出所有表
export const schema = {
  users,
  accounts,
  sessions,
  verificationTokens,
  categories,
  sentences,
  recordings,
  scenes,
  sceneSentences,
  loginHistory,
};
