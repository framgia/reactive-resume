import { protectedProcedure } from "../context";
import { positionDto } from "../dto/position";
import { positionService } from "../services/position";

export const positionRouter = {
	list: protectedProcedure
		.route({
			method: "GET",
			path: "/positions",
			tags: ["Positions"],
			operationId: "listPositions",
			summary: "List positions (with optional filter)",
			description: "Returns positions, optionally filtered by name.",
			successDescription: "List of positions.",
		})
		.input(positionDto.list.input.optional().default({ sort: "name" }))
		.output(positionDto.list.output)
		.handler(async ({ input }) => positionService.list(input)),

	create: protectedProcedure
		.route({
			method: "POST",
			path: "/positions",
			tags: ["Positions"],
			operationId: "createPosition",
			summary: "Create a position",
			successDescription: "The ID of the created position.",
		})
		.input(positionDto.create.input)
		.output(positionDto.create.output)
		.errors({
			POSITION_SLUG_ALREADY_EXISTS: {
				message: "A position with this name already exists.",
				status: 400,
			},
		})
		.handler(async ({ input }) => positionService.create(input)),

	update: protectedProcedure
		.route({
			method: "PUT",
			path: "/positions/{id}",
			tags: ["Positions"],
			operationId: "updatePosition",
			summary: "Update a position",
			successDescription: "The updated position.",
		})
		.input(positionDto.update.input)
		.output(positionDto.update.output)
		.errors({
			POSITION_SLUG_ALREADY_EXISTS: {
				message: "A position with this name already exists.",
				status: 400,
			},
		})
		.handler(async ({ input }) => positionService.update(input)),

	delete: protectedProcedure
		.route({
			method: "DELETE",
			path: "/positions/{id}",
			tags: ["Positions"],
			operationId: "deletePosition",
			summary: "Delete a position",
			successDescription: "The position was deleted.",
		})
		.input(positionDto.delete.input)
		.output(positionDto.delete.output)
		.handler(async ({ input }) => positionService.delete(input)),
};
