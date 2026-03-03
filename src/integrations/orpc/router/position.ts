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
			description: "Returns positions, optionally filtered by name for autocomplete when typing.",
			successDescription: "List of positions (id, name).",
		})
		.input(positionDto.list.input.optional().default({ limit: 20 }))
		.output(positionDto.list.output)
		.handler(async ({ input }) => positionService.list(input)),
};
