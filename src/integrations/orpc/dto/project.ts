import { createSelectSchema } from "drizzle-zod";
import z from "zod";
import { schema } from "@/integrations/drizzle";

const projectSchema = createSelectSchema(schema.project, {
	id: z.string().describe("The ID of the project."),
	name: z.string().min(1).describe("The name of the project."),
	description: z.string().nullable().describe("Project description."),
	customerName: z.string().nullable().describe("Customer or client name."),
	createdAt: z.date().describe("When the project was created."),
	updatedAt: z.date().describe("When the project was last updated."),
	deletedAt: z.date().nullable().describe("When the project was soft-deleted."),
});

export const projectDto = {
	list: {
		input: z
			.object({
				sort: z.enum(["lastUpdatedAt", "createdAt", "name"]).optional().default("lastUpdatedAt"),
				name: z.string().optional(),
				customerName: z.string().optional(),
				domainIds: z
					.array(z.string())
					.optional()
					.describe("Filter by domain IDs; only projects linked to at least one of these domains."),
				skillIds: z
					.array(z.string())
					.optional()
					.describe("Filter by skill IDs; only projects linked to at least one of these skills."),
				positionIds: z
					.array(z.string())
					.optional()
					.describe("Filter by position IDs; only projects linked to at least one of these positions."),
				query: z.string().optional().describe("Search by project name or customer name (partial match)."),
				limit: z
					.number()
					.int()
					.min(1)
					.max(100)
					.optional()
					.describe("Max number of projects to return (for select/search UX)."),
			})
			.optional()
			.default({ sort: "lastUpdatedAt" }),

		output: z.array(
			projectSchema.extend({
				skills: z.array(z.string()).describe("Skill names associated with the project."),
				position: z.array(z.string()).describe("Position names associated with the project."),
				domainNames: z.string().describe("Comma-separated domain names linked to the project."),
			}),
		),
	},

	getById: {
		input: projectSchema.pick({ id: true }),
		output: projectSchema.omit({ deletedAt: true }).extend({
			skills: z
				.array(z.object({ id: z.string(), name: z.string() }))
				.describe("Skills associated with the project (id + name for selects)."),
			position: z
				.array(z.object({ id: z.string(), name: z.string() }))
				.describe("Positions associated with the project (id + name for selects)."),
			domainIds: z.array(z.string()).describe("IDs of domains linked to this project."),
		}),
	},

	getDomains: {
		input: projectSchema.pick({ id: true }),
		output: z.array(z.string()).describe("IDs of domains linked to this project."),
	},

	setDomains: {
		input: projectSchema.pick({ id: true }).extend({
			domainIds: z.array(z.string()).describe("Domain IDs to link to the project (replaces existing)."),
		}),
		output: z.void(),
	},

	create: {
		input: z.object({
			name: z.string().min(1),
			description: z.string().optional(),
			customerName: z.string().optional(),
			skills: z.array(z.string()).optional().default([]),
			position: z.array(z.string()).optional().default([]),
			domainIds: z.array(z.string()).optional(),
		}),
		output: z.string().describe("The ID of the created project."),
	},

	update: {
		input: projectSchema
			.pick({
				name: true,
				description: true,
				customerName: true,
			})
			.partial()
			.extend({
				id: z.string(),
				skills: z.array(z.string()).optional().describe("If provided, replaces project skills (names; upsert)."),
				position: z.array(z.string()).optional().describe("If provided, replaces project positions (names; upsert)."),
				domainIds: z.array(z.string()).optional().describe("If provided, replaces project domains."),
			}),
		output: projectSchema.omit({ deletedAt: true }).extend({
			skills: z.array(z.string()).describe("Skill names associated with the project."),
			position: z.array(z.string()).describe("Position names associated with the project."),
		}),
	},

	delete: {
		input: projectSchema.pick({ id: true }),
		output: z.void(),
	},

	restore: {
		input: projectSchema.pick({ id: true }),
		output: z.void(),
	},
};
