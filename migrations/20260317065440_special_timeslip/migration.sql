CREATE TABLE "customer" (
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "customer_domain" (
	"customer_id" uuid,
	"domain_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_domain_pkey" PRIMARY KEY("customer_id","domain_id")
);
--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "customer_id" uuid;--> statement-breakpoint
ALTER TABLE "project" DROP COLUMN "customer_name";--> statement-breakpoint
CREATE INDEX "customer_domain_customer_id_index" ON "customer_domain" ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_domain_domain_id_index" ON "customer_domain" ("domain_id");--> statement-breakpoint
CREATE INDEX "project_customer_id_index" ON "project" ("customer_id");--> statement-breakpoint
ALTER TABLE "customer_domain" ADD CONSTRAINT "customer_domain_customer_id_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "customer_domain" ADD CONSTRAINT "customer_domain_domain_id_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domain"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_customer_id_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE SET NULL;