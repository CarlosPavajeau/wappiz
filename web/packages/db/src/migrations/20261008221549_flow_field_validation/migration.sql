CREATE TYPE "flow_field_type" AS ENUM('text', 'email', 'document', 'number', 'date', 'phone');--> statement-breakpoint
ALTER TABLE "tenant_flow_fields" ADD COLUMN "field_type" "flow_field_type" DEFAULT 'text'::"flow_field_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_flow_fields" ADD COLUMN "min_length" smallint;--> statement-breakpoint
ALTER TABLE "tenant_flow_fields" ADD COLUMN "max_length" smallint;--> statement-breakpoint
ALTER TABLE "tenant_flow_fields" ADD COLUMN "min_value" integer;--> statement-breakpoint
ALTER TABLE "tenant_flow_fields" ADD COLUMN "max_value" integer;--> statement-breakpoint
-- Existing fields were free text with no limit; they become text fields capped
-- at 500 characters so the bot keeps accepting what it accepted before. Older
-- answers and questions are trimmed to the new limits so the checks can be
-- added without rejecting historical rows.
UPDATE "tenant_flow_fields" SET "min_length" = 0, "max_length" = 500 WHERE "field_type" = 'text';--> statement-breakpoint
UPDATE "tenant_flow_fields" SET "question" = left("question", 500) WHERE char_length("question") > 500;--> statement-breakpoint
UPDATE "appointment_field_responses" SET "response" = left("response", 1000) WHERE char_length("response") > 1000;--> statement-breakpoint
-- Sessions open at deploy time may hold an answer captured before the limit;
-- confirming would then violate the check and roll back the booking. They
-- live at most 30 minutes, so dropping them only makes those customers start
-- over with their next message.
DELETE FROM "conversation_sessions" WHERE EXISTS (SELECT 1 FROM jsonb_each_text(CASE WHEN jsonb_typeof("data"->'flow_field_answers') = 'object' THEN "data"->'flow_field_answers' ELSE '{}'::jsonb END) AS "answer" WHERE char_length("answer"."value") > 1000);--> statement-breakpoint
ALTER TABLE "appointment_field_responses" ADD CONSTRAINT "appointment_field_responses_length_check" CHECK (char_length(response) <= 1000);--> statement-breakpoint
ALTER TABLE "tenant_flow_fields" ADD CONSTRAINT "tenant_flow_fields_question_length_check" CHECK (char_length(question) BETWEEN 2 AND 500);--> statement-breakpoint
ALTER TABLE "tenant_flow_fields" ADD CONSTRAINT "tenant_flow_fields_text_length_check" CHECK (field_type <> 'text' OR (min_length IS NOT NULL AND max_length IS NOT NULL AND min_length >= 0 AND min_length <= max_length AND max_length BETWEEN 1 AND 1000));--> statement-breakpoint
ALTER TABLE "tenant_flow_fields" ADD CONSTRAINT "tenant_flow_fields_length_only_text_check" CHECK (field_type = 'text' OR (min_length IS NULL AND max_length IS NULL));--> statement-breakpoint
ALTER TABLE "tenant_flow_fields" ADD CONSTRAINT "tenant_flow_fields_value_only_number_check" CHECK (field_type = 'number' OR (min_value IS NULL AND max_value IS NULL));--> statement-breakpoint
ALTER TABLE "tenant_flow_fields" ADD CONSTRAINT "tenant_flow_fields_value_range_check" CHECK (min_value IS NULL OR max_value IS NULL OR min_value <= max_value);