CREATE TABLE "users" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email" text NOT NULL CONSTRAINT "users_email_unique" UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"id" text PRIMARY KEY,
	"image" text,
	"name" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ban_expires" timestamp(6) with time zone,
	"ban_reason" text,
	"banned" boolean,
	"role" text
);

