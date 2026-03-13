import z from "zod";

export const skillDto = {
	list: {
		input: z
			.object({
				query: z.string().optional().describe("Filter skill highlights by name (partial, case-insensitive)."),
				sort: z.enum(["createdAt", "name"]).optional().default("name"),
				limit: z.number().int().min(1).max(200).optional().describe("Max results (non-paginated select/search)."),
				page: z
					.number()
					.int()
					.min(1)
					.optional()
					.default(1)
					.describe("Page number for pagination (1-based). Ignored when limit is provided without page/pageSize."),
				pageSize: z
					.number()
					.int()
					.min(1)
					.max(200)
					.optional()
					.default(10)
					.describe("Number of items per page. Ignored when limit is provided without page/pageSize."),
			})
			.optional()
			.default({ sort: "name", page: 1, pageSize: 10 }),
		output: z.object({
			items: z.array(
				z.object({
					id: z.string(),
					name: z.string(),
					slug: z.string(),
					createdAt: z.date(),
				}),
			),
			total: z.number().int().min(0).describe("Total number of skills matching the filter."),
		}),
	},

	create: {
		input: z.object({
			name: z.string().min(1),
		}),
		output: z.string().describe("The ID of the created skill."),
	},

	update: {
		input: z.object({
			id: z.string(),
			name: z.string().min(1),
		}),
		output: z.object({
			id: z.string(),
			name: z.string(),
			slug: z.string(),
			createdAt: z.date(),
		}),
	},

	delete: {
		input: z.object({ id: z.string() }),
		output: z.void(),
	},
};
