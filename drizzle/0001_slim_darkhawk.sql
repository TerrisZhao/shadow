CREATE TABLE "sentence_tags" (
	"sentence_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sentence_tags_sentence_id_tag_id_pk" PRIMARY KEY("sentence_id","tag_id")
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
CREATE INDEX "sentence_tags_sentence_id_idx" ON "sentence_tags" USING btree ("sentence_id");--> statement-breakpoint
CREATE INDEX "sentence_tags_tag_id_idx" ON "sentence_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_preset_name_idx" ON "tags" USING btree ("name") WHERE "tags"."is_preset" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_name_idx" ON "tags" USING btree ("user_id","name") WHERE "tags"."is_preset" = false;--> statement-breakpoint
CREATE INDEX "tags_user_id_idx" ON "tags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tags_is_preset_idx" ON "tags" USING btree ("is_preset");