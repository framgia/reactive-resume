import { createSelectSchema } from "drizzle-zod";
import z from "zod";
import { schema } from "@/integrations/drizzle";

const domainSchema = createSelectSchema(schema.domain, {
	id: z.string().describe("The ID of the domain."),
	name: z.string().min(1).describe("The name of the domain."),
	createdAt: z.date().describe("When the domain was created."),
	updatedAt: z.date().describe("When the domain was last updated."),
});

export const domainDto = {
	list: {
		input: z
			.object({
				query: z.string().optional().describe("Search by domain name (partial match)."),
				limit: z.number().int().min(1).max(200).optional(),
			})
			.optional()
			.default({}),
		output: z.array(domainSchema),
	},

	getById: {
		input: domainSchema.pick({ id: true }),
		output: domainSchema,
	},

	create: {
		input: z.object({
			name: z.string().min(1),
		}),
		output: z.string().describe("The ID of the created domain."),
	},

	update: {
		input: domainSchema.pick({ id: true, name: true }),
		output: domainSchema,
	},

	delete: {
		input: domainSchema.pick({ id: true }),
		output: z.void(),
	},
};
