import { and, asc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { schema } from "@/integrations/drizzle";
import { db } from "@/integrations/drizzle/client";

export type ListUsersItem = { id: string; name: string; username: string };

const MAX_LIST_USERS_LIMIT = 100;

export const userService = {
	getName: async (userId: string): Promise<string | null> => {
		const [row] = await db
			.select({ name: schema.user.name })
			.from(schema.user)
			.where(eq(schema.user.id, userId))
			.limit(1);
		return row?.name ?? null;
	},

	getUsername: async (userId: string): Promise<string | null> => {
		const [row] = await db
			.select({ username: schema.user.username })
			.from(schema.user)
			.where(eq(schema.user.id, userId))
			.limit(1);
		return row?.username ?? null;
	},

	list: async (input: { excludeUserId: string; search?: string; limit?: number }): Promise<ListUsersItem[]> => {
		const limit = Math.min(input.limit ?? 50, MAX_LIST_USERS_LIMIT);
		const searchTerm = input.search?.trim();
		const baseCondition = ne(schema.user.id, input.excludeUserId);
		const whereCondition = searchTerm
			? and(
					baseCondition,
					or(ilike(schema.user.name, `%${searchTerm}%`), ilike(schema.user.username, `%${searchTerm}%`)) ?? sql`false`,
				)
			: baseCondition;
		const rows = await db
			.select({
				id: schema.user.id,
				name: schema.user.name,
				username: schema.user.username,
			})
			.from(schema.user)
			.where(whereCondition)
			.orderBy(asc(schema.user.name))
			.limit(limit);

		return rows;
	},
};
