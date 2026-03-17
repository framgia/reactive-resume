ALTER TABLE "position" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "skill" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();