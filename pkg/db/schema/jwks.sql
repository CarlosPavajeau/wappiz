CREATE TABLE "jwks" (
	"alg" text,
	"created_at" timestamp(6) with time zone NOT NULL,
	"crv" text,
	"expires_at" timestamp(6) with time zone,
	"id" text PRIMARY KEY,
	"private_key" text NOT NULL,
	"public_key" text NOT NULL
);

