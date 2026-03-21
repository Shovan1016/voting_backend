ALTER TABLE "polls" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "votes" DROP COLUMN "closed_at";