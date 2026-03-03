import z from "zod";
import { protectedProcedure } from "../context";
import { type ListUsersItem, userService } from "../services/user";

export const userRouter = {
	list: protectedProcedure
		.route({
			method: "GET",
			path: "/users",
			tags: ["Users"],
			operationId: "listUsers",
			summary: "List users for sharing",
			description:
				"Returns users (id, name, username) excluding the authenticated user. Supports optional search by name/username and limit for large instances.",
			successDescription: "List of users.",
		})
		.input(
			z
				.object({
					search: z.string().optional(),
					limit: z.number().int().min(1).max(100).optional(),
				})
				.optional(),
		)
		.output(z.array(z.object({ id: z.string(), name: z.string(), username: z.string() })))
		.handler(async ({ context, input }): Promise<ListUsersItem[]> => {
			return await userService.list({
				excludeUserId: context.user.id,
				search: input?.search,
				limit: input?.limit,
			});
		}),
};
