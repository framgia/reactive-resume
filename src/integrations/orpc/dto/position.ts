import z from "zod";

export const positionDto = {
	list: {
		input: z
			.object({
				query: z.string().optional().describe("Filter positions by name (partial, case-insensitive)."),
				sort: z.enum(["createdAt", "name"]).optional().default("name"),
				limit: z.number().int().min(1).max(200).optional().describe("Max results."),
			})
			.optional()
			.default({ sort: "name" }),
		output: z.array(
			z.object({
				id: z.string(),
				name: z.string(),
				slug: z.string(),
				createdAt: z.date(),
			}),
		),
	},

	create: {
		input: z.object({
			name: z.string().min(1),
		}),
		output: z.string().describe("The ID of the created position."),
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
