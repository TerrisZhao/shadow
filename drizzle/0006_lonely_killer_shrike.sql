CREATE TABLE "login_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
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
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;