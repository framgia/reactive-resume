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
			description: "Returns skills, optionally filtered by name.",
			successDescription: "List of skills.",
		})
		.input(skillDto.list.input.optional().default({ sort: "name" }))
		.output(skillDto.list.output)
		.handler(async ({ input }) => skillService.list(input)),

	create: protectedProcedure
		.route({
			method: "POST",
			path: "/skills",
			tags: ["Skills"],
			operationId: "createSkill",
			summary: "Create a skill",
			successDescription: "The ID of the created skill.",
		})
		.input(skillDto.create.input)
		.output(skillDto.create.output)
		.errors({
			SKILL_SLUG_ALREADY_EXISTS: {
				message: "A skill with this name already exists.",
				status: 400,
			},
		})
		.handler(async ({ input }) => skillService.create(input)),

	update: protectedProcedure
		.route({
			method: "PUT",
			path: "/skills/{id}",
			tags: ["Skills"],
			operationId: "updateSkill",
			summary: "Update a skill",
			successDescription: "The updated skill.",
		})
		.input(skillDto.update.input)
		.output(skillDto.update.output)
		.errors({
			SKILL_SLUG_ALREADY_EXISTS: {
				message: "A skill with this name already exists.",
				status: 400,
			},
		})
		.handler(async ({ input }) => skillService.update(input)),

	delete: protectedProcedure
		.route({
			method: "DELETE",
			path: "/skills/{id}",
			tags: ["Skills"],
			operationId: "deleteSkill",
			summary: "Delete a skill",
			successDescription: "The skill was deleted.",
		})
		.input(skillDto.delete.input)
		.output(skillDto.delete.output)
		.handler(async ({ input }) => skillService.delete(input)),
};
