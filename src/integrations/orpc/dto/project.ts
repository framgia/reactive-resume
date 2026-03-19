import { createSelectSchema } from "drizzle-zod";
import z from "zod";
import { schema } from "@/integrations/drizzle";

const projectSchema = createSelectSchema(schema.project, {
	id: z.string().describe("The ID of the project."),
	name: z.string().min(1).describe("The name of the project."),
	description: z.string().nullable().describe("Project description."),
	createdAt: z.date().describe("When the project was created."),
	updatedAt: z.date().describe("When the project was last updated."),
	deletedAt: z.date().nullable().describe("When the project was soft-deleted."),
	customerId: z.uuid().nullable().describe("The ID of the customer linked to the project."),
});

const projectListItemSchema = projectSchema.extend({
	customerName: z.string().nullable().describe("The name of the customer linked to the project."),
	domainNames: z.string().describe("Comma-separated domain names linked to the project."),
});

export const projectDto = {
	list: {
		input: z
			.object({
				sort: z.enum(["lastUpdatedAt", "createdAt", "name"]).optional().default("lastUpdatedAt"),
				name: z.string().optional(),
				customerId: z.uuid().optional(),
				domainIds: z
					.array(z.string())
					.optional()
					.describe("Filter by domain IDs; only projects linked to at least one of these domains."),
				skillIds: z
					.array(z.string())
					.optional()
					.describe("Filter by skill IDs; only projects linked to at least one of these skills."),
				positionId: z
					.string()
					.optional()
					.describe("Filter by position ID; only projects linked to this position."),
				query: z.string().optional().describe("Search by project name or customer name (partial match)."),
				limit: z
					.number()
					.int()
					.min(1)
					.max(100)
					.optional()
					.describe("Max number of projects to return (for select/search UX)."),
				page: z.number().int().min(1).optional().default(1).describe("Page number for pagination (1-based)."),
				pageSize: z.number().int().min(1).max(100).optional().default(10).describe("Number of items per page."),
			})
			.optional()
			.default({ sort: "lastUpdatedAt", page: 1, pageSize: 10 }),

		output: z.object({
			items: z.array(projectListItemSchema).describe("Projects for the current page."),
			total: z.number().int().min(0).describe("Total number of projects matching the filter."),
		}),
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
		input: projectSchema
			.pick({
				name: true,
				description: true,
				customerId: true,
			})
			.extend({
				description: z.string().optional().describe("Optional project description."),
				customerId: z.uuid().optional().describe("Optional customer ID linked to the project."),
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
				customerId: true,
			})
			.partial()
			.extend({
				id: z.uuid().describe("The ID of the project to update."),
				description: z.string().optional().describe("Optional project description."),
				customerId: z.uuid().optional().describe("Optional customer ID linked to the project."),
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
