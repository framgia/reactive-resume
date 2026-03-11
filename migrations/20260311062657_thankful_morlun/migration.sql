DROP INDEX "domain_name_index";--> statement-breakpoint
ALTER TABLE "domain" ADD CONSTRAINT "domain_name_key" UNIQUE("name");
