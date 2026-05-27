CREATE TABLE "jwks" (
	"created_at" timestamp(6) with time zone NOT NULL,
	"expires_at" timestamp(6) with time zone,
	"id" text PRIMARY KEY,
	"private_key" text NOT NULL,
	"public_key" text NOT NULL
);

