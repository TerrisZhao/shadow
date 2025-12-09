CREATE TABLE "resume_education" (
	"id" serial PRIMARY KEY NOT NULL,
	"resume_id" integer NOT NULL,
	"school" varchar(255),
	"degree" varchar(255),
	"major" varchar(255),
	"start_date" varchar(50),
	"end_date" varchar(50),
	"current" boolean DEFAULT false NOT NULL,
	"gpa" varchar(50),
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"resume_id" integer NOT NULL,
	"name" varchar(255),
	"role" varchar(255),
	"start_date" varchar(50),
	"end_date" varchar(50),
	"current" boolean DEFAULT false NOT NULL,
	"description" text,
	"technologies" json DEFAULT '[]'::json,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_work_experiences" (
	"id" serial PRIMARY KEY NOT NULL,
	"resume_id" integer NOT NULL,
	"company" varchar(255),
	"position" varchar(255),
	"start_date" varchar(50),
	"end_date" varchar(50),
	"current" boolean DEFAULT false NOT NULL,
	"responsibilities" json DEFAULT '[]'::json,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"full_name" varchar(255),
	"preferred_name" varchar(255),
	"phone" varchar(50),
	"email" varchar(255),
	"location" varchar(255),
	"linkedin" varchar(255),
	"github" varchar(255),
	"summary" text,
	"key_skills" json DEFAULT '[]'::json,
	"additional_info" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "resume_education_resume_id_idx" ON "resume_education" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "resume_education_resume_id_order_idx" ON "resume_education" USING btree ("resume_id","order");--> statement-breakpoint
CREATE INDEX "resume_projects_resume_id_idx" ON "resume_projects" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "resume_projects_resume_id_order_idx" ON "resume_projects" USING btree ("resume_id","order");--> statement-breakpoint
CREATE INDEX "resume_work_experiences_resume_id_idx" ON "resume_work_experiences" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "resume_work_experiences_resume_id_order_idx" ON "resume_work_experiences" USING btree ("resume_id","order");--> statement-breakpoint
CREATE INDEX "resumes_user_id_idx" ON "resumes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resumes_user_id_created_at_idx" ON "resumes" USING btree ("user_id","created_at");