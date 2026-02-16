CREATE TABLE "practice_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"sentence_id" integer NOT NULL,
	"practiced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "practice_logs_user_id_idx" ON "practice_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "practice_logs_sentence_id_idx" ON "practice_logs" USING btree ("sentence_id");--> statement-breakpoint
CREATE INDEX "practice_logs_user_sentence_idx" ON "practice_logs" USING btree ("user_id","sentence_id");