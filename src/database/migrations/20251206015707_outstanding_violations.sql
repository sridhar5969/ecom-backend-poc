ALTER TYPE "public"."transaction_type" ADD VALUE 'payment';--> statement-breakpoint
ALTER TABLE "brands" ALTER COLUMN "attributes" SET DEFAULT '{}'::jsonb;