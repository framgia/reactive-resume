import { protectedProcedure } from "../context";
import { skillDto } from "../dto/skill";
import { skillService } from "../services/skill";

export const skillRouter = {
	list: protectedProcedure
		.route({
			method: "GET",
			path: "/skills",
			tags: ["Skills"],
			operationId: "listSkills",
			summary: "List skills (with optional filter)",
			description: "Returns skills, optionally filtered by name for autocomplete when typing.",
			successDescription: "List of skills (id, name, slug).",
		})
		.input(skillDto.list.input.optional().default({ limit: 20 }))
		.output(skillDto.list.output)
		.handler(async ({ input }) => skillService.list(input)),
};
