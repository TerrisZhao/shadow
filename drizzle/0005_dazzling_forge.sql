CREATE TYPE "public"."theme_mode" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "theme_mode" "theme_mode" DEFAULT 'system' NOT NULL;