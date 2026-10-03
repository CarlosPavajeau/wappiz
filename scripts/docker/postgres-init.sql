-- Runs once, when the local Postgres volume is first created.
-- The appointment overlap indexes use GiST over uuid columns, which needs
-- btree_gist; production has it installed outside the Drizzle migrations.
CREATE EXTENSION IF NOT EXISTS btree_gist;
