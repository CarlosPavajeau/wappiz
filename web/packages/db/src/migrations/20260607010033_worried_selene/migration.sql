ALTER TABLE "domain_events" ADD COLUMN "claimed_at" timestamp with time zone;--> statement-breakpoint
DROP INDEX "idx_domain_events_pending";--> statement-breakpoint
CREATE INDEX "idx_domain_events_pending" ON "domain_events" ("attempts","created_at") WHERE (processed_at IS NULL AND failed_at IS NULL AND claimed_at IS NULL);