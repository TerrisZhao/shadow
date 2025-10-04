CREATE TABLE "recordings" (
	"id" serial PRIMARY KEY NOT NULL,
	"sentence_id" serial NOT NULL,
	"user_id" serial NOT NULL,
	"audio_url" text NOT NULL,
	"duration" varchar(20),
	"file_size" varchar(20),
	"mime_type" varchar(50) DEFAULT 'audio/webm',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_sentence_id_sentences_id_fk" FOREIGN KEY ("sentence_id") REFERENCES "public"."sentences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;