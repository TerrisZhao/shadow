-- Make sentences.chinese_text nullable
ALTER TABLE "sentences"
  ALTER COLUMN "chinese_text" DROP NOT NULL;


