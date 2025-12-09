import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
  primaryKey,
  json,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
export const accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    type: varchar("type", { length: 50 }).notNull(), // 'oauth', 'email', 'credentials'
    provider: varchar("provider", { length: 50 }).notNull(),
    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: timestamp("expires_at"),
    tokenType: varchar("token_type", { length: 50 }),
    scope: varchar("scope", { length: 255 }),
    idToken: text("id_token"),
    sessionState: varchar("session_state", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("accounts_user_id_idx").on(table.userId),
  }),
);

// 会话表 (NextAuth.js 需要)
export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
    userId: integer("user_id").notNull(),
    expires: timestamp("expires").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
  }),
);

// 验证令牌表 (NextAuth.js 需要)
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  }),
);

// 句子分类表
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 20 }).default("#3b82f6"), // 分类颜色
    isPreset: boolean("is_preset").notNull().default(false), // 是否为预设分类
    userId: integer("user_id"), // 自定义分类关联用户
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    // 预设分类的名称全局唯一
    presetNameIdx: uniqueIndex("categories_preset_name_idx")
      .on(table.name)
      .where(sql`${table.isPreset} = true`),
    // 用户自定义分类在用户范围内名称唯一
    userNameIdx: uniqueIndex("categories_user_name_idx")
      .on(table.userId, table.name)
      .where(sql`${table.isPreset} = false`),
    userIdIdx: index("categories_user_id_idx").on(table.userId),
    isPresetIdx: index("categories_is_preset_idx").on(table.isPreset),
  }),
);

// 句子表
export const sentences = pgTable(
  "sentences",
  {
    id: serial("id").primaryKey(),
    englishText: text("english_text").notNull(), // 英文句子
    chineseText: text("chinese_text"), // 中文翻译（可为空）
    categoryId: integer("category_id").notNull(),
    userId: integer("user_id").notNull(),
    difficulty: varchar("difficulty", { length: 20 }).default("medium"), // 难度等级: easy, medium, hard
    notes: text("notes"), // 备注
    isShared: boolean("is_shared").notNull().default(false), // 是否为共享句子（管理员可设置）
    audioUrl: text("audio_url"), // 音频文件 URL
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("sentences_user_id_idx").on(table.userId),
    categoryIdIdx: index("sentences_category_id_idx").on(table.categoryId),
    isSharedIdx: index("sentences_is_shared_idx").on(table.isShared),
    // 复合索引用于查询共享句子或用户自己的句子
    userSharedIdx: index("sentences_user_shared_idx").on(
      table.userId,
      table.isShared,
    ),
  }),
);

// 用户句子收藏关联表
export const userSentenceFavorites = pgTable(
  "user_sentence_favorites",
  {
    userId: integer("user_id").notNull(),
    sentenceId: integer("sentence_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.sentenceId] }),
    userIdIdx: index("user_sentence_favorites_user_id_idx").on(table.userId),
    sentenceIdIdx: index("user_sentence_favorites_sentence_id_idx").on(
      table.sentenceId,
    ),
  }),
);

// 录音记录表
export const recordings = pgTable(
  "recordings",
  {
    id: serial("id").primaryKey(),
    sentenceId: integer("sentence_id").notNull(),
    userId: integer("user_id").notNull(),
    audioUrl: text("audio_url").notNull(), // 录音文件 URL
    duration: integer("duration"), // 录音时长（秒）
    fileSize: integer("file_size"), // 文件大小（字节）
    mimeType: varchar("mime_type", { length: 50 }).default("audio/webm"), // MIME类型
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    sentenceIdIdx: index("recordings_sentence_id_idx").on(table.sentenceId),
    userIdIdx: index("recordings_user_id_idx").on(table.userId),
    // 复合索引用于查询特定句子的特定用户录音
    userSentenceIdx: index("recordings_user_sentence_idx").on(
      table.userId,
      table.sentenceId,
    ),
  }),
);

// 场景表
export const scenes = pgTable(
  "scenes",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(), // 场景标题
    description: text("description"), // 场景描述
    userId: integer("user_id").notNull(),
    isShared: boolean("is_shared").notNull().default(false), // 是否为共享场景（管理员可设置）
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("scenes_user_id_idx").on(table.userId),
    isSharedIdx: index("scenes_is_shared_idx").on(table.isShared),
    userSharedIdx: index("scenes_user_shared_idx").on(
      table.userId,
      table.isShared,
    ),
  }),
);

// 用户场景收藏关联表
export const userSceneFavorites = pgTable(
  "user_scene_favorites",
  {
    userId: integer("user_id").notNull(),
    sceneId: integer("scene_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.sceneId] }),
    userIdIdx: index("user_scene_favorites_user_id_idx").on(table.userId),
    sceneIdIdx: index("user_scene_favorites_scene_id_idx").on(table.sceneId),
  }),
);

// 场景句子关联表
export const sceneSentences = pgTable(
  "scene_sentences",
  {
    id: serial("id").primaryKey(),
    sceneId: integer("scene_id").notNull(),
    sentenceId: integer("sentence_id").notNull(),
    order: integer("order").notNull(), // 句子在场景中的顺序
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    sceneIdIdx: index("scene_sentences_scene_id_idx").on(table.sceneId),
    sentenceIdIdx: index("scene_sentences_sentence_id_idx").on(
      table.sentenceId,
    ),
  }),
);

