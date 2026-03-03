CREATE TABLE "domain" (
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "position" (
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"description" text,
	"customer_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project_domain" (
	"project_id" uuid,
	"domain_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_domain_pkey" PRIMARY KEY("project_id","domain_id")
);
--> statement-breakpoint
CREATE TABLE "project_position" (
	"project_id" uuid,
	"position_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_position_pkey" PRIMARY KEY("project_id","position_id")
);
--> statement-breakpoint
CREATE TABLE "project_skill" (
	"project_id" uuid,
	"skill_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_skill_pkey" PRIMARY KEY("project_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "resume_skill" (
	"resume_id" uuid,
	"skill_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resume_skill_pkey" PRIMARY KEY("resume_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "skill" (
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resume" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "resume" ADD COLUMN "position_id" uuid;--> statement-breakpoint
ALTER TABLE "resume" ADD COLUMN "shared_copy_from_id" uuid;--> statement-breakpoint
CREATE INDEX "domain_name_index" ON "domain" ("name");--> statement-breakpoint
CREATE INDEX "project_created_at_index" ON "project" ("created_at");--> statement-breakpoint
CREATE INDEX "project_deleted_at_index" ON "project" ("deleted_at");--> statement-breakpoint
CREATE INDEX "project_domain_project_id_index" ON "project_domain" ("project_id");--> statement-breakpoint
CREATE INDEX "project_domain_domain_id_index" ON "project_domain" ("domain_id");--> statement-breakpoint
CREATE INDEX "project_position_project_id_index" ON "project_position" ("project_id");--> statement-breakpoint
CREATE INDEX "project_position_position_id_index" ON "project_position" ("position_id");--> statement-breakpoint
CREATE INDEX "project_skill_project_id_index" ON "project_skill" ("project_id");--> statement-breakpoint
CREATE INDEX "project_skill_skill_id_index" ON "project_skill" ("skill_id");--> statement-breakpoint
CREATE INDEX "resume_project_id_index" ON "resume" ("project_id");--> statement-breakpoint
CREATE INDEX "resume_shared_copy_from_id_index" ON "resume" ("shared_copy_from_id");--> statement-breakpoint
CREATE INDEX "resume_skill_resume_id_index" ON "resume_skill" ("resume_id");--> statement-breakpoint
CREATE INDEX "resume_skill_skill_id_index" ON "resume_skill" ("skill_id");--> statement-breakpoint
ALTER TABLE "project_domain" ADD CONSTRAINT "project_domain_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project_domain" ADD CONSTRAINT "project_domain_domain_id_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domain"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project_position" ADD CONSTRAINT "project_position_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project_position" ADD CONSTRAINT "project_position_position_id_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "position"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project_skill" ADD CONSTRAINT "project_skill_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project_skill" ADD CONSTRAINT "project_skill_skill_id_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skill"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resume" ADD CONSTRAINT "resume_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "resume" ADD CONSTRAINT "resume_position_id_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "position"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "resume" ADD CONSTRAINT "resume_shared_copy_from_id_resume_id_fkey" FOREIGN KEY ("shared_copy_from_id") REFERENCES "resume"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "resume_skill" ADD CONSTRAINT "resume_skill_resume_id_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resume"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resume_skill" ADD CONSTRAINT "resume_skill_skill_id_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skill"("id") ON DELETE CASCADE;