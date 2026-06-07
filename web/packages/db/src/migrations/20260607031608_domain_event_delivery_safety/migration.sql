CREATE TABLE "domain_event_handler_completions" (
	"event_id" uuid,
	"handler_id" varchar(200),
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domain_event_handler_completions_pkey" PRIMARY KEY("event_id","handler_id")
);
--> statement-breakpoint
ALTER TABLE "domain_events" ADD COLUMN "claim_id" uuid;--> statement-breakpoint
ALTER TABLE "domain_event_handler_completions" ADD CONSTRAINT "domain_event_handler_completions_event_id_domain_events_id_fkey" FOREIGN KEY ("event_id") REFERENCES "domain_events"("id") ON DELETE CASCADE;