// 登录历史表
export const loginHistory = pgTable(
  "login_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    ipAddress: varchar("ip_address", { length: 45 }), // IPv4 或 IPv6 地址
    userAgent: text("user_agent"), // 用户代理字符串
    deviceType: varchar("device_type", { length: 50 }), // 设备类型：desktop, mobile, tablet
    browser: varchar("browser", { length: 100 }), // 浏览器名称
    os: varchar("os", { length: 100 }), // 操作系统
    location: varchar("location", { length: 255 }), // 地理位置（可选）
    isSuccessful: boolean("is_successful").notNull().default(true), // 是否登录成功
    failureReason: varchar("failure_reason", { length: 255 }), // 失败原因（如果登录失败）
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("login_history_user_id_idx").on(table.userId),
    createdAtIdx: index("login_history_created_at_idx").on(table.createdAt),
  }),
);

// 标签表
export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 50 }).notNull(),
    color: varchar("color", { length: 20 }).default("#3b82f6"), // 标签颜色
    isPreset: boolean("is_preset").notNull().default(false), // 是否为预设标签
    userId: integer("user_id"), // 自定义标签关联用户，预设标签为 null
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    // 预设标签的名称全局唯一
    presetNameIdx: uniqueIndex("tags_preset_name_idx")
      .on(table.name)
      .where(sql`${table.isPreset} = true`),
    // 用户自定义标签在用户范围内名称唯一
    userNameIdx: uniqueIndex("tags_user_name_idx")
      .on(table.userId, table.name)
      .where(sql`${table.isPreset} = false`),
    userIdIdx: index("tags_user_id_idx").on(table.userId),
    isPresetIdx: index("tags_is_preset_idx").on(table.isPreset),
  }),
);

// 句子标签关联表
export const sentenceTags = pgTable(
  "sentence_tags",
  {
    sentenceId: integer("sentence_id").notNull(),
    tagId: integer("tag_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.sentenceId, table.tagId] }),
    sentenceIdIdx: index("sentence_tags_sentence_id_idx").on(table.sentenceId),
    tagIdIdx: index("sentence_tags_tag_id_idx").on(table.tagId),
  }),
);

// 简历表
export const resumes = pgTable(
  "resumes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(), // 简历名称
    fullName: varchar("full_name", { length: 255 }),
    preferredName: varchar("preferred_name", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    location: varchar("location", { length: 255 }),
    linkedin: varchar("linkedin", { length: 255 }),
    github: varchar("github", { length: 255 }),
    summary: text("summary"),
    keySkills: json("key_skills").$type<string[]>().default([]), // JSON array
    additionalInfo: text("additional_info"),
    themeColor: varchar("theme_color", { length: 20 }).default("#000000"), // 主题颜色
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("resumes_user_id_idx").on(table.userId),
    userIdCreatedAtIdx: index("resumes_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

// 工作经历表
export const resumeWorkExperiences = pgTable(
  "resume_work_experiences",
  {
    id: serial("id").primaryKey(),
    resumeId: integer("resume_id").notNull(),
    company: varchar("company", { length: 255 }),
    position: varchar("position", { length: 255 }),
    startDate: varchar("start_date", { length: 50 }),
    endDate: varchar("end_date", { length: 50 }),
    current: boolean("current").notNull().default(false),
    responsibilities: json("responsibilities").$type<string[]>().default([]),
    order: integer("order").notNull().default(0), // 显示顺序
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    resumeIdIdx: index("resume_work_experiences_resume_id_idx").on(
      table.resumeId,
    ),
    resumeIdOrderIdx: index("resume_work_experiences_resume_id_order_idx").on(
      table.resumeId,
      table.order,
    ),
  }),
);

// 教育背景表
export const resumeEducation = pgTable(
  "resume_education",
  {
    id: serial("id").primaryKey(),
    resumeId: integer("resume_id").notNull(),
    school: varchar("school", { length: 255 }),
    degree: varchar("degree", { length: 255 }),
    major: varchar("major", { length: 255 }),
    startDate: varchar("start_date", { length: 50 }),
    endDate: varchar("end_date", { length: 50 }),
    current: boolean("current").notNull().default(false),
    gpa: varchar("gpa", { length: 50 }),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    resumeIdIdx: index("resume_education_resume_id_idx").on(table.resumeId),
    resumeIdOrderIdx: index("resume_education_resume_id_order_idx").on(
      table.resumeId,
      table.order,
    ),
  }),
);

// 项目经历表
export const resumeProjects = pgTable(
  "resume_projects",
  {
    id: serial("id").primaryKey(),
    resumeId: integer("resume_id").notNull(),
    name: varchar("name", { length: 255 }),
    role: varchar("role", { length: 255 }),
    startDate: varchar("start_date", { length: 50 }),
    endDate: varchar("end_date", { length: 50 }),
    current: boolean("current").notNull().default(false),
    description: text("description"),
    technologies: json("technologies").$type<string[]>().default([]),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    resumeIdIdx: index("resume_projects_resume_id_idx").on(table.resumeId),
    resumeIdOrderIdx: index("resume_projects_resume_id_order_idx").on(
      table.resumeId,
      table.order,
    ),
  }),
);

// 导出所有表
export const schema = {
  users,
  accounts,
  sessions,
  verificationTokens,
  categories,
  sentences,
  userSentenceFavorites,
  recordings,
  scenes,
  userSceneFavorites,
  sceneSentences,
  loginHistory,
  tags,
  sentenceTags,
  resumes,
  resumeWorkExperiences,
  resumeEducation,
  resumeProjects,
};
