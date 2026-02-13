CREATE TYPE "public"."theme_mode" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'user');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" timestamp,
	"token_type" varchar(50),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(20) DEFAULT '#3b82f6',
	"is_preset" boolean DEFAULT false NOT NULL,
	"user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "login_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"device_type" varchar(50),
	"browser" varchar(100),
	"os" varchar(100),
	"location" varchar(255),
	"is_successful" boolean DEFAULT true NOT NULL,
	"failure_reason" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recordings" (
	"id" serial PRIMARY KEY NOT NULL,
	"sentence_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"audio_url" text NOT NULL,
	"duration" integer,
	"file_size" integer,
	"mime_type" varchar(50) DEFAULT 'audio/webm',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_sentences" (
	"id" serial PRIMARY KEY NOT NULL,
	"scene_id" integer NOT NULL,
	"sentence_id" integer NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"user_id" integer NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sentence_tags" (
	"sentence_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sentence_tags_sentence_id_tag_id_pk" PRIMARY KEY("sentence_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "sentences" (
	"id" serial PRIMARY KEY NOT NULL,
	"english_text" text NOT NULL,
	"chinese_text" text,
	"category_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"difficulty" varchar(20) DEFAULT 'medium',
	"notes" text,
	"is_shared" boolean DEFAULT false NOT NULL,
	"audio_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"user_id" integer NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"color" varchar(20) DEFAULT '#3b82f6',
	"is_preset" boolean DEFAULT false NOT NULL,
	"user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_scene_favorites" (
	"user_id" integer NOT NULL,
	"scene_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_scene_favorites_user_id_scene_id_pk" PRIMARY KEY("user_id","scene_id")
);
--> statement-breakpoint
CREATE TABLE "user_sentence_favorites" (
	"user_id" integer NOT NULL,
	"sentence_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_sentence_favorites_user_id_sentence_id_pk" PRIMARY KEY("user_id","sentence_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"password_hash" text,
	"provider" varchar(50),
	"provider_id" varchar(255),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"theme_mode" "theme_mode" DEFAULT 'system' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_preset_name_idx" ON "categories" USING btree ("name") WHERE "categories"."is_preset" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_name_idx" ON "categories" USING btree ("user_id","name") WHERE "categories"."is_preset" = false;--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "categories_is_preset_idx" ON "categories" USING btree ("is_preset");--> statement-breakpoint
CREATE INDEX "login_history_user_id_idx" ON "login_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "login_history_created_at_idx" ON "login_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "recordings_sentence_id_idx" ON "recordings" USING btree ("sentence_id");--> statement-breakpoint
CREATE INDEX "recordings_user_id_idx" ON "recordings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recordings_user_sentence_idx" ON "recordings" USING btree ("user_id","sentence_id");--> statement-breakpoint
CREATE INDEX "scene_sentences_scene_id_idx" ON "scene_sentences" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "scene_sentences_sentence_id_idx" ON "scene_sentences" USING btree ("sentence_id");--> statement-breakpoint
CREATE INDEX "scenes_user_id_idx" ON "scenes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scenes_is_shared_idx" ON "scenes" USING btree ("is_shared");--> statement-breakpoint
CREATE INDEX "scenes_user_shared_idx" ON "scenes" USING btree ("user_id","is_shared");--> statement-breakpoint
CREATE INDEX "sentence_tags_sentence_id_idx" ON "sentence_tags" USING btree ("sentence_id");--> statement-breakpoint
CREATE INDEX "sentence_tags_tag_id_idx" ON "sentence_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "sentences_user_id_idx" ON "sentences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sentences_category_id_idx" ON "sentences" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "sentences_is_shared_idx" ON "sentences" USING btree ("is_shared");--> statement-breakpoint
CREATE INDEX "sentences_user_shared_idx" ON "sentences" USING btree ("user_id","is_shared");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_preset_name_idx" ON "tags" USING btree ("name") WHERE "tags"."is_preset" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_name_idx" ON "tags" USING btree ("user_id","name") WHERE "tags"."is_preset" = false;--> statement-breakpoint
CREATE INDEX "tags_user_id_idx" ON "tags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tags_is_preset_idx" ON "tags" USING btree ("is_preset");--> statement-breakpoint
CREATE INDEX "user_scene_favorites_user_id_idx" ON "user_scene_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_scene_favorites_scene_id_idx" ON "user_scene_favorites" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "user_sentence_favorites_user_id_idx" ON "user_sentence_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sentence_favorites_sentence_id_idx" ON "user_sentence_favorites" USING btree ("sentence_id");