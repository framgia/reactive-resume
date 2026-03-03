import z from "zod";

export const skillDto = {
	list: {
		input: z
			.object({
				query: z.string().optional().describe("Filter skill highlights by name (partial, case-insensitive)."),
				limit: z.number().int().min(1).max(50).optional().default(20).describe("Max results for autocomplete."),
			})
			.optional()
			.default({ limit: 20 }),
		output: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })).describe("Skill highlights matching the filter."),
	},
};